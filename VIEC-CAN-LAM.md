# Việc cần chủ dự án làm

*Cập nhật lần cuối: 10/09/2026 (sau 6 vòng tự chủ). Đây là **chỗ duy nhất** ghi việc cần chủ dự án —
tôi không rải câu hỏi ra các câu trả lời nữa. Bản PDF cùng tên nằm cạnh tệp này.*

Mỗi mục ghi rõ: **vì sao cần chị**, **hậu quả nếu chưa làm**, và **làm xong thì
mở khoá việc gì**. Xếp theo mức chặn, không theo thứ tự thời gian.

---

## ⚠️ ĐÍNH CHÍNH BẢN "BÁO CÁO DỰ ÁN" NGÀY 09/09

Chị gửi một bản báo cáo PDF do trợ lý khác soạn. Tôi kiểm chứng lại bằng mã nguồn
và bằng chính trang đang chạy. **Bốn mục trong đó sai**, và ba mục đầu nguy hiểm
vì chúng bảo chị đi làm việc đã làm rồi.

| Báo cáo nói | Thực tế đo được |
|---|---|
| `llms.txt` — **✗ Chưa làm**, cần chạy Module 13 rồi deploy | **ĐÃ CHẠY THẬT.** `https://halongxanh360.vn/llms.txt` trả HTTP 200, 11.010 byte. Mã ở `src/app/llms.txt/route.ts` |
| `robots.txt` — "không thể xác nhận từ bên ngoài" | **ĐÃ CHẠY.** HTTP 200, 628 byte. Mã ở `src/app/robots.ts` |
| `sitemap.xml` — "không thể xác nhận, cần deploy" | **ĐÃ CHẠY.** HTTP 200, 5.412 byte, `application/xml`. Mã ở `src/app/sitemap.ts` |
| "30 file · 122 tests" | **34 tệp · 198 test** (đo 09/09, sau khi thêm 9 ca mới) |

**Nghĩa là ba việc "ưu tiên cao" trong mục 4.1 của báo cáo — deploy llms.txt, xác
nhận robots.txt, xác nhận sitemap.xml — KHÔNG cần làm.** Chúng đã xong và đang
phục vụ.

Bản báo cáo cũng **không biết** những việc làm ngày 09/09: ba ảnh AI trên `/tien-ich`
(xem mục 2 dưới), bộ kiểm liên kết chết, `npm run kiem` tự tìm 10 phép kiểm, và
lỗi chốt chặn đường dẫn trong mã dựng web.

Điểm báo cáo nói ĐÚNG và trùng với tôi: `/du-an` đã giảm từ 34.452 xuống 916 từ,
`/san-pham/*` đã tăng lên 502 từ, chín trang phân khu vẫn mỏng, và cần redeploy VPS.

---

## 🔴 CHẶN — đang dừng hẳn một phần việc

### 1. Thu hồi khoá OpenAI đã lộ

Khoá `sk-proj-77fD…` đã xuất hiện trong hội thoại và **đã được dùng 5 lần**. Bất
kỳ ai đọc được đoạn hội thoại đó đều tiêu được tiền của chị.

- **Vì sao cần chị:** chỉ chủ tài khoản thu hồi được.
- **Làm ở đâu:** platform.openai.com → API keys → Revoke.
- **Nếu chưa làm:** rủi ro tiền, và tôi không dùng khoá đó cho việc gì nữa.

### 2. Redeploy halongxanh360 lên VPS

**⚠️ Có một lý do mới và gấp hơn:** trang đang chạy hiện **đăng ba ảnh do AI sinh
ra**, giới thiệu như tiện ích của dự án. Audit ngày 09/09 tìm ra, bằng chứng nhìn
thấy được:

| Ảnh | Bằng chứng |
|---|---|
| Làng tuyết | Biển ghi **"NORTH S POLE"** — chữ vỡ, khoảng cách sai |
| Công viên nước | Biển ghi **"Công viên Nước Đ5 chề mts"** — chữ Việt nát |
| Rạp xiếc | Còn nguyên **hình mờ của trình sinh ảnh** ở góc phải dưới |

Đã gỡ khỏi mã, nhưng **chúng vẫn đang hiển thị trên trang cho tới khi chị deploy.**
Đây là mục đáng làm sớm nhất trong cả tệp này.

Kho này chạy trên VPS + Caddy, **không dính Vercel nên không tự deploy**. Nhiều
commit đã đẩy lên GitHub mà chưa lên trang:

- HSTS
- JSON-LD từng bài viết
- Ảnh đầu bài theo chuyên mục
- Khối số liệu thật cho 5 trang `/san-pham/*` (365 → 502 từ)
- Nối liên kết nội bộ trong thân bài
- Chín trang phân khu: tiêu đề "Mặt bằng quy hoạch", câu láng giềng, khối bảng hàng
- `/du-an` bỏ bảng 616 căn: **1.450 KB → 129 KB**

- **Nếu chưa làm:** mọi cải tiến trên nằm im. Trang đang chạy vẫn là bản cũ.

### 3. Gửi bản câu hỏi cho chủ đầu tư

Tệp: `D:\vinhomes_ha_long_xanh\CAU-HOI-CHU-DAU-TU-09-09-2026.pdf` — 10 mục, 3 trang A4.

Mục quan trọng nhất là **mâu thuẫn về ranh giới phân khu**: bảng hàng SalePro chỉ
có cột tiểu khu, và hai nguồn ngoài nói ngược nhau về việc "Vịnh Bình Minh 1" và
"Thiên Đường Nhiệt Đới 1" nằm TRONG hay nằm CẠNH Vịnh Thiên Đường.

Giả thuyết của tôi ở mục 2 của bản đó: dự án dùng **hai lớp phân chia song song**
(chín khu, và năm khu theo châu lục). Bằng chứng: thư mục Drive của chính chủ đầu
tư có mục tên **"1.1 CHÂU MỸ"**. Nếu đúng thì cả hai nguồn ngoài đều đúng một nửa.

- **Làm xong mở khoá:** chín trang phân khu nói được quy mô, lộ trình mở bán, dòng
  sản phẩm — hiện chúng dừng ở ~490 từ vì kho chỉ có ba gạch đầu dòng mỗi khu.

### 4. Xin media kit ảnh của chủ đầu tư

Ảnh render gốc, có quyền sử dụng rõ ràng. Trang hiện dùng 66 ảnh và **không có ảnh
riêng cho từng phân khu** — bộ ảnh hiện tại không ghi ảnh nào thuộc khu nào, mà
gán bừa là nói sai với người mua.

- **Không dùng được:** ảnh chụp màn hình từ Facebook. Vừa vướng bản quyền, vừa
  không xác minh được ảnh nào thật ảnh nào do AI sinh. Đã bàn ngày 09/09.

---

## 🟡 CẦN — làm trang tốt lên rõ rệt

### 5. Bấm "Cấp thêm quyền" trong Antigravity

Vào `/settings`. Token Google hiện tại chỉ có **5 trong 6 quyền** — thiếu
`webmasters.readonly`, vì quyền đó được thêm sau khi chị đã bấm kết nối, và Google
không tự nới token cũ.

- **Đã xong phần chuẩn bị:** Google Cloud → Data Access đã lưu đủ 6 quyền (09/09).
- **Sau khi bấm:** huy hiệu ở `/analytics` phải chuyển xanh "Đã kết nối". Nếu vẫn
  ghi "Thiếu quyền" thì báo tôi.

### 6. Gửi CSV Keyword Planner

Để nghiên cứu từ khoá có số lượng tìm kiếm thật. Hiện tôi chỉ tra được **cụm truy
vấn** từ SERP, **không có số lượng** — và sẽ không bịa ra.

- Trang đã được Google lập chỉ mục (xác nhận 09/09) nên dữ liệu Search Console sẽ
  tự tích luỹ, nhưng cần vài tuần.

### 7. Kiểm Vercel có tự deploy sau khi nối Git chưa

Đã nối `PCBoiz/SEO_AI` ngày 09/09. Các commit sau đó lẽ ra tự dựng lại.

- **Kiểm:** tab Deployments, xem có bản mới nào ứng với commit gần nhất không.
- **Nếu không có:** bấm Redeploy một lần, và báo tôi — nghĩa là webhook chưa ăn.

---

## ⚪ QUYẾT ĐỊNH — không gấp, nhưng cần chị chọn

### 8. Người dùng huỷ gói thì trang của họ ra sao?

Chỉ áp dụng nếu sau này mở bán Antigravity. Hiện đã chốt làm **công cụ nội bộ**
nên chưa gấp — ghi lại để không quên khi đổi ý.

### 9. Hai dịch vụ trả phí trong 11 nguồn chị gửi

- **horizonx.so** — $24,99–99,99/tháng. **Chưa cần mua**: HyperUI (giấy phép MIT,
  500+ khối landing, Tailwind v4) miễn phí và đủ dùng.
- **contentcore.xyz** — $9,99/tháng. Chỉ liên quan việc làm ảnh/video cho bài
  đăng, không liên quan sinh mã.

---

## 👀 CẦN MẮT NGƯỜI — tôi không xem được

### 10. Hai ảnh nghi trùng nhau

`public/images/song-dai-lo-mua-hoa.webp` và `public/images/vbm-hoan-thien-02.webp`
— bộ kiểm báo lệch 10 bit, tức rất giống nhau.

**Tôi không xem được hai tấm này** — công cụ đọc ảnh từ chối kể cả sau khi thu
xuống 760px. Đây là hạn chế phía công cụ, **không phải kết luận rằng chúng ổn**.

Chị mở hai tệp đó xem có phải cùng một ảnh đặt hai tên không. Nếu đúng thì báo
tôi, tôi gỡ một tấm.

### 11. Xác minh nguồn hai ảnh đang bị cách ly

`giai-tri-nha-hang-duoi-nuoc` và `giai-tri-thuy-cung` — tôi đã gỡ khỏi trang vì
chưa xác minh được nguồn, nhưng **chưa chắc chúng sai**. Nếu chị biết đó là ảnh
chủ đầu tư gửi cho chính dự án này thì báo, tôi đưa lại.

Lý do nghi từng tấm ghi trong `vinhomes_ha_long_xanh/src/data/anh-cam-dung.ts`.

---

## ✅ ĐÃ XONG — ghi lại để khỏi làm lại

| Việc | Ngày | Kết quả |
|---|---|---|
| Xác minh Search Console | 09/09 | `halongxanh360.vn` **đã được lập chỉ mục** |
| Google Cloud → Data Access | 09/09 | Đã lưu đủ 6 quyền gồm `webmasters.readonly` |
| Nối Git repo vào Vercel | 09/09 | `PCBoiz/SEO_AI` đã nối |
| Đổi INGEST_TOKEN | 09/09 | Đã đổi, luồng đăng bài chạy thông |
| Chạy `npm run db:migrate` trên Neon | 09/09 | Migration `0003` đã áp |

---

## Ghi chú về cách tôi làm việc từ 09/09

Chủ dự án đã chuyển sang **vòng lặp tự chủ**: tôi tự đặt câu hỏi, tự nghiên cứu,
tự làm, tự kiểm, tự audit rồi quay lại — không dừng chờ. Mọi việc cần chị đều rơi
vào tệp này thay vì nằm rải trong các câu trả lời.

Những giới hạn an toàn **không** đổi: không bịa số liệu, không đăng thứ chưa có
nguồn, không tiêu tiền API cho việc chưa được duyệt, không đụng vào bí mật.

Nhật ký chi tiết từng phiên: `NHAT-KY.md` ở gốc mỗi kho.
