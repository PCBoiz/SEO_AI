# Dựng website cho một khách — từng bước, không cần biết lập trình

*13/09/2026 — vòng 44. Đọc một lần là làm được; lần sau chỉ cần liếc phần
"Tóm tắt". Chi tiết kỹ thuật và cách đưa lên mạng nằm ở
`docs/dua-web-khach-len-mang.md`.*

## Tóm tắt (4 việc, ~15 phút, ~4 lượt gọi AI)

1. **Tạo dự án** cho khách (một website = một dự án).
2. Ở **Bắt đầu → "Dựng một website mới"**: kể website để làm gì, cho ai; điền
   *sự thật* (giá, giờ mở, điện thoại) → **Chạy**.
3. Vào **trang của dự án → thẻ "Website dựng sẵn"**: điền số điện thoại →
   **Xem thử trên máy** (nếu Antigravity chạy trên máy chị) hoặc **Tải mã
   nguồn (.zip)**.
4. Đưa lên mạng theo `dua-web-khach-len-mang.md` (Cloudflare miễn phí, hoặc VPS).

## Bước 1 — Tạo dự án cho khách

**Website của tôi → Tạo dự án.** Điền:

| Ô | Điền gì |
|---|---|
| Tên dự án | Tên khách hoặc tên thương hiệu, ví dụ *Nha khoa Bình Minh* |
| URL website | Chưa có tên miền thì điền tên miền **dự kiến**, ví dụ `https://nhakhoabinhminh.vn` — sửa sau được |
| Địa điểm / Ngành nghề | Điền đúng — máy dùng để chọn khối và viết chữ |
| Ngôn ngữ / Giọng văn | Tiếng Việt · giọng chị muốn (điềm đạm, thân thiện…) |

Không cần điền phần WordPress.

**Có ảnh của khách?** Nối một thư mục Google Drive ở thẻ **"Ảnh từ Google
Drive"** ngay trong trang dự án (khách tải ảnh lên Drive bằng điện thoại cũng
được). Website sẽ lấy tối đa 8 tấm. Không nối thì website toàn chữ — **máy
không tự sinh ảnh**.

## Bước 2 — Cho máy dựng bản nháp

**Bắt đầu → thẻ "Dựng một website mới" → Bắt đầu dựng website.** Trang Quy
trình mở ra với luồng đã chọn sẵn. Điền:

| Ô | Điền gì |
|---|---|
| Dự án | Chọn dự án vừa tạo |
| AI xử lý | Nhà cung cấp chị đã có khoá (chưa có thì trang sẽ chỉ chỗ thêm) |
| Website này để làm gì, cho ai? | **Kể như kể với bạn.** Ví dụ: *"Phòng khám nha khoa ở Hạ Long, mở tới 22h. Khách đau răng buổi tối tìm trên điện thoại, cần xem giá, đọc hỏi đáp rồi để lại số."* |
| Sự thật của bạn | Giá, giờ mở, điện thoại, giấy phép, tên bác sĩ… **Máy chỉ được dùng con số trong ô này.** Để trống thì trang không có con số nào. |
| Tên doanh nghiệp · Tên miền dự kiến | Đã điền sẵn từ dự án |

Bấm **Chạy cả luồng (4 bước)**. Trang hiện trước "tốn ít nhất 4 lượt gọi AI".
Bốn bước chạy nối nhau, ~2–4 phút:

1. **Ý định** — máy tóm lại vấn đề, người xem là ai, KHÔNG làm gì.
2. **Kiến trúc** — chọn những trang nào, mỗi trang ghép từ khối nào (máy chỉ
   được chọn trong danh mục khối đã chạy thật, không bịa).
3. **Hệ thiết kế** — 4 màu, cặp chữ có tiếng Việt, kiểm độ dễ đọc.
4. **Viết chữ** — chữ thật cho từng khối, một lượt gọi cho mỗi trang.

Xong, thẻ xanh hiện **"Website đã dựng xong bản nháp" → Mở thẻ "Website dựng
sẵn"**.

*Muốn sửa chữ?* **Tự động hóa → "Viết chữ cho website"**, điền ô *"Muốn sửa
gì so với lần trước?"* (ví dụ *ngắn hơn, bớt khoa trương, nhấn mạnh giờ mở
cửa*) rồi Chạy — một lượt gọi cho mỗi trang. Thẻ "Website dựng sẵn" tự lấy bản
mới nhất. Muốn đổi cả trang/khối thì chạy lại luồng với mô tả rõ hơn.

## Bước 3 — Xem thử và tải về

Trong **trang dự án → thẻ "Website dựng sẵn"**:

- Thẻ liệt kê các trang, số ảnh sẽ dùng, và **dữ liệu thật còn thiếu** (máy
  ghi ra những chỗ nó không dám bịa — chị điền sau khi tải).
- Điền **số điện thoại hiện trên website** (bắt buộc — mọi nút gọi dùng số
  này) và link Zalo nếu có.
- **Xem thử trên máy** → vài phút lần đầu → nút *Mở trang xem thử*. Sửa gì
  thì bấm *Dựng lại*; xong bấm *Tắt*.
- **Tải mã nguồn (.zip)** → một thư mục Next.js đầy đủ, kèm `README.md` ghi
  cách chạy và cách đưa lên mạng. Tên, số điện thoại, Zalo, tên miền nằm ở
  **một tệp** `src/lib/thong-tin.ts` — sau này đổi số chỉ sửa một dòng. Website
  có sẵn biểu tượng tab, trang 404 tiếng Việt và thẻ chia sẻ cho Zalo/Facebook.

Nếu thẻ báo *"Tự soát bản dựng thấy N chỗ cần sửa"* — đó là lỗi của bộ dựng,
không phải của chị; vẫn tải được, gửi tôi ảnh chụp dòng đó.

## Bước 4 — Đưa lên mạng

Xem `docs/dua-web-khach-len-mang.md`. Ngắn gọn: **Cloudflare** miễn phí và
được phép dùng cho trang thương mại (tệp nén đã có sẵn cấu hình ở
`trien-khai/cloudflare/`); hoặc **VPS** đang chạy halongxanh360 (cần người kỹ
thuật ~30 phút). **Không** dùng Vercel bản miễn phí cho web khách.

Sau khi lên: bấm thử nút gọi trên điện thoại thật, gửi thử biểu mẫu một lần,
nộp `sitemap.xml` vào Google Search Console.

## Khách để lại số đi đâu?

Nếu dự án đã **lập bảng khách** (thẻ "Khách liên hệ → Google Sheets"), tệp
nén đã điền sẵn địa chỉ nhận; chị chỉ dán thêm token lúc đưa lên mạng. Khách
để lại số trên web mới sẽ vào đúng bảng Google Sheets đang dùng. Biểu mẫu có
sẵn bẫy bot và chặn gửi quá nhanh.

## Chưa làm được (đang chờ chị quyết)

- **Mục tin tức trên web khách** — để lịch đăng bài hằng ngày cũng chạy cho
  web khách. Ba cách A/B/C ở mục 21 `VIEC-CAN-LAM.md`.
- **Sơ đồ phân khu bấm chọn** (`so-do-phan-khu`) — cần dữ liệu bản đồ của
  từng dự án, chưa có khuôn dựng.
