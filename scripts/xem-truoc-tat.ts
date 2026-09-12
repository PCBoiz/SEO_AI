/**
 * Tắt mọi máy chủ xem trước website còn sống.
 *
 * Chạy:  npx tsx scripts/xem-truoc-tat.ts        (liệt kê rồi tắt)
 *        npx tsx scripts/xem-truoc-tat.ts --xem  (chỉ liệt kê)
 *
 * ⚠️ VÌ SAO CẦN MỘT LỆNH RIÊNG
 *
 * Máy chủ xem trước là `next dev` của DỰ ÁN KHÁCH, đẻ ra từ tiến trình
 * Antigravity. Nếu Antigravity bị tắt cứng (Ctrl+C không kịp dọn, máy treo,
 * hoặc `next dev` của chính Antigravity nạp lại mã), tiến trình con sống tiếp
 * và giữ cổng — không cửa sổ nào để tắt, chỉ thấy máy chậm dần.
 *
 * Lệnh này chạy ở TIẾN TRÌNH KHÁC nên nó cũng là phép thử thật cho đường
 * "tắt sau khi mất bộ nhớ": nó chỉ có dấu vết trên đĩa để lần ra, đúng như
 * tuyến DELETE sau một lần nạp lại mã.
 */
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { taoMoiTruongMay } from "@/infrastructure/dung-web/moi-truong-may";

async function main(): Promise<void> {
  const goc = path.join(tmpdir(), "antigravity-dung-web");
  let thuMuc: string[];
  try {
    thuMuc = readdirSync(goc);
  } catch {
    console.log("Chưa có thư mục làm việc nào — không có gì để tắt.");
    return;
  }

  const may = taoMoiTruongMay();
  const chiXem = process.argv.includes("--xem");
  let dem = 0;
  for (const ma of thuMuc) {
    const url = may.dangXemTruoc(ma);
    if (!url) continue;
    dem += 1;
    if (chiXem) {
      console.log(`${ma}: ${url}`);
      continue;
    }
    const daTat = await may.dongXemTruoc(ma);
    console.log(`${ma}: ${url} → ${daTat ? "đã tắt" : "không tắt được"}`);
  }
  if (dem === 0) console.log("Không có máy chủ xem trước nào đang chạy.");
}

void main();
