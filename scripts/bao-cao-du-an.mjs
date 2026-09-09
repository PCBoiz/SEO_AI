#!/usr/bin/env node
/**
 * Sinh báo cáo trạng thái hai dự án bằng SỐ ĐO THẬT.
 *
 * Chạy:  npm run bao-cao
 *        npm run bao-cao -- --khong-mang     (bỏ qua phần đo trang thật)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN BỘ NÀY
 *
 * Ngày 09/09/2026 chủ dự án nhận một bản báo cáo viết tay. Bốn số liệu trong đó
 * đã sai tại thời điểm nhận:
 *
 *   · "llms.txt — chưa làm"      → thật ra đang chạy, 11.010 byte, HTTP 200
 *   · "robots.txt — chưa xác nhận" → đang chạy, 628 byte
 *   · "sitemap.xml — chưa xác nhận" → đang chạy, 5.412 byte
 *   · "30 file · 122 tests"       → thật ra 34 tệp · 198 test
 *
 * Ba dòng đầu nguy hiểm hơn hai dòng cuối: chúng bảo chủ dự án đi làm lại việc
 * đã xong. Một báo cáo sai theo hướng BI QUAN vẫn tốn đúng ngần ấy thời gian.
 *
 * Bản viết tay nào rồi cũng cũ đi — vấn đề không nằm ở người viết mà ở chỗ số
 * liệu bị chép ra khỏi nơi sinh ra nó. Nên bộ này KHÔNG chép: nó đếm lại từ mã
 * nguồn và gõ cửa trang thật, mỗi lần chạy.
 *
 * ⚠️ CHỈ ĐO, KHÔNG NHẬN ĐỊNH. Không có dòng nào kiểu "nền móng vững" hay "đã
 * hoàn thiện phần lớn" — những câu đó không kiểm được, và chính chúng là thứ
 * làm một báo cáo cũ vẫn nghe đúng.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readdirSync, statSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const KHO_ANTIGRAVITY = process.cwd();
const KHO_TRANG = "D:/vinhomes_ha_long_xanh";
const KHONG_MANG = process.argv.includes("--khong-mang");

const so = (n) => n.toLocaleString("vi-VN");

/** Chạy một lệnh, trả về stdout; hỏng thì trả chuỗi rỗng thay vì ném. */
function chay(lenh, thuMuc) {
  try {
    const ra = execSync(lenh, { cwd: thuMuc, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ma: 0, ra };
  } catch (loi) {
    return { ma: loi.status ?? 1, ra: `${loi.stdout ?? ""}${loi.stderr ?? ""}` };
  }
}

/** Đếm tuyến: mỗi thư mục có `page.tsx` là một tuyến. */
function demTuyen(goc) {
  const ra = [];
  const quet = (d, tienTo) => {
    let muc;
    try {
      muc = readdirSync(d);
    } catch {
      return;
    }
    for (const ten of muc) {
      const day = join(d, ten);
      if (!statSync(day).isDirectory()) {
        if (ten === "page.tsx") ra.push(tienTo === "" ? "/" : tienTo);
        continue;
      }
      if (ten === "api") continue;
      if (ten.startsWith("(") || ten.startsWith("_")) quet(day, tienTo);
      else quet(day, `${tienTo}/${ten}`);
    }
  };
  quet(join(goc, "src", "app"), "");
  return ra.sort();
}

function demTu(html) {
  const s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  return s.split(/\s+/).filter(Boolean).length;
}

async function goCua(url) {
  try {
    const dap = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const than = await dap.text();
    // Đếm BYTE thật, không đếm ký tự: tiếng Việt có dấu chiếm 2–3 byte mỗi chữ,
    // nên `than.length` cho ra số nhỏ hơn dung lượng thật khoảng 20%.
    return { ma: dap.status, byte: Buffer.byteLength(than, "utf8"), than };
  } catch (loi) {
    return { ma: 0, byte: 0, than: "", loi: loi instanceof Error ? loi.message : String(loi) };
  }
}

async function main() {
  const dong = [];
  const p = (t = "") => dong.push(t);

  const ngay = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  p("# Báo cáo trạng thái — số đo thật");
  p();
  p(`*Sinh tự động ngày ${ngay} bằng \`npm run bao-cao\`. Mọi con số dưới đây được`);
  p("đếm lại từ mã nguồn hoặc đo trực tiếp trên trang đang chạy tại thời điểm chạy lệnh.*");
  p();
  p("*Bản này CHỈ ĐO, không nhận định. Muốn biết vì sao một con số ra như vậy thì đọc");
  p("`NHAT-KY.md` ở gốc mỗi kho.*");
  p();
  p("---");
  p();

  // ── Antigravity ──────────────────────────────────────────────────────────
  p("## Antigravity OS");
  p();

  const pkg = JSON.parse(readFileSync(join(KHO_ANTIGRAVITY, "package.json"), "utf8"));
  const registry = readFileSync(
    join(KHO_ANTIGRAVITY, "src/domain/modules/registry.ts"),
    "utf8",
  );
  // ⚠️ CHỈ ĐẾM TRONG MẢNG `registeredModuleKeys`, không đếm cả tệp.
  //
  // Bản đầu quét `\w+Module.key,` trên toàn tệp và ra 19 — vì `articlePipelineModuleKeys`
  // liệt kê lại một phần các module đó. Đếm nhiều hơn sự thật cũng là sai, và
  // sai theo hướng LẠC QUAN thì càng khó phát hiện.
  const khoiDangKy = registry.match(
    /registeredModuleKeys\s*=\s*\[([\s\S]*?)\]\s*as const/,
  );
  const soModule = khoiDangKy
    ? (khoiDangKy[1].match(/\w+Module\.key/g) ?? []).length
    : 0;
  const schema = readFileSync(join(KHO_ANTIGRAVITY, "src/lib/db/postgres-schema.ts"), "utf8");
  const soBang = (schema.match(/pgTable\(/g) ?? []).length;

  const raTest = chay("npm test", KHO_ANTIGRAVITY).ra;
  const khopTest = raTest.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/);
  const khopTep = raTest.match(/Test Files\s+(\d+)\s+passed\s+\((\d+)\)/);
  // ⚠️ ĐỌC MÃ THOÁT, ĐỪNG TÌM CHỮ "warning" TRONG ĐẦU RA.
  //
  // Bản đầu báo "CÓ CẢNH BÁO" trong khi lint hoàn toàn sạch — vì chính dòng
  // `> eslint --max-warnings=0` mà npm in ra đã chứa chữ đó. Bắt chuỗi trong
  // đầu ra của công cụ là cách đo hỏng: nó phụ thuộc vào cách công cụ tự giới
  // thiệu, chứ không phụ thuộc vào kết quả.
  const lintSach = chay("npm run lint", KHO_ANTIGRAVITY).ma === 0;

  p("| Hạng mục | Số đo | Nguồn |");
  p("|---|---|---|");
  p(`| Next.js | ${pkg.dependencies?.next ?? "?"} | \`package.json\` |`);
  p(`| Module đăng ký | ${soModule} | \`registry.ts\` → \`registeredModuleKeys\` |`);
  p(`| Bảng trong schema Postgres | ${soBang} | \`postgres-schema.ts\` → \`pgTable(\` |`);
  p(
    `| Test | ${khopTest ? `${khopTest[1]}/${khopTest[2]} đạt` : "không đọc được"}` +
      ` · ${khopTep ? `${khopTep[1]} tệp` : "?"} | \`npm test\` |`,
  );
  p(`| Lint | ${lintSach ? "0 cảnh báo" : "CÓ CẢNH BÁO"} | \`npm run lint\` |`);
  p(`| Tuyến trang | ${demTuyen(KHO_ANTIGRAVITY).length} | thư mục \`src/app\` |`);
  p();

  // ── halongxanh360 ────────────────────────────────────────────────────────
  p("## halongxanh360.vn");
  p();

  if (!existsSync(KHO_TRANG)) {
    p(`*Không tìm thấy kho tại \`${KHO_TRANG}\` — bỏ qua phần này.*`);
  } else {
    const tuyen = demTuyen(KHO_TRANG);
    const anh = readdirSync(join(KHO_TRANG, "public/images")).filter((f) => f.endsWith(".webp"));
    const camDungTep = join(KHO_TRANG, "src/data/anh-cam-dung.ts");
    const soCam = existsSync(camDungTep)
      ? (readFileSync(camDungTep, "utf8").match(/ten:\s*"/g) ?? []).length
      : 0;
    const raKiem = chay("npm run kiem", KHO_TRANG).ra;
    // ⚠️ LẤY LẦN KHỚP CUỐI, KHÔNG PHẢI LẦN ĐẦU.
    //
    // `npm run kiem` in ra đầu ra của TỪNG phép kiểm con rồi mới tới dòng tổng
    // kết. Một phép kiểm con cũng in "9/9 phép kiểm đạt" — nên bắt lần đầu là
    // báo cáo số của một phép kiểm con thay vì số của cả bộ. Đo được 9/9 trong
    // khi thật ra 10/10.
    const moiKhop = [...raKiem.matchAll(/(\d+)\/(\d+) phép kiểm đạt/g)];
    const khopKiem = moiKhop.at(-1);

    p("| Hạng mục | Số đo | Nguồn |");
    p("|---|---|---|");
    p(`| Tuyến trang | ${tuyen.length} | thư mục \`src/app\` |`);
    p(`| Ảnh trong kho | ${anh.length} | \`public/images/*.webp\` |`);
    p(`| Ảnh bị cấm dùng | ${soCam} | \`anh-cam-dung.ts\` |`);
    p(
      `| Phép kiểm | ${khopKiem ? `${khopKiem[1]}/${khopKiem[2]} đạt` : "không đọc được"} |` +
        " `npm run kiem` |",
    );
    p();

    if (!KHONG_MANG) {
      p("### Tệp cho trợ lý AI — đo trên trang đang chạy");
      p();
      p("| Tệp | HTTP | Dung lượng |");
      p("|---|---|---|");
      for (const t of ["llms.txt", "robots.txt", "sitemap.xml"]) {
        const kq = await goCua(`https://halongxanh360.vn/${t}`);
        p(`| \`/${t}\` | ${kq.ma || "không nối được"} | ${so(kq.byte)} byte |`);
      }
      p();

      p("### Số từ mỗi trang — đo trên trang đang chạy");
      p();
      p("*Trang dưới 500 từ có nguy cơ bị coi là nội dung mỏng.*");
      p();
      p("| Trang | Số từ |");
      p("|---|---|");
      const doTuyen = tuyen.filter((t) => !t.includes("["));
      const ketQua = [];
      for (const t of doTuyen) {
        const kq = await goCua(`https://halongxanh360.vn${t}`);
        if (kq.ma === 200) ketQua.push([t, demTu(kq.than)]);
      }
      ketQua.sort((a, b) => a[1] - b[1]);
      for (const [t, n] of ketQua) {
        p(`| \`${t}\` | ${so(n)}${n < 500 ? " ⚠" : ""} |`);
      }
      p();
      const mong = ketQua.filter(([, n]) => n < 500).length;
      p(`**${mong}/${ketQua.length} trang dưới 500 từ.**`);
      p();
    }
  }

  p("---");
  p();
  p("*Sinh bởi `scripts/bao-cao-du-an.mjs`. Chạy lại bất cứ lúc nào để có số mới —");
  p("đừng chép số từ bản này sang tài liệu khác, vì chép ra là bắt đầu cũ đi.*");

  const ra = "BAO-CAO-TRANG-THAI.md";
  writeFileSync(ra, dong.join("\n"), "utf8");
  console.log(`đã ghi: ${ra} (${dong.length} dòng)`);
}

main().catch((loi) => {
  console.error("HỎNG:", loi instanceof Error ? loi.message : loi);
  process.exit(1);
});
