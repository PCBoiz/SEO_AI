/**
 * Content-Security-Policy cho các TRANG của Antigravity — phần thuần, kiểm được.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CÓ, SAU KHI HOÃN HAI TUẦN
 *
 * `next.config.ts` ghi từ 18/09/2026: "Cố ý CHƯA có Content-Security-Policy:
 * Next chèn script nội tuyến, CSP đúng cách cần nonce theo từng yêu cầu — làm
 * sau, riêng một vòng, có kiểm." Đây là vòng đó.
 *
 * Antigravity giữ khoá AI của người dùng (mã hoá trong cơ sở dữ liệu) và một
 * phiên đăng nhập. CSP là lớp phòng sau: kể cả khi một đoạn chữ lạ lọt được
 * vào trang, trình duyệt vẫn không chạy nó.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BA QUYẾT ĐỊNH, ĐỀU CÓ LÝ DO ĐO ĐƯỢC
 *
 * 1. `style-src` CÓ `'unsafe-inline'`, KHÔNG có nonce.
 *    CSP chặn cả thuộc tính `style="…"`, mà kho có 53 chỗ viết `style={{…}}`
 *    trong JSX (ô cảnh báo màu, chiều cao khung xem thử…). Chính sách chặt
 *    cho style sẽ vỡ giao diện ở 53 chỗ ấy. Và phải bỏ nonce khỏi `style-src`:
 *    hễ có nonce thì trình duyệt BỎ QUA `'unsafe-inline'` — đặt cả hai là tự
 *    vô hiệu hoá điều mình vừa cho phép. Chèn style độc hại yếu hơn chèn
 *    script nhiều; đây là đổi chác có chủ đích, không phải quên.
 *
 * 2. `script-src` dùng nonce + `'strict-dynamic'` — chặt thật.
 *    Với `'strict-dynamic'`, trình duyệt BỎ QUA `'self'`: script nào không
 *    mang nonce (hoặc không do script mang nonce nạp ra) đều bị chặn. Đổi lại,
 *    trang phải dựng ĐỘNG mới có nonce. Đo trên bản dựng 30/09: 61 tuyến động,
 *    chỉ 3 tuyến tĩnh — `/` (chỉ chuyển hướng, không có script), `/robots.txt`
 *    (không phải HTML) và `/_not-found`.
 *
 * 3. Nhà phát triển cần `'unsafe-eval'` và `ws:`; bản chạy thật thì KHÔNG.
 *    React dùng `eval` khi chạy `next dev` để dựng lại vết lỗi, và HMR nối
 *    WebSocket. Tài liệu Next nói rõ bản production không cần. Nới đúng ở chế
 *    độ dev, không nới ở bản chị dùng.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface TuyChonCsp {
  nonce: string;
  /** `true` khi chạy `next dev` — nới đúng hai thứ HMR cần. */
  laDev: boolean;
  /**
   * DSN của Sentry, nếu có. Trình duyệt gửi báo lỗi thẳng tới máy chủ Sentry,
   * nên `connect-src` phải có đúng gốc ấy — suy TỪ DSN thay vì gõ cứng một
   * tên miền: không đặt DSN thì không mở thêm gốc nào.
   */
  sentryDsn?: string;
}

/** Gốc (scheme + host) của một DSN Sentry; DSN rỗng hoặc hỏng → `null`. */
export function gocSentry(dsn: string | undefined): string | null {
  if (!dsn?.trim()) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

export function dungCsp({ nonce, laDev, sentryDsn }: TuyChonCsp): string {
  const sentry = gocSentry(sentryDsn);
  const luat = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${laDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${sentry ? ` ${sentry}` : ""}${laDev ? " ws: wss:" : ""}`,
    // Khung xem thử website khách là tuyến cùng gốc; nó tự mang CSP riêng.
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Không cho trang nào nhúng Antigravity — khớp với X-Frame-Options: DENY
    // đã đặt trong next.config.ts.
    "frame-ancestors 'none'",
  ];
  // `upgrade-insecure-requests` chỉ có nghĩa ở bản chạy thật (https). Ở máy
  // thì nó biến `http://localhost` thành `https://` và làm hỏng hết.
  if (!laDev) luat.push("upgrade-insecure-requests");
  return luat.join("; ");
}
