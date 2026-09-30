/**
 * Bản rỗng thay cho gói `server-only` KHI CHẠY PHÉP THỬ.
 *
 * Gói thật cố tình ném lỗi khi bị nhập từ ngữ cảnh máy khách — đó là rào chắn
 * lúc DỰNG, để mã máy chủ không lọt vào gói gửi xuống trình duyệt. Nhưng
 * vitest chạy trong Node, không dựng gói nào, nên rào ấy chỉ khiến **mọi tệp
 * `*.server.ts` không kiểm được**: ba lần trong một phiên (30/09/2026) tôi
 * phải bỏ dấu `server-only` hoặc bỏ luôn ý định viết phép thử.
 *
 * Thay bằng bản rỗng CHỈ trong `vitest.config.ts`. Bản dựng thật vẫn dùng gói
 * thật, rào chắn nguyên vẹn — `next build` là nơi nó có tác dụng.
 */
export {};
