/**
 * Chế độ hiển thị: Đơn giản hay Nâng cao.
 *
 * MẶC ĐỊNH LÀ ĐƠN GIẢN. Ai vào lần đầu cũng gặp bản dễ; muốn thấy đủ điều
 * khiển thì tự bật Nâng cao. Ngược lại — mặc định Nâng cao rồi mời người ta
 * "chuyển sang bản dễ" — là bắt người chưa biết gì phải nhận ra mình đang ở
 * nhầm chỗ, mà họ thì không có cách nào biết.
 *
 * Lưu bằng COOKIE chứ không phải `localStorage`, vì máy chủ phải đọc được nó
 * để dựng sẵn đúng giao diện. Dùng `localStorage` thì trang luôn dựng ra bản
 * Nâng cao rồi mới nháy sang bản Đơn giản sau khi JavaScript chạy — người dùng
 * thấy giao diện phức tạp lóe lên đúng một nhịp, và đó là ấn tượng đầu tiên.
 *
 * ⚠️ FILE NÀY PHẢI CHẠY ĐƯỢC Ở CẢ HAI PHÍA nên tuyệt đối không nhập
 * `next/headers` hay bất cứ thứ gì chỉ có ở máy chủ. Hàm đọc cookie nằm riêng
 * ở `che-do-don-gian.server.ts`. Gộp chung một file làm build gãy ngay, vì công
 * tắc đổi chế độ là thành phần chạy trên trình duyệt và cần hằng số ở đây.
 */
export const TEN_COOKIE = "antigravity-che-do";

export type CheDo = "don-gian" | "nang-cao";
