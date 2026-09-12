# Dựng website cho một khách — từng bước, không cần biết lập trình

*13/09/2026 — vòng 70. Đọc một lần là làm được; lần sau chỉ cần liếc phần
"Tóm tắt". Chi tiết kỹ thuật và cách đưa lên mạng nằm ở
`docs/dua-web-khach-len-mang.md`.*

**Ví dụ dùng trong tài liệu này** là một khách bịa ra cho dễ hình dung: *sàn
môi giới Minh Anh Land ở Hạ Long* — đúng loại khách chị hay gặp. Trong máy còn
một bộ dữ liệu thử tên *"Nha khoa Bình Minh"*: cũng là bịa, dùng để kiểm tra bộ
dựng làm được web cho ngành **ngoài** bất động sản (phòng khám, quán, cửa
hàng). Cả hai không phải khách thật, không có website thật.

## Tóm tắt (4 việc, ~15 phút, ~4 lượt gọi AI)

1. **Tạo dự án** cho khách (một website = một dự án).
2. Ở **Bắt đầu → "Dựng một website mới"**: kể website để làm gì, cho ai; điền
   *sự thật* (giá, giờ mở, điện thoại) → **Chạy**.
3. Vào **trang của dự án → thẻ "Website dựng sẵn"**: điền số điện thoại →
   **Xem thử trên máy** (nếu Antigravity chạy trên máy chị) hoặc **Tải mã
   nguồn (.zip)**.
4. **Đẩy lên GitHub** (nút trong thẻ) → Cloudflare tự dựng, không cần máy.
   Lần đầu nối kho trong Cloudflare bằng vài cú bấm (thẻ hiện đúng ba bước).

## Bước 1 — Tạo dự án cho khách

**Website của tôi → Tạo dự án.** Điền:

| Ô | Điền gì |
|---|---|
| Tên dự án | Tên khách hoặc tên thương hiệu, ví dụ *Minh Anh Land* |
| URL website | Chưa có tên miền thì điền tên miền **dự kiến**, ví dụ `https://minhanhland.vn` — sửa sau được. Bỏ trống thì thẻ web sẽ nhắc: sitemap và thẻ chia sẻ cần địa chỉ này |
| Địa điểm / thị trường | Ví dụ *Hạ Long, Quảng Ninh* — máy dùng để chọn khối và viết chữ |
| Ngành nghề | Ví dụ *môi giới bất động sản* — ngành bất động sản mở thêm các khối bảng hàng, quỹ căn, so sánh giá |
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
| AI xử lý (khoá của bạn) | Nhà cung cấp chị đã có khoá (chưa có thì trang sẽ chỉ chỗ thêm) |
| Website này để làm gì, cho ai? | **Kể như kể với bạn.** Ví dụ: *"Sàn môi giới ở Hạ Long, chuyên căn hộ và đất nền quanh Vinhomes Global Gate. Khách tìm trên điện thoại buổi tối, muốn xem bảng giá, quỹ căn còn hàng, đọc hỏi đáp pháp lý rồi để lại số để được gọi lại."* |
| Sự thật của bạn — điện thoại, giá, giờ mở, giấy tờ | Số điện thoại, giá từng dòng, giờ làm việc, địa chỉ văn phòng, số chứng chỉ hành nghề, tên người phụ trách… **Máy chỉ được dùng con số trong ô này.** Để trống thì trang không có con số nào — và không bịa. |
| Tên doanh nghiệp / thương hiệu · Tên miền dự kiến | Đã điền sẵn từ dự án |

Bấm **Chạy cả luồng (4 bước)**. Trang hiện trước "tốn ít nhất 4 lượt gọi AI".
Bốn bước chạy nối nhau, ~2–4 phút:

1. **Ý định** — máy tóm lại vấn đề, người xem là ai, KHÔNG làm gì.
2. **Kiến trúc** — chọn những trang nào, mỗi trang ghép từ khối nào (máy chỉ
   được chọn trong danh mục khối đã chạy thật, không bịa).
3. **Hệ thiết kế** — 4 màu, cặp chữ có tiếng Việt, kiểm độ dễ đọc.
4. **Viết chữ** — chữ thật cho từng khối, một lượt gọi cho mỗi trang.

Xong, thẻ xanh hiện **"Website đã dựng xong bản nháp" → Mở thẻ "Website dựng
sẵn"**.

*Một bước báo hỏng giữa chừng?* Thường là máy trả lời sai định dạng, chạy lại
là được. Bấm **"Chạy tiếp từ bước N"** ngay dưới dòng lỗi — các bước đã xong
không chạy lại, không tốn thêm lượt gọi cho chúng.

*Muốn sửa chữ?* **Tự động hóa → "Viết chữ cho website"**, điền ô *"Muốn sửa
gì so với lần trước?"* (ví dụ *ngắn hơn, bớt khoa trương, nhấn mạnh giờ làm
việc*) rồi Chạy — một lượt gọi cho mỗi trang. Thẻ "Website dựng sẵn" tự lấy bản
mới nhất. Muốn đổi cả trang/khối thì chạy lại luồng với mô tả rõ hơn.

## Bước 3 — Xem thử và tải về

Trong **trang dự án → thẻ "Website dựng sẵn"**:

- Thẻ liệt kê các trang, số ảnh sẽ dùng, và **dữ liệu thật còn thiếu** (máy
  ghi ra những chỗ nó không dám bịa — chị điền sau khi tải).
- Điền **số điện thoại hiện trên website** (bắt buộc — mọi nút gọi dùng số
  này) và link Zalo nếu có (dán số điện thoại vào ô Zalo cũng được). Thẻ nhớ
  số cho lần sau.
- Có ảnh trên Drive thì chọn **Ảnh mở đầu** — tấm khách nhìn đầu tiên. Không
  chọn thì máy lấy tấm đầu ở thư mục gốc.
- Nếu chạy lại bước *Kiến trúc* (đổi trang/khối) thì phải chạy lại *Viết chữ*;
  thẻ sẽ nhắc "bản chữ viết cho kiến trúc cũ".
- **Xem thử trên máy** → vài phút lần đầu → nút *Mở trang xem thử*. Sửa gì
  thì bấm *Dựng lại*; xong bấm *Tắt*. *(Chỉ có khi Antigravity chạy trên máy
  chị; bản trên Vercel ẩn nút này — xem bản thật bằng cách đẩy lên GitHub ở
  bước 4.)*
- **Tải mã nguồn (.zip)** → một thư mục Next.js đầy đủ, kèm `README.md` ghi
  cách chạy và cách đưa lên mạng. Tên, số điện thoại, Zalo, tên miền nằm ở
  **một tệp** `src/lib/thong-tin.ts` — sau này đổi số chỉ sửa một dòng. Website
  có sẵn biểu tượng tab, trang 404 tiếng Việt và thẻ chia sẻ cho Zalo/Facebook.
  Font chữ lưu sẵn trong website (không phải tải từ Google mỗi lần xem) nên
  trang hiện nhanh hơn trên điện thoại. Mỗi ảnh Drive được thu sẵn ba cỡ
  (1600/1200/800) và điện thoại tự lấy cỡ nhỏ — ảnh chụp thật nhẹ đi tới 2/3.
- Website **tự đếm khách liên hệ** nếu chị đặt mã Google Analytics
  (`NEXT_PUBLIC_GA_ID`, xem `docs/dua-web-khach-len-mang.md`): bấm gọi, bấm
  Zalo, gửi biểu mẫu thành công — không gửi tên hay số của khách cho Google.
  Không đặt mã thì website không nhúng gì của Google.

Nếu thẻ báo *"Tự soát bản dựng thấy N chỗ cần sửa"* — đó là lỗi của bộ dựng,
không phải của chị; vẫn tải được, gửi tôi ảnh chụp dòng đó. Thẻ báo *"Chưa có
tên miền"* thì điền URL website ở phần thông tin cuối trang dự án.

## Bước 4 — Đưa lên mạng (không cần máy)

Trong thẻ "Website dựng sẵn", khung **"Đưa lên mạng không cần máy: GitHub →
Cloudflare tự dựng"**:

1. *Một lần:* dán **token GitHub** (cách tạo ghi ngay trong khung, ~5 phút).
2. Bấm **Đẩy lên GitHub**. Máy tạo kho riêng tư `web-<tên>` và đẩy mã lên.
3. *Lần đầu cho mỗi website:* vào Cloudflare → Workers & Pages → Import a
   repository → chọn kho → điền hai lệnh thẻ hiện sẵn → Save and Deploy.

Từ đó sửa gì chỉ cần **Đẩy bản mới** — Cloudflare tự dựng lại. Chi tiết và
các cách khác (VPS, tải .zip): `docs/dua-web-khach-len-mang.md`. **Không**
dùng Vercel bản miễn phí cho web khách.

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
