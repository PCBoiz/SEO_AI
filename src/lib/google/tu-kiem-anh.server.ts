import "server-only";

import { thuAnhChoWeb } from "./anh-web.server";
import { boDuongDan } from "@/lib/dung-web/tu-kiem-xem-truoc";

/**
 * TỰ KIỂM BỘ XỬ LÝ ẢNH — chạy thật một lượt thu ảnh, ngay trên máy chủ đang
 * phục vụ, rồi nói đạt hay hỏng.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN — ĐÂY LÀ LỖI ĐÃ XẢY RA THẬT, KHÔNG PHẢI GIẢ ĐỊNH
 *
 * `sharp` là thư viện NHỊ PHÂN: nó tải một tệp `.node` biên dịch riêng cho
 * từng hệ điều hành. Ngày 13/09/2026 nó hỏng **riêng trên Vercel** trong khi ở
 * máy vẫn chạy ("Failed to load external module sharp-…" — nhật ký Vercel),
 * làm 500 cả trang dự án và trang Bắt đầu. Đã chữa bằng cách nạp muộn +
 * `createRequire` + khai `outputFileTracingIncludes`, nhưng **không cổng kiểm
 * nào chạm tới ba thứ đó** — y hệt trường hợp tệp CSS của Tailwind ở vòng 94.
 *
 * Nếu nó hỏng lại, triệu chứng lần này êm hơn nhiều (nạp muộn nên không sập
 * trang nữa): website dựng cho khách đơn giản là **không có ảnh nào**, và
 * không ai biết cho tới khi nhìn trang đã giao.
 *
 * Phép kiểm đi qua ĐÚNG hàm thật `thuAnhChoWeb` — cùng đường mà ảnh Drive đi.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface KetQuaTuKiemAnh {
  ok: boolean;
  mili: number;
  /** Cỡ ảnh ra, để thấy nó thật sự có thu nhỏ. */
  rong?: number;
  cao?: number;
  /** Lý do hỏng, đã bỏ đường dẫn máy chủ. */
  loi?: string;
}

/**
 * PNG 4×2 hợp lệ, nhúng thẳng vào mã.
 *
 * Cố ý KHÔNG tạo ảnh vào bằng chính `sharp`: làm thế thì khi `sharp` hỏng,
 * phép kiểm chết ở bước dựng dữ liệu vào và câu lỗi nói về chuyện khác.
 */
const PNG_4x2 =
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAACddGYaAAAAFUlEQVR4nGP8z8Dwn4GBgYkBAhhwsQF+DgMExgfXpwAAAABJRU5ErkJggg==";

export async function tuKiemAnh(): Promise<KetQuaTuKiemAnh> {
  const batDau = Date.now();
  try {
    // Cạnh dài 2px: ép `sharp` thật sự giải mã, xoay, đổi mã WebP và ghi ra —
    // đủ để chạm mọi phần nhị phân, mà vẫn xong trong vài mili giây.
    const ra = await thuAnhChoWeb(Buffer.from(PNG_4x2, "base64"), 2);
    const mili = Date.now() - batDau;
    if (ra.mime !== "image/webp" || ra.bytes.length === 0) {
      return { ok: false, mili, loi: "Thu ảnh xong nhưng không ra WebP có dữ liệu." };
    }
    return { ok: true, mili, rong: ra.rong, cao: ra.cao };
  } catch (loi) {
    return {
      ok: false,
      mili: Date.now() - batDau,
      loi: boDuongDan(loi instanceof Error ? loi.message : String(loi)),
    };
  }
}
