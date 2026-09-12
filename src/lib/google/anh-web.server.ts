import "server-only";

import sharp from "sharp";

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
  const ra = await sharp(bytes, { failOn: "none" })
    .rotate() // theo EXIF orientation, rồi bỏ EXIF
    .resize({ width: canhDai, height: canhDai, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { bytes: ra.data, mime: "image/webp", rong: ra.info.width, cao: ra.info.height };
}
