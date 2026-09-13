import "server-only";

import type SharpKieu from "sharp";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * `sharp` CHỈ ĐƯỢC NẠP KHI THẬT SỰ XỬ LÝ ẢNH — KHÔNG Ở ĐẦU TỆP.
 *
 * Đo trên Vercel 13/09/2026 (nhật ký chủ dự án chụp): "Failed to load external
 * module sharp-…" làm 500 cả trang dự án, trang Bắt đầu và lượt gõ lịch đăng
 * mỗi 10 phút — vì tệp này được kéo vào (qua module-engine.server) ngay khi
 * dựng trang, và `import sharp` ở đầu tệp chạy `require("sharp")` lúc đó.
 * Thư viện ảnh nhị phân hỏng trên một nền tảng không được phép kéo sập những
 * màn không đụng tới ảnh. Nạp muộn thì chỉ việc thu ảnh hỏng (và được báo
 * đúng chỗ), mọi màn khác vẫn chạy.
 * ═══════════════════════════════════════════════════════════════════════════
 */
let sharpDaNap: typeof SharpKieu | null = null;
async function laySharp(): Promise<typeof SharpKieu> {
  if (!sharpDaNap) {
    // `require` THẬT qua createRequire, không phải `import("sharp")`.
    //
    // Với `import`, Turbopack (Next 16) coi sharp là gói ngoài dạng ESM: tạo
    // liên kết `.next/node_modules/sharp-<băm>` → `node_modules/sharp` rồi nạp
    // bằng `import("sharp-<băm>")`. `pino`/`better-sqlite3` cũng có liên kết
    // như thế nhưng nạp bằng `require()` và chạy tốt trên Vercel; riêng đường
    // `import()` của sharp hỏng ("Failed to load external module
    // sharp-20c6a5da84e2135f", nhật ký Vercel 13/09/2026). `require("sharp")`
    // do Node tự phân giải tới `node_modules/sharp` thật — không qua liên kết
    // băm; next.config khai `outputFileTracingIncludes` để gói hàm Vercel có đủ
    // tệp của sharp và các gói nhị phân `@img/*`.
    const { createRequire } = await import("node:module");
    const yeuCau = createRequire(import.meta.url);
    sharpDaNap = yeuCau("sharp") as typeof SharpKieu;
  }
  return sharpDaNap;
}

/**
 * Thu ảnh về cỡ web trước khi gửi sang website: cạnh dài ≤ 1600px, WebP q80.
 *
 * Ảnh gốc của chủ đầu tư 2560px / 2–5 MB; cổng nhận bài của website nhận tối
 * đa 3 MB mỗi ảnh và bài đọc trên điện thoại. 1600px là đủ cho khung 60rem
 * của trang bài ở màn 2x. Ảnh đã nhỏ hơn thì không phóng lên.
 *
 * ⚠️ Không giữ metadata: EXIF của ảnh chụp có thể mang toạ độ GPS và tên
 * thiết bị — không có lý do gì đưa lên trang công khai.
 */
export async function thuAnhChoWeb(
  bytes: Buffer,
  canhDai = 1600,
): Promise<{ bytes: Buffer; mime: "image/webp"; rong: number; cao: number }> {
  const sharp = await laySharp();
  const ra = await sharp(bytes, { failOn: "none" })
    .rotate() // theo EXIF orientation, rồi bỏ EXIF
    .resize({ width: canhDai, height: canhDai, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: ra.data, mime: "image/webp", rong: ra.info.width, cao: ra.info.height };
}
