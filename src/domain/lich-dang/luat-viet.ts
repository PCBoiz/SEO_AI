/* ══════════════════════════════════════════════════════════════════════════
   LUẬT VIẾT BÀI cho website halongxanh360 — bản dành cho AI đọc trước khi viết

   Website có cổng chặn nội dung (`src/lib/cong-chan.ts` bên kho site): mã
   voucher, hứa voucher, "giá thấp nhất", chiết khấu "bí mật/nội bộ", danh xưng
   "nhất" không dẫn nguồn, cam kết lợi nhuận, link Google Drive, số điện thoại
   lạ. Bài chạm một luật là bị TỪ CHỐI ở cổng, không vào tới hàng chờ duyệt.

   Lượt lịch đăng đầu tiên (02:30 12/09/2026) đi trọn 7 bước rồi chết đúng ở
   đây: AI viết một câu chạm luật, bước đăng bị 403, thử lại đăng cùng bài →
   403 lần nữa → lượt dừng. Hai việc phải làm, và đều nằm ở phía VIẾT:

     1. Đưa luật vào lời nhắc TRƯỚC KHI VIẾT — dưới đây.
     2. Bị từ chối thì VIẾT LẠI kèm chính câu bị chạm, không gửi lại bài cũ.

   Giữ danh sách này KHỚP với `LUAT_CHAN` bên kho site. Site đổi luật mà bên
   này không đổi thì lượt tự động lại chết ở bước 8.
   ══════════════════════════════════════════════════════════════════════════ */

export const LUAT_VIET_BAI = [
  "── QUY TẮC BẮT BUỘC KHI VIẾT — website tự động TỪ CHỐI bài vi phạm ──",
  "1. Không hứa tài chính: không dùng “cam kết / đảm bảo / chắc chắn / nhất định” đi cùng “lợi nhuận / sinh lời / tăng giá / lãi”.",
  "2. Không xưng “nhất” (lớn nhất, đẹp nhất, đẳng cấp nhất, quy mô nhất… Việt Nam / thế giới / khu vực / miền Bắc) trừ khi dẫn được nguồn tra lại (“theo báo cáo…”, “nguồn: …”). Không có nguồn thì bỏ chữ “nhất”.",
  "3. Không viết “giá thấp nhất / rẻ nhất / tốt nhất”.",
  "4. Không nhắc chiết khấu, ưu đãi, chính sách hay giá kiểu “bí mật”, “nội bộ”, “ngầm”, “không công khai”. Không hứa chắc chắn có voucher. Không ghi mã voucher.",
  "5. Không viết bất kỳ số điện thoại nào. Không dán link Google Drive / Google Docs.",
  "6. Không bịa số liệu: giá, phần trăm, diện tích, số căn, mốc thời gian, khoảng cách, khẳng định pháp lý — chỉ dùng khi có trong bối cảnh; không có thì viết chung, không đoán.",
].join("\n");

/** Bài bị website từ chối ở cổng nội dung (không phải lỗi kỹ thuật). */
export function laTuChoiNoiDung(loi: string | null | undefined): boolean {
  return /TỪ CHỐI vì nội dung/i.test(loi ?? "");
}

/**
 * Rút các dòng vi phạm `[luat] …` từ thông báo lỗi của bước đăng.
 * Thông báo bị cắt ở 500 ký tự nên dòng cuối có thể cụt — vẫn giữ, vì mã luật
 * ở đầu dòng đã đủ để AI biết tránh gì.
 */
export function docViPham(loi: string | null | undefined): string[] {
  return (loi ?? "")
    .split(/\r?\n/)
    .map((d) => d.trim())
    .filter((d) => /^\[[a-z0-9-]+\]/i.test(d))
    .slice(0, 8);
}

/** Khối nhắc AI khi viết lại sau một lần bị từ chối. */
export function khoiSua(viPham: readonly string[]): string {
  if (viPham.length === 0) return "";
  return [
    "── LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI vì các câu dưới đây. Viết lại toàn bộ, TRÁNH HẲN các ý này (không chỉ đổi chữ): ──",
    ...viPham.map((v) => `- ${v}`),
  ].join("\n");
}
