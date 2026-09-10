# Việc cần chủ dự án làm

*Cập nhật lần cuối: 10/09/2026 — **vòng 8**. Đây là **chỗ duy nhất** ghi việc cần chủ dự án —
tôi không rải câu hỏi ra các câu trả lời nữa. Bản PDF cùng tên nằm cạnh tệp này.*

> **Vòng 8 gạch được năm mục.** Mục 2 (redeploy VPS), 7 (cấp quyền Google) và 8
> (Bing) — chị đã làm, tôi đo trang thật để xác nhận chứ không tin lời kể. Mục 16
> và 17 (hai việc "cần mắt người") — phiên này gửi ảnh được nên tôi tự xem và tự
> kết luận. Tất cả chuyển xuống bảng ✅ ở cuối.
>
> **Vòng 9 làm Search Console thành thứ dùng được** — thêm bảng truy vấn thật,
> nạp số liệu đó vào Nhận định AI, và gỡ một bảng hứa hẹn không bao giờ có dữ
> liệu. Mục 7 viết lại, mục 11 hạ mức, mục 12 giờ có phép thử sạch.

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
(đã gỡ, và bản gỡ **đã lên trang** — xem bảng ✅), bộ kiểm liên kết chết, `npm run kiem` tự tìm 10 phép kiểm, và
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

### 2. Deploy halongxanh360 lên VPS — lần này để bật IndexNow

**Lần deploy trước ĐÃ XONG và tôi đã xác nhận.** Đo trên trang thật ngày 10/09,
ba dấu vết từ ba commit khác nhau đều khớp bản mới: tiêu đề trang chủ đã là
`Vinhomes Global Gate Hạ Long (Hạ Long Xanh)`, `sitemap.xml` có 31 địa chỉ và
**0 `lastmod`**, `FAQPage` chỉ còn ở trang chủ. **Ba ảnh AI đã biến khỏi
`/tien-ich`.** Không còn gì tồn đọng từ đợt trước.

Nhưng vòng 8 lại thêm một loạt thay đổi đang nằm trong kho:

- **IndexNow** — đăng bài xong là báo thẳng cho Bing. Cần deploy thì tệp khoá
  `https://halongxanh360.vn/a89f551822f0aacd4133bb9aa6412a61.txt` mới sống, và
  chừng nào nó chưa sống thì **mọi lần ping đều trả 403**.
- Ảnh `/gia-tri-tai-san-…` đổi sang bản đúng (xem dòng "Hai ảnh nghi trùng" ở bảng ✅).
- Trang 404 — không đổi gì, nhưng tôi đã đo lại để chắc bản mới không làm hỏng.

**Sau khi deploy, kiểm giúp tôi một địa chỉ** (mở bằng trình duyệt cũng được):

```
https://halongxanh360.vn/a89f551822f0aacd4133bb9aa6412a61.txt
```

Phải hiện đúng một dòng chữ `a89f551822f0aacd4133bb9aa6412a61`, không thừa gì.
Nếu ra trang 404 thì báo tôi — nghĩa là thư mục `public/` chưa được chép lên.

⚠️ Kho này chạy trên VPS + Caddy, **không dính Vercel nên không tự deploy**.

### 3. Áp migration Neon `0004` — nặng hơn tài liệu mô tả rất nhiều

Tài liệu trong kho gọi `drizzle-postgres/0004` là tính năng "ghim kết quả", nghe
như một thứ có cũng được. **Không phải.**

`postgres-schema.ts:62` khai cột `pinnedAt`, và `neon-module-job-repository.ts`
gọi `.select()` trần ở **sáu chỗ** — Drizzle khi đó sinh SQL liệt kê *mọi* cột khai
trong schema, gồm `pinned_at`. Thiếu cột đó thì **mọi thao tác đọc/ghi bảng
`module_jobs` trên Neon đều lỗi**: tạo job, poll trạng thái, nối luồng upstream,
trang Kết quả — tức là toàn bộ engine module.

**Vòng 8 làm được một việc: giờ có cách TỰ KIỂM, không phải đoán nữa.**

```
MIGRATOR_DATABASE_URL=<url Neon> npm run kiem:neon
```

Kịch bản đó **chỉ đọc** — không tạo, không sửa, không xoá. Nó đối chiếu *mọi* cột
khai trong schema Drizzle với bảng thật trên Neon, chứ không hỏi riêng
`pinned_at`: repository gọi `.select()` trần nên thiếu **bất kỳ** cột nào cũng
làm hỏng cả bảng, và một phép kiểm chỉ hỏi một cột sẽ báo xanh trong khi cột
khác đang thiếu.

⚠️ **Vì sao tôi không tự chạy được:** `DATABASE_URL` ở máy lập trình trỏ vào
`local.db` — máy này chạy SQLite, không phải Neon. URL Neon nằm ở biến môi trường
trên Vercel. Chị dán URL đó vào lệnh trên là ra câu trả lời trong vài giây.

- **Nếu thiếu cột:** chạy `npm run db:neon:migrate` với URL migrator.
- **Nếu đủ:** báo tôi, tôi gạch mục này hẳn.

### 4. `.env.local` có khoá TRÙNG với hai giá trị khác nhau

Hai khoá `VINHOMES_INGEST_TOKEN` và `OPENAI_API_KEY` mỗi cái xuất hiện **hai lần
trong tệp, mang hai giá trị khác nhau**. dotenv lấy giá trị **cuối cùng**.

Nếu giá trị đúng nằm ở dòng trên, mọi lần đẩy bài sẽ trả 401 và log chỉ nói
"Token không khớp" — không nói rằng có hai dòng.

**Vòng 8 đã XÁC NHẬN lại bằng máy — vẫn còn nguyên:**

```
.env.local: 7 khoá.
✗ 2 khoá khai nhiều lần — dotenv chỉ dùng dòng CUỐI:
    OPENAI_API_KEY — 2 lần
    VINHOMES_INGEST_TOKEN — 2 lần
```

Đó là đầu ra thật của `npm run kiem:neon` (phép kiểm khoá trùng chạy kèm, không
cần URL Neon). Nó **chỉ in TÊN khoá và số lần** — không in giá trị, không in một
phần giá trị, không in cả độ dài. Chị chạy được lúc đang chia sẻ màn hình, và
không phải tin lời tôi hứa: đọc mã trong `scripts/kiem-neon.ts` là thấy.

- **Vì sao cần chị:** tôi không mở tệp bí mật. Chị tự xoá dòng thừa.
- **Sửa xong chạy lại lệnh trên** để thấy nó chuyển thành `✓ Không khoá nào khai
  hai lần.`
- **Đây có thể là lý do thật** nếu luồng đăng bài từng báo sai khoá.

### 5. Gửi bản câu hỏi cho chủ đầu tư

Tệp: `D:\vinhomes_ha_long_xanh\CAU-HOI-CHU-DAU-TU-09-09-2026.pdf` — 10 mục, 3 trang A4.

Mục quan trọng nhất là **mâu thuẫn về ranh giới phân khu**: bảng hàng SalePro chỉ
có cột tiểu khu, và hai nguồn ngoài nói ngược nhau về việc "Vịnh Bình Minh 1" và
"Thiên Đường Nhiệt Đới 1" nằm TRONG hay nằm CẠNH Vịnh Thiên Đường.

Giả thuyết của tôi ở mục 2 của bản đó: dự án dùng **hai lớp phân chia song song**
(chín khu, và năm khu theo châu lục). Bằng chứng: thư mục Drive của chính chủ đầu
tư có mục tên **"1.1 CHÂU MỸ"**. Nếu đúng thì cả hai nguồn ngoài đều đúng một nửa.

- **Làm xong mở khoá:** chín trang phân khu nói được quy mô, lộ trình mở bán, dòng
  sản phẩm — hiện chúng dừng ở ~490 từ vì kho chỉ có ba gạch đầu dòng mỗi khu.

### 6. Xin media kit ảnh của chủ đầu tư

Ảnh render gốc, có quyền sử dụng rõ ràng. Trang hiện dùng 66 ảnh và **không có ảnh
riêng cho từng phân khu** — bộ ảnh hiện tại không ghi ảnh nào thuộc khu nào, mà
gán bừa là nói sai với người mua.

- **Không dùng được:** ảnh chụp màn hình từ Facebook. Vừa vướng bản quyền, vừa
  không xác minh được ảnh nào thật ảnh nào do AI sinh. Đã bàn ngày 09/09.

---

## 🟡 CẦN — làm trang tốt lên rõ rệt

### 7. Mở `/analytics` và cho tôi biết nó hiện gì

Chị đã cấp đủ 6 quyền — **mục cũ số 7 xong rồi**. Nhưng vòng 8 tìm ra chuyện lớn
hơn: **quyền đó chưa ai dùng.** Tra cả kho thì `searchconsole|webmasters` chỉ
khớp 3 dòng, cả 3 nằm trong tệp khai báo quyền. Token được mã hoá cất vào kho rồi
chưa từng có mã nào đọc ra.

Vòng 8 và 9 đã dựng xong phần còn thiếu. Trang giờ có:

| Khối | Nội dung |
|---|---|
| Bốn thẻ số | Clicks · Hiển thị · CTR · Vị trí TB, 28 ngày, kèm mũi tên so với 28 ngày liền trước |
| **Top trang** | Trang nào đang lên hạng |
| **Truy vấn người ta thật sự gõ** | Câu chữ thật, kèm nhãn **"đuôi dài"** cho truy vấn ≥7 chữ — nhóm đáng viết bài nhất |
| **Nhận định AI** | Giờ đọc cả số liệu Search Console, không chỉ số lần chạy module |

**Việc của chị: mở `/analytics` rồi báo tôi thấy gì.**

| Nếu thấy | Nghĩa là |
|---|---|
| Số thật ở bốn thẻ | Xong. Gạch mục này. |
| "Không thấy property của website này" | Tài khoản Google đang nối không quản lý property khớp website dự án — **trang sẽ liệt kê ra property nó thấy**, chụp màn hình gửi tôi |
| "Kết nối đã ngừng hoạt động" | Token chết, bấm kết nối lại (app giờ tự nhận ra việc này thay vì để huy hiệu xanh mãi) |
| "Thiếu quyền Search Console" | Bấm "Cấp quyền Search Console" |
| Vẫn "cần kết nối" | Báo tôi — nghĩa là còn chỗ tôi chưa nối đúng |

⚠️ **Hai điều để chị không hiểu nhầm:**

**Đừng mong số liệu đẹp.** Trang mới được lập chỉ mục, và Ahrefs đo trên ~2 triệu
từ khoá: chỉ **5,7% trang mới lọt top 10 trong một năm**. Bốn thẻ hiện số nhỏ
hoặc số 0 là bình thường — cái đáng giá là từ nay số đó **có thật**.

**Chưa có lượt gọi Google thật nào.** Máy lập trình không có kết nối OAuth nào để
thử, nên mọi nhánh sau khi lấy được dữ liệu mới chỉ chạy qua phép kiểm tự dựng.
Lần chị mở trang là lần đầu tiên nó chạm máy chủ Google thật. Trục trặc gì, báo
tôi.

**Một bảng đã bị GỠ, cố ý.** Bảng "Được AI trích dẫn (GEO)" hứa theo dõi nội dung
được ChatGPT / Perplexity / AI Overviews nhắc tới. **Không nguồn nào cấp được số
đó** — Search Console gộp lượt hiển thị AI Overviews vào tổng chung, còn ChatGPT
và Perplexity không phát API cho chủ trang. Một ô trống kèm lời hứa thì tệ hơn
không có ô nào. Chỗ đó giờ nói thẳng lý do, và chỉ sang thứ đo được thật là bảng
truy vấn đuôi dài.

### 8. Lập Zalo Official Account — miễn phí

Zalo phủ **77% dân số Việt Nam** (~79 triệu). Đây là **kênh chốt**, không phải
kênh tìm — mọi khách từ mọi kênh khác cuối cùng đều rơi vào Zalo. Lập miễn phí,
không phí duy trì.

### 9. Google Business Profile — nhưng đọc cảnh báo pháp lý trước

Google cho phép doanh nghiệp không có cửa hàng lập **một** hồ sơ vùng phục vụ, ẩn
địa chỉ, bán kính trong khoảng 2 giờ lái xe (Hạ Long–Hà Nội nằm trong ngưỡng).
Cấm tuyệt đối hòm thư và văn phòng ảo. Xác minh ở Việt Nam qua gọi video, cần
**giấy phép kinh doanh**.

⚠️ **Luật Kinh doanh bất động sản 2023, Điều 61** (hiệu lực 01/8/2024): cá nhân
môi giới **phải hành nghề trong một doanh nghiệp**, không còn được hành nghề độc
lập như Luật 2014. Nên hồ sơ nên lập **dưới pháp nhân sàn/công ty chị đang thuộc
về**, không phải tư cách cá nhân tự do.

### 10. Gửi tôi số chứng chỉ hành nghề và tên sàn

Để đưa lên trang và vào dữ liệu có cấu trúc. Trang đang khai `RealEstateAgent`
nhưng chưa nói mình hành nghề ở đâu.

Vừa đúng luật, vừa là **tín hiệu tin cậy mà 10/10 đối thủ trong top không có** —
họ đều tự xưng "Thông Tin Chính Thức Chủ Đầu Tư", một tuyên bố mà trang tư vấn
độc lập không thể và không nên bắt chước.

### 11. Gửi CSV Keyword Planner — **đã bớt gấp**

Mục này hạ mức sau vòng 9. Bảng **"Truy vấn người ta thật sự gõ"** trên
`/analytics` giờ cho số liệu thật của chính trang mình: truy vấn nào đã có lượt
hiển thị, đang ở vị trí bao nhiêu, và cái nào là "đuôi dài".

**Đó là dữ liệu tốt hơn Keyword Planner ở một điểm quan trọng:** Keyword Planner
nói cả thị trường tìm gì; bảng này nói **trang của chị đã được hiện ra cho truy
vấn nào rồi** — tức là chỗ Google đã hiểu trang nói về chủ đề đó, chỉ chưa xếp đủ
cao. Viết lại cho một truy vấn đang ở vị trí 11–30 dễ ăn hơn nhiều so với viết
mới cho một từ khoá lượng tìm cao mà trang chưa hề xuất hiện.

- **Vẫn nên gửi nếu tiện:** Keyword Planner cho biết nhu cầu ở những chủ đề trang
  **chưa** có bài nào, thứ mà Search Console không thể biết.
- Dữ liệu Search Console cần vài tuần mới đủ dày.

### 12. Kiểm Vercel có tự deploy sau khi nối Git chưa

Đã nối `PCBoiz/SEO_AI` ngày 09/09. Các commit sau đó lẽ ra tự dựng lại.

**Hôm nay có một phép thử sạch:** tôi vừa đẩy 4 commit lên `PCBoiz/SEO_AI` (vòng
8 và 9). Nếu webhook chạy thì Vercel phải có bản dựng mới ứng với commit
`Co van SEO chi nhin thay so lan chay module…`.

- **Kiểm:** tab Deployments, xem có bản mới nào không.
- **Nếu không có:** bấm Redeploy một lần, và báo tôi — nghĩa là webhook chưa ăn.
- **Việc này giờ chặn mục 7:** `/analytics` bản mới chỉ lên trang thật sau khi
  Vercel dựng lại.

---

## ⚪ QUYẾT ĐỊNH — không gấp, nhưng cần chị chọn

### 13. Người dùng huỷ gói thì trang của họ ra sao?

Chỉ áp dụng nếu sau này mở bán Antigravity. Hiện đã chốt làm **công cụ nội bộ**
nên chưa gấp — ghi lại để không quên khi đổi ý.

### 14. Hai dịch vụ trả phí trong 11 nguồn chị gửi

- **horizonx.so** — $24,99–99,99/tháng. **Chưa cần mua**: HyperUI (giấy phép MIT,
  500+ khối landing, Tailwind v4) miễn phí và đủ dùng.
- **contentcore.xyz** — $9,99/tháng. Chỉ liên quan việc làm ảnh/video cho bài
  đăng, không liên quan sinh mã.

---

## ✅ ĐÃ XONG — ghi lại để khỏi làm lại

| Việc | Ngày | Kết quả |
|---|---|---|
| Xác minh Search Console | 09/09 | `halongxanh360.vn` **đã được lập chỉ mục** |
| Google Cloud → Data Access | 09/09 | Đã lưu đủ 6 quyền gồm `webmasters.readonly` |
| Nối Git repo vào Vercel | 09/09 | `PCBoiz/SEO_AI` đã nối |
| Đổi INGEST_TOKEN | 09/09 | Đã đổi, luồng đăng bài chạy thông |
| Chạy `npm run db:migrate` trên Neon | 09/09 | Migration `0003` đã áp |
| **Deploy VPS** (mục 2 cũ) | 10/09 | **Đo trên trang thật:** tiêu đề trang chủ đã đổi, `sitemap.xml` 31 địa chỉ · 0 `lastmod`, `FAQPage` chỉ còn ở trang chủ, **ba ảnh AI đã biến khỏi `/tien-ich`** |
| **Cấp thêm quyền Google** (mục 7 cũ) | 10/09 | `/settings` ghi "6 quyền đã cấp"; huy hiệu `/analytics` đã xanh |
| **Nộp trang vào Bing Webmaster** (mục 8 cũ) | 10/09 | Thêm bằng cách **nhập từ Google Search Console** — cách này Bing tự mang sitemap sang, không cần vào tab Sitemaps |
| **Hai ảnh nghi trùng** (mục 16 cũ) | 10/09 | **Đúng là một ảnh.** Tôi tự xem được ở phiên mới. `vbm-hoan-thien-02` còn nguyên dải chữ "(*) … chỉ mang tính chất minh hoạ", `song-dai-lo-mua-hoa` là bản đã cắt đúng quy ước. Đã gỡ bản trùng và **sửa alt sai**: nó ghi "Dãy nhà HOÀN THIỆN" cho một phối cảnh, ngay trên trang giá trị tài sản |
| **Nguồn hai ảnh cách ly** (mục 17 cũ) | 10/09 | **Cả hai giữ cấm.** `giai-tri-thuy-cung` là ảnh CHỤP bể Kuroshio, thuỷ cung Churaumi ở Okinawa (Nhật Bản) — ba con cá nhám voi trong một bể, Việt Nam không nơi nào nuôi được. `giai-tri-nha-hang-duoi-nuoc` lấy từ Drive chủ đầu tư nhưng Drive đó có lẫn ảnh chiếu ý tưởng không thuộc dự án |

---

## Ghi chú về cách tôi làm việc từ 09/09

Chủ dự án đã chuyển sang **vòng lặp tự chủ**: tôi tự đặt câu hỏi, tự nghiên cứu,
tự làm, tự kiểm, tự audit rồi quay lại — không dừng chờ. Mọi việc cần chị đều rơi
vào tệp này thay vì nằm rải trong các câu trả lời.

Những giới hạn an toàn **không** đổi: không bịa số liệu, không đăng thứ chưa có
nguồn, không tiêu tiền API cho việc chưa được duyệt, không đụng vào bí mật.

Nhật ký chi tiết từng phiên: `NHAT-KY.md` ở gốc mỗi kho.
