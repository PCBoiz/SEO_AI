/**
 * Dựng website từ ĐẦU RA THẬT trong cơ sở dữ liệu, nén lại, giải nén, rồi
 * dựng bằng Next.js — đúng đường mà nút "Tải mã nguồn (.zip)" đi qua.
 *
 * Chạy:  npx tsx scripts/dung-web-tu-job-thu.ts [projectId]
 *
 * ⚠️ VÌ SAO CÓ KỊCH BẢN RIÊNG, KHI ĐÃ CÓ `dung-web-thu.ts`
 *
 * Kịch bản kia dựng từ hợp đồng viết tay trong chính tệp đó — nó chứng minh
 * bộ sinh mã đúng, nhưng KHÔNG chứng minh đoạn nối: đọc job trong cơ sở dữ
 * liệu → gộp ba đầu ra → nén → giải nén ra đúng cây tệp đó. Ba chỗ dễ sai
 * nhất nằm ở đoạn nối này (đầu ra job bị làm phẳng thành text, JSON nằm trong
 * khối ```json, tệp nén ghi sai vị trí).
 *
 * Không nhập `tu-job.server.ts` vì tệp đó khai `server-only` — nhập vào tiến
 * trình Node thường là ném lỗi ngay dòng đầu. Phần GỘP (`docHopDongTuDauRa`)
 * là hàm thuần dùng chung, nên đường đi vẫn là đường thật.
 */
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import "@/domain/modules/registry";
import { flattenModuleOutput, getModuleDefinition } from "@/domain/modules/module-definition";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteModuleJobRepository } from "@/infrastructure/modules/sqlite-module-job-repository";
import { docHopDongTuDauRa } from "@/domain/dung-web/tu-dau-ra";
import { dungCayTep, lamSlug } from "@/domain/dung-web/dung-cay-tep";
import { taoZip } from "@/lib/zip";

const WORKSPACE = process.env.WORKSPACE_ID ?? "workspace_local";

/** Đường tới bsdtar — trình giải nén đọc được ZIP. Xem ghi chú ở chỗ gọi. */
function timBsdtar(): string | null {
  const ungVien =
    process.platform === "win32"
      ? [path.join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe"), "bsdtar", "tar"]
      : ["bsdtar", "tar"];
  for (const d of ungVien) {
    try {
      if (execFileSync(d, ["--version"], { stdio: "pipe" }).toString().toLowerCase().includes("bsdtar")) return d;
    } catch {
      // thử ứng viên tiếp theo
    }
  }
  return null;
}

function demTep(goc: string): number {
  let n = 0;
  for (const muc of readdirSync(goc)) {
    const d = path.join(goc, muc);
    n += statSync(d).isDirectory() ? demTep(d) : 1;
  }
  return n;
}

async function main(): Promise<void> {
  const projectId = process.argv[2] ?? "project_local_demo";

  // Dựng thẳng bộ đọc SQLite: `module-engine.server.ts` và `lib/db` đều khai
  // `server-only`, nhập vào tiến trình Node thường là ném lỗi ngay dòng đầu.
  const adapter = new SqliteDatabaseAdapter(process.env.DATABASE_URL ?? "local.db");
  const kho = new SqliteModuleJobRepository(adapter.db);
  const jobs = await kho.listLatestSucceededByProject(WORKSPACE, projectId);
  const dauRa = new Map<string, string>();
  for (const job of jobs) {
    if (!job.output) continue;
    try {
      dauRa.set(job.moduleKey, flattenModuleOutput(getModuleDefinition(job.moduleKey), job.output));
    } catch {
      /* module cũ */
    }
  }

  const hopDong = docHopDongTuDauRa(dauRa);
  if (!hopDong) {
    console.error(`Dự án ${projectId} chưa có kiến trúc (#25). Chạy luồng "Dựng website — bản nháp" trước.`);
    process.exitCode = 1;
    return;
  }
  const kq = dungCayTep(hopDong.kienTruc, hopDong.thietKe, {
    dienThoai: "0912 345 678",
    zalo: "https://zalo.me/0912345678",
    diaChi: "https://thu-nghiem.vn",
  }, hopDong.chu);

  console.log(`Hợp đồng: ${hopDong.kienTruc.tenWebsite} · ${hopDong.kienTruc.trang.length} trang · ${kq.danhSachTep.length} tệp`);
  if (hopDong.thieu.length > 0) console.log(`Thiếu: ${hopDong.thieu.join("; ")}`);
  if (kq.boQua.length > 0) console.log(`Khối chưa có khuôn: ${kq.boQua.join(", ")}`);

  const nen = taoZip(kq.cay.tep.map((t) => ({ duongDan: t.duongDan, noiDung: t.noiDung })));
  const thuMuc = mkdtempSync(path.join(tmpdir(), "dung-web-zip-"));
  const tepZip = path.join(thuMuc, `${lamSlug(hopDong.kienTruc.tenWebsite)}.zip`);
  writeFileSync(tepZip, nen);
  console.log(`Tệp nén: ${Math.round(nen.length / 1024)} KB → ${tepZip}`);

  // TÊN TỆP THÔI, không đường dẫn tuyệt đối: bsdtar trên Windows hiểu "C:\…"
  // là tên MÁY CHỦ từ xa (cú pháp rsh cũ) và trả "Cannot connect to C".
  //
  // ⚠️ PHẢI LÀ bsdtar. Trên Windows, Git Bash đặt `tar` của GNU đứng trước
  // `C:/Windows/System32/tar.exe` trong PATH, mà GNU tar KHÔNG đọc được zip —
  // nó trả "This does not look like a tar archive", nghe y như tệp nén hỏng.
  const bsdtar = timBsdtar();
  if (!bsdtar) {
    console.error("Máy không có bsdtar — không giải nén kiểm được.");
    process.exitCode = 1;
    return;
  }
  execFileSync(bsdtar, ["-xf", path.basename(tepZip)], { cwd: thuMuc, stdio: "pipe" });
  const soTep = demTep(thuMuc) - 1; // trừ chính tệp nén
  console.log(`Giải nén: ${soTep} tệp ${soTep === kq.danhSachTep.length ? "(khớp)" : "⚠️ KHÔNG khớp"}`);

  console.log("npm install…");
  // execSync luôn chạy qua shell (npm trên Windows là tệp .cmd). Một chuỗi lệnh
  // thay vì mảng tham số kèm shell — Node 24 cảnh báo DEP0190 cho cách sau.
  execSync("npm install --no-audit --no-fund", { cwd: thuMuc, stdio: "pipe" });
  console.log("next build…");
  try {
    execFileSync(process.execPath, [path.join(thuMuc, "node_modules", "next", "dist", "bin", "next"), "build"], {
      cwd: thuMuc,
      stdio: "pipe",
    });
    console.log("ĐẠT — tệp nén tải về dựng được thành website chạy thật.");
  } catch (loi) {
    const e = loi as { stdout?: Buffer; stderr?: Buffer };
    console.error("HỎNG:\n" + (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? ""));
    process.exitCode = 1;
  }
}

void main();
