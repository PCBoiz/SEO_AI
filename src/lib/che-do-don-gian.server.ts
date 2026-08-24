import "server-only";
import { cookies } from "next/headers";
import { TEN_COOKIE, type CheDo } from "@/lib/che-do-don-gian";

/**
 * Đọc chế độ hiển thị từ cookie, phía MÁY CHỦ.
 *
 * Tách khỏi `che-do-don-gian.ts` vì file kia phải nhập được từ thành phần chạy
 * trên trình duyệt (công tắc đổi chế độ cần hằng số tên cookie). `next/headers`
 * chỉ tồn tại ở máy chủ, nhập nhầm vào gói trình duyệt là build gãy.
 *
 * `server-only` là chốt chặn: nếu sau này có ai lỡ nhập file này vào một thành
 * phần trình duyệt, lỗi báo ngay lúc build kèm tên file — thay vì một thông báo
 * khó hiểu về `cookies` không tồn tại.
 */
export async function layCheDo(): Promise<CheDo> {
  const kho = await cookies();
  return kho.get(TEN_COOKIE)?.value === "nang-cao" ? "nang-cao" : "don-gian";
}
