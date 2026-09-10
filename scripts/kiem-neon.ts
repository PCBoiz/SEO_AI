/**
 * Kiểm schema trên Neon có khớp schema trong kho không — CHỈ ĐỌC.
 *
 * Chạy:  npm run kiem:neon
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN, VÀ VÌ SAO KHÔNG CHỈ HỎI "pinned_at CÓ CHƯA"
 *
 * Câu hỏi ban đầu là "migration 0004 đã áp chưa" — 0004 chỉ thêm một cột
 * `module_jobs.pinned_at`. Nhưng hỏi riêng cột đó là hỏi hẹp hơn vấn đề thật.
 *
 * `neon-module-job-repository.ts` gọi `.select()` TRẦN ở sáu chỗ. Drizzle khi
 * đó sinh SQL liệt kê MỌI cột khai trong schema. Nên thiếu BẤT KỲ cột nào —
 * không riêng `pinned_at` — là mọi lệnh đọc bảng đó đều lỗi. Một phép kiểm chỉ
 * hỏi đúng một cột sẽ báo xanh trong khi cột khác đang thiếu.
 *
 * Nên kịch bản này đọc danh sách cột từ CHÍNH schema Drizzle (không chép tay,
 * không thể lệch), rồi đối chiếu với `information_schema` của Neon.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KHÔNG IN BÍ MẬT
 *
 * Kịch bản đọc `DATABASE_URL` để kết nối nhưng KHÔNG in nó, không in host,
 * không in bất kỳ giá trị biến môi trường nào. Phần kiểm khoá trùng ở cuối chỉ
 * in TÊN khoá và số lần xuất hiện — không in giá trị. Đừng thêm log giá trị vào
 * đây; tệp này được chạy trong lúc chia sẻ màn hình.
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/lib/db/postgres-schema";

loadEnvConfig(process.cwd());

interface CotThieu {
  bang: string;
  cot: string[];
}

/**
 * Tìm URL Neon trong các biến môi trường, theo thứ tự ưu tiên.
 *
 * ⚠️ MÁY LẬP TRÌNH CHẠY SQLite, KHÔNG PHẢI NEON.
 *
 * `DATABASE_URL` ở máy này có giá trị `local.db` — một tệp SQLite. Nên nếu chỉ
 * đọc `DATABASE_URL` rồi đưa thẳng cho `neon()`, thư viện ném lỗi "not a valid
 * URL" KÈM THEO CHUỖI KẾT NỐI in ra màn hình. Hai cái sai một lúc: lời báo lỗi
 * nói về cú pháp URL trong khi chuyện thật là "biến này trỏ vào cơ sở dữ liệu
 * khác", và nó in ra thứ mà tệp này hứa không in.
 *
 * Nên phải tự lọc theo tiền tố `postgres://` TRƯỚC khi đưa cho thư viện.
 */
function timUrlNeon(): { ten: string; url: string } | { ten: string | null; url: null } {
  const ungVien = [
    "MIGRATOR_DATABASE_URL",
    "DATABASE_URL",
    "NEON_DATABASE_URL",
    "POSTGRES_URL",
  ];
  let coBienNhungSaiLoai: string | null = null;
  for (const ten of ungVien) {
    const giaTri = process.env[ten];
    if (!giaTri) continue;
    if (/^postgres(?:ql)?:\/\//i.test(giaTri)) return { ten, url: giaTri };
    coBienNhungSaiLoai ??= ten;
  }
  return { ten: coBienNhungSaiLoai, url: null };
}

async function kiemNeon(): Promise<void> {
  // Phép kiểm khoá trùng chạy TRƯỚC: nó không cần mạng, không cần kết nối, nên
  // đừng để nó phụ thuộc vào việc kết nối có thành công hay không.
  kiemKhoaTrung();
  console.log();

  const nguon = timUrlNeon();
  if (!nguon.url) {
    if (nguon.ten) {
      console.log(`⚠ Có biến \`${nguon.ten}\` nhưng nó KHÔNG trỏ vào Postgres.`);
      console.log("  Máy lập trình đang chạy SQLite (local.db). Neon là cơ sở dữ liệu");
      console.log("  của bản chạy thật, và URL của nó nằm ở biến môi trường trên Vercel.");
    } else {
      console.log("⚠ Không tìm thấy biến nào chứa URL Postgres.");
    }
    console.log("\n  Muốn kiểm Neon thì chạy kèm URL, ví dụ:");
    console.log("    MIGRATOR_DATABASE_URL=<url Neon> npm run kiem:neon");
    console.log("\n  KHÔNG kết luận gì về Neon từ đây — chưa gõ cửa được thì chưa biết.");
    process.exitCode = 1;
    return;
  }

  console.log(`Kết nối bằng biến \`${nguon.ten}\` (không in giá trị).\n`);
  const sql = neon(nguon.url);

  // Danh sách bảng + cột LẤY TỪ SCHEMA, không gõ tay.
  const bangTrongKho = new Map<string, string[]>();
  for (const value of Object.values(schema)) {
    if (!laBangDrizzle(value)) continue;
    const config = getTableConfig(value);
    bangTrongKho.set(
      config.name,
      config.columns.map((c) => c.name),
    );
  }

  // Một câu hỏi cho cả cơ sở dữ liệu, không hỏi từng bảng một.
  const rows = (await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `) as { table_name: string; column_name: string }[];

  const bangTrenNeon = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = bangTrenNeon.get(row.table_name) ?? new Set<string>();
    set.add(row.column_name);
    bangTrenNeon.set(row.table_name, set);
  }

  const bangThieuHan: string[] = [];
  const cotThieu: CotThieu[] = [];

  for (const [ten, cot] of [...bangTrongKho].sort()) {
    const thatCo = bangTrenNeon.get(ten);
    if (!thatCo) {
      bangThieuHan.push(ten);
      continue;
    }
    const thieu = cot.filter((c) => !thatCo.has(c));
    if (thieu.length > 0) cotThieu.push({ bang: ten, cot: thieu });
  }

  console.log(`Schema trong kho: ${bangTrongKho.size} bảng`);
  console.log(`Trên Neon (public): ${bangTrenNeon.size} bảng\n`);

  if (bangThieuHan.length === 0 && cotThieu.length === 0) {
    console.log("✓ Mọi bảng và mọi cột khai trong schema đều CÓ trên Neon.");
    console.log("  Nghĩa là các migration đã áp đủ — gồm cả 0004 (module_jobs.pinned_at).");
  } else {
    if (bangThieuHan.length > 0) {
      console.log(`✗ ${bangThieuHan.length} bảng khai trong schema mà Neon KHÔNG có:`);
      for (const b of bangThieuHan) console.log(`    ${b}`);
      console.log();
    }
    if (cotThieu.length > 0) {
      console.log(`✗ ${cotThieu.length} bảng thiếu cột:`);
      for (const { bang, cot } of cotThieu) {
        console.log(`    ${bang}: thiếu ${cot.join(", ")}`);
      }
      console.log();
    }
    console.log("  Chữa: npm run db:neon:migrate");
    console.log("  ⚠ Thiếu cột nào của `module_jobs` cũng làm MỌI thao tác đọc/ghi");
    console.log("    bảng đó lỗi, vì repository gọi .select() trần.");
    process.exitCode = 1;
  }

  // Bảng theo dõi migration — cho biết Neon nghĩ mình đang ở đâu.
  try {
    const daAp = (await sql`
      SELECT hash, created_at
      FROM drizzle_app.__antigravity_app_migrations
      ORDER BY created_at
    `) as { hash: string; created_at: string }[];
    console.log(`\nBảng theo dõi migration: ${daAp.length} bản đã ghi nhận.`);
  } catch {
    console.log("\n⚠ Không đọc được bảng theo dõi migration (drizzle_app).");
    console.log("  Không kết luận gì từ điều này — phần đối chiếu cột ở trên mới là câu trả lời.");
  }
}

/**
 * Đếm khoá xuất hiện nhiều lần trong `.env.local`.
 *
 * dotenv lấy giá trị CUỐI CÙNG. Một khoá hai dòng hai giá trị thì dòng trên là
 * dòng chết, và không có thông báo lỗi nào nói ra điều đó — chỉ có lệnh gọi trả
 * 401 kèm "token không khớp".
 *
 * ⚠️ CHỈ IN TÊN KHOÁ VÀ SỐ LẦN. Không in giá trị, không in một phần giá trị,
 * không in độ dài (độ dài cũng là thông tin). Nhờ vậy chạy được lúc chia sẻ màn
 * hình, và người chạy không cần tin lời hứa — đọc mã là thấy.
 */
function kiemKhoaTrung(): void {
  const tep = ".env.local";
  if (!existsSync(tep)) {
    console.log(`\n(${tep} không có ở đây — bỏ qua phép kiểm khoá trùng.)`);
    return;
  }
  const dem = new Map<string, number>();
  for (const dong of readFileSync(tep, "utf8").split(/\r?\n/)) {
    const cat = dong.trim();
    if (cat === "" || cat.startsWith("#")) continue;
    const dauBang = cat.indexOf("=");
    if (dauBang <= 0) continue;
    const khoa = cat.slice(0, dauBang).replace(/^export\s+/, "").trim();
    dem.set(khoa, (dem.get(khoa) ?? 0) + 1);
  }
  const trung = [...dem].filter(([, n]) => n > 1).sort();
  console.log(`\n${tep}: ${dem.size} khoá.`);
  if (trung.length === 0) {
    console.log("✓ Không khoá nào khai hai lần.");
    return;
  }
  console.log(`✗ ${trung.length} khoá khai nhiều lần — dotenv chỉ dùng dòng CUỐI:`);
  for (const [khoa, n] of trung) console.log(`    ${khoa} — ${n} lần`);
  console.log("  Chữa: mở tệp, xoá dòng thừa, giữ dòng có giá trị đúng.");
  process.exitCode = 1;
}

// Drizzle không xuất kiểu hộ việc này, và `instanceof` không dùng được vì bảng
// là proxy. Nhận diện bằng ký hiệu riêng mà `getTableConfig` cũng dựa vào.
function laBangDrizzle(value: unknown): value is PgTable {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getOwnPropertySymbols(value).some((s) =>
      s.description?.includes("drizzle:Name"),
    )
  );
}

void kiemNeon();
