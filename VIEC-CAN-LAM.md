# Việc cần chủ dự án làm

*Cập nhật lần cuối: 11/09/2026 — **vòng 10**. Đây là **chỗ duy nhất** ghi việc cần chủ dự án —
tôi không rải câu hỏi ra các câu trả lời nữa. Bản PDF cùng tên nằm cạnh tệp này.*

> **Vòng 8 gạch được năm mục.** Mục 2 (redeploy VPS), 7 (cấp quyền Google) và 8
> (Bing) — chị đã làm, tôi đo trang thật để xác nhận chứ không tin lời kể. Mục 16
> và 17 (hai việc "cần mắt người") — phiên này gửi ảnh được nên tôi tự xem và tự
> kết luận. Tất cả chuyển xuống bảng ✅ ở cuối.
>
> **Vòng 9 làm Search Console thành thứ dùng được** — thêm bảng truy vấn thật,
> nạp số liệu đó vào Nhận định AI, và gỡ một bảng hứa hẹn không bao giờ có dữ
> liệu. Mục 7 viết lại, mục 11 hạ mức, mục 12 giờ có phép thử sạch.
>
> **Vòng 10 (11/09) trả lời hai câu chị hỏi:** vì sao tra "halongxanh360" không
> ra (mục 7b — trang tự xưng là dự án của Vinhomes ở cả bốn chỗ Google đọc tên
> site, đã sửa, chờ deploy), và vì sao `/analytics` vẫn 403 sau khi kết nối lại
> (mục 7 — API Search Console chưa bật trong Google Cloud, một phút là xong).

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

Nhưng vòng 8 và 10 thêm một loạt thay đổi đang nằm trong kho — và **cái ở vòng
10 là thứ trực tiếp trả lời câu "vì sao tra halongxanh360 không ra"** (mục 7b):

- **Site tự xưng đúng tên mình** — `WebSite` JSON-LD, `og:site_name`, tiêu đề
  trang chủ và chữ ở vị trí logo giờ đều là "Hạ Long Xanh 360" thay vì tên dự
  án. Chừng nào chưa deploy, Google vẫn đọc bản cũ.
- **IndexNow** — tệp khoá
  `https://halongxanh360.vn/a89f551822f0aacd4133bb9aa6412a61.txt` mới sống sau
  deploy; chưa sống thì mọi lần ping trả 403.
- Ảnh `/gia-tri-tai-san-…` đổi sang bản đúng.

**Lệnh deploy — chép nguyên** (`trien-khai.sh` tự `git pull`, dựng Docker, chờ trang trả lời):

```bash
ssh root@103.7.40.145
cd /opt/halongxanh
./trien-khai.sh
```

`103.7.40.145` là IP mà cả `halongxanh360.vn` lẫn `.com.vn` đang trỏ tới (tra
DNS ngày 11/09), khối IP thuộc SUPERDATA-VN. Tài khoản `root` theo
`TRIEN-KHAI.md`. Nếu `cd /opt/halongxanh` báo không có thì là `cd ~/halongxanh`.

**Sau khi deploy, làm ba việc theo thứ tự:**

1. Mở `https://halongxanh360.vn/a89f551822f0aacd4133bb9aa6412a61.txt` — phải
   hiện đúng chuỗi đó, không thừa gì. Ra 404 thì báo tôi (thư mục `public/`
   chưa được chép lên).
2. Trong kho site chạy **`npm run bao-bing`** — gửi cả 31 địa chỉ cho Bing một
   lần. Kịch bản tự từ chối nếu tệp khoá chưa sống.
3. Làm mục **7b** bên dưới — cái này cho Google, và Google không nhận IndexNow.

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

**Chị đã mở, và nó trả 403 dù đã kết nối lại.** Đó là lượt gọi Google thật đầu
tiên, và nó cho tôi đúng thứ cần biết: huy hiệu xanh là thật (token đủ quyền),
nên 403 *sau khi* có quyền gần như chắc chắn là chuyện khác — **API Search
Console chưa được bật trong dự án Google Cloud.** Quyền OAuth và API là hai công
tắc riêng; mục ✅ ghi "Data Access đã lưu đủ 6 quyền" là mới bật công tắc thứ
nhất. Kết nối lại bao nhiêu lần cũng không bật được công tắc thứ hai.

**Làm ngay, một phút, không cần đợi bản mới:**

```
https://console.cloud.google.com/apis/library/searchconsole.googleapis.com
```

Chọn đúng dự án đang chứa OAuth client → bấm **Enable** → chờ 1–2 phút → tải
lại `/analytics`. **Không kết nối lại.**

Bản mới (đã đẩy lên Vercel) sẽ hiện **đúng lý do Google trả** thay vì câu chung
chung: nếu là `accessNotConfigured` thì nút chính đổi thành "Bật API Search
Console" kèm link mang sẵn project ID; nếu là lý do khác (`forbidden`,
`insufficientPermissions`) thì nó nói tên lý do đó để tôi biết mình đoán sai.

**Cập nhật 11/09, sau khi chị bật API:** Google trả lời thật rồi. Tài khoản của
chị **đang quản lý `sc-domain:halongxanh360.vn`** — đúng property, đúng loại tốt
nhất. Cái sai còn lại nằm trong Antigravity: **dự án đang ghi website là
`https://vinhomeshalongxanh-five.vercel.app`** — địa chỉ xem thử từ tháng 8, chưa
từng đổi sang tên miền thật. Mã so hai bên không khớp nên từ chối, đúng thiết kế.

**Việc còn lại, 30 giây:** Website của tôi → chọn dự án → **Sửa** → ô "URL
website" → `https://halongxanh360.vn` → Lưu → tải lại `/analytics`. Không cần
kết nối lại Google.

| Nếu thấy | Nghĩa là |
|---|---|
| Số thật ở bốn thẻ | Xong. Gạch mục này. |
| "Website của dự án đang ghi một địa chỉ XEM THỬ" | Chưa sửa ô website — làm bước 30 giây ở trên |
| "Quyền đã đủ — nhưng API Search Console chưa được bật" | Đã bật rồi, không còn gặp |
| "Google từ chối (403, lý do: forbidden)" | Tài khoản Google đang nối không có quyền trên property — kết nối lại bằng đúng tài khoản quản lý Search Console |
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

### 7b. Vì sao tra "halongxanh360" không ra — và nửa việc chỉ chị làm được

Tôi đo ngày 11/09: tra `halongxanh360` ra toàn Facebook/YouTube hashtag
"halongxanh"; `site:halongxanh360.vn` trả **0 trang** từ tên miền, toàn tên miền
na ná (`halongxanh.com.vn`, `halongxanh.com`, `halongxanhquangninh.com`).

**Không có gì chặn về kỹ thuật** — robots mở, không `noindex`, không header chặn.
Nguyên nhân là chuyện khác, và nó có hai nửa.

**Nửa 1 — trang không tự xưng tên mình (tôi đã sửa, chờ deploy).** Tài liệu
Google nói tên site được đọc từ `WebSite` JSON-LD trên trang chủ trước tiên, rồi
tới chữ trên trang chủ, rồi `og:site_name` và tiêu đề. Đo trang đang chạy, **cả
bốn chỗ đó đều khai tên là "Vinhomes Global Gate Hạ Long"** — tên dự án, giống
hệt mười đối thủ. Khối `Organization` còn khai "Liên danh Vingroup – Vinhomes",
ngược với chính dòng miễn trừ ở chân trang. "Hạ Long Xanh 360" chỉ nằm ở chân
trang; chuỗi "halongxanh360" không có trong trường nào. **Với Google, thực thể
đó không tồn tại**, nên nó chọn thứ gần nhất: các tên miền có "halongxanh".

**Nửa 2 — thực thể đó cũng chưa tồn tại ở ĐÂU ngoài site.** Google ghi rõ nguồn
thứ hai là *"references to it that appear on the web"*. Hiện tại chữ
"halongxanh360" / "Hạ Long Xanh 360" không xuất hiện ở bất kỳ nơi nào khác trên
mạng: Facebook không, Zalo không, YouTube không, Google Business không. Một
thương hiệu chỉ có duy nhất một nguồn — chính nó — thì Google chưa tin nó là
thứ người ta thật sự tìm. Phần này tôi không làm thay được.

**Việc của chị, xếp theo tác động ÷ công sức:**

| # | Việc | Mất | Vì sao |
|---|---|---|---|
| 1 | **Search Console → URL Inspection → dán `https://halongxanh360.vn/` → Request indexing** | 1 phút | Bắt Google crawl lại trang chủ NGAY sau deploy thay vì đợi vài tuần. Làm **sau khi deploy**, không phải trước |
| 2 | **Search Console → Pages (Coverage)** → chụp màn hình gửi tôi | 1 phút | Cho biết Google thực sự lập chỉ mục **bao nhiêu trong 31** địa chỉ. "Đã lập chỉ mục" hôm 09/09 có thể chỉ là 1 trang |
| 3 | **Đặt tên mọi hồ sơ mạng xã hội đúng "Hạ Long Xanh 360"** và ghi link `halongxanh360.vn` vào phần giới thiệu — Facebook page, Zalo OA (mục 8), YouTube nếu có | 30 phút | Đây là "references on the web" Google cần. Tên phải **khớp từng chữ**; "Halongxanh" hay "Hạ Long Xanh" không tính |
| 4 | Gửi tôi link các hồ sơ đó sau khi đổi tên | 1 phút | Tôi khai `sameAs` trong dữ liệu có cấu trúc — nối site với hồ sơ. Tôi cố ý **chưa** khai gì vì chưa hồ sơ nào mang đúng tên |
| 5 | Google Business Profile tên "Hạ Long Xanh 360" (mục 9, đọc cảnh báo pháp lý) | 1 giờ + xác minh | Hồ sơ GBP là thứ chiếm cả cột bên phải khi tra tên thương hiệu — mạnh nhất trong danh sách, nhưng phải đúng luật |

⚠️ **Kỳ vọng thời gian, có số.** Google tự ghi: "crawling can take anywhere from
several days to several weeks". Với truy vấn ĐÚNG TÊN THƯƠNG HIỆU, sau khi cả
hai nửa xong, thường thấy trong **1–3 tuần** — vì không có đối thủ nào tên
"halongxanh360". Với truy vấn chung như "hạ long xanh giá bán" thì là chuyện
khác hẳn: Ahrefs đo chỉ 5,7% trang mới lọt top 10 trong một năm. Đừng lẫn hai
mục tiêu.

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
