# Việc cần chủ dự án làm

*Cập nhật lần cuối: 12/09/2026 — **vòng 24**. Đây là **chỗ duy nhất** ghi việc cần chủ dự án —
tôi không rải câu hỏi ra các câu trả lời nữa. Bản PDF cùng tên nằm cạnh tệp này.*

> **Vòng 24 (12/09, tối) — website cho khách đã RA ĐƯỢC MÃ NGUỒN THẬT.** Chạy
> luồng "Dựng website — bản nháp" (4 bước) rồi vào trang dự án → thẻ **"Website
> dựng sẵn"** → điền số điện thoại → **Tải mã nguồn (.zip)**. Tôi đã chạy thử
> trọn đường bằng máy: giải nén ra 26 tệp, `npm install`, `next build` — chạy
> được thật, không phải bản trình diễn. Việc của chị **vẫn là A1, A2**; mục 19
> giờ chỉ còn hỏi một câu: xem trước và dựng **trên máy nào**.
>
> **Vòng 23 (12/09, chiều) — rà luồng tự động cho người không rành + trình
> dựng web tầng 1.** Sau đăng nhập giờ về thẳng **Bắt đầu**, có khối **"Hôm nay
> máy đã làm gì"** (bài viết chưa, chờ duyệt không, khách mới không — kèm nút
> mở trang duyệt); thẻ lịch bớt tiếng máy, lên đầu trang dự án; menu điện thoại
> 4 mục. Kết luận rà: `docs/ra-soat-luong-tu-dong-cho-nguoi-khong-ranh.md`.
> Trình dựng web: ba bước "nghĩ" (#24–26) + luồng "Dựng website — bản nháp"
> đã lên; bước sinh mã cần chị chốt **mục 19** (chạy ở máy nào). Việc của chị:
> **A1, A2 không đổi**; thêm **mục 20** (đưa khoá duyệt bài cho người duyệt)
> nếu không phải chị tự duyệt.
>
> **Vòng 22 (12/09, chiều) — ba việc nhỏ trong bản rà đã xong** (báo Bing bài
> hẹn ngày tay, ảnh bìa ở danh sách tin, chọn ảnh chạy tay). Việc của chị
> **không đổi**: A1 `./trien-khai.sh` (giờ mang 4 đợt sửa) và A2 crontab.
>
> **Vòng 21 (12/09, trưa) — ảnh kèm bài từ Drive đã xong.** Bài tự động giờ
> mang tối đa 2 ảnh thật chọn từ thư mục Drive của chị (AI chọn trong danh
> sách, không sinh ảnh; chú thích lấy từ `danh-sach-anh.csv`). **Cần
> `./trien-khai.sh`** để website nhận ảnh. Bản rà "việc còn sót":
> `docs/viec-con-sot.md` — chị chỉ còn 5 việc nhỏ (A1–A5), tôi có 11 việc chờ
> chị xếp thứ tự.
>
> **Vòng 20 (12/09, sáng) — "chờ duyệt" mà hàng chờ "trống".** Link trên thẻ
> giờ mở thẳng `/duyet-bai` (bài chưa duyệt thì địa chỉ bài 404 là cố ý). Màn
> duyệt của website từng in "trống" khi cơ sở dữ liệu chưa trả lời — đã sửa để
> nó nói thật; **cần `./trien-khai.sh`** để lên. Sau deploy, mở lại hàng chờ.
>
> **Vòng 19 (12/09, sáng) — lượt đầu chạy tới bước 8 rồi bị chính website từ
> chối** (bài AI chạm luật cấm: cam kết lợi nhuận / "nhất" / số điện thoại…).
> Đã sửa: luật đưa vào lời nhắc trước khi viết, bị từ chối thì tự viết lại một
> lần thay vì gửi lại bài cũ. **Crontab vẫn chưa có trên VPS** — mục 15 giờ là
> một lệnh dán vào là xong.
>
> **Vòng 18 (12/09, 3 giờ sáng) — lượt đầu kẹt ở bước 5: đã sửa, chị bấm "Gõ
> tiếp ngay".** Hàm chạy bước 5 bị ngắt, và không có nhịp gõ nào từ VPS để cứu
> — **crontab chưa dán** (thẻ giờ nói thẳng "VPS chưa gõ lần nào"). Mỗi bước giờ
> có rào 250 giây; quá là tự đánh dấu hết giờ và thử lại. Ô nhập tự cao theo
> chữ (tối đa 10 dòng). Xem mục 15, phần "Nếu lượt đứng im".
>
> **Vòng 17 (12/09, sáng) — "AI viết hộ" đã có cạnh mọi ô nhập** (form module,
> Quy trình, thẻ lịch đăng): chọn nhà cung cấp, gõ gợi ý, Viết; "N bản đã viết"
> để quay về bản cũ. Chạy bằng key ở trang API Keys. Không có việc mới cho chị.
>
> **Vòng 16 (12/09, sáng) — lịch đăng bài tự động đã dựng xong.** Mỗi ngày
> một bài như chị chốt. Chị làm hai việc: điền thẻ mới trên trang dự án rồi
> dán **một dòng** vào VPS (**mục 15**, ~5 phút). Mục 18: ảnh rạp xiếc đã gỡ,
> **không** thay bằng ảnh AI — và phát hiện ba ảnh AI "đã gỡ" hôm 10/09 vẫn
> chạy trên trang chủ, đã sửa; cả hai lên trang khi chị `./trien-khai.sh`.
>
> **Vòng 15 (12/09, rạng sáng) — tìm ra vì sao bảng khách trống.** Bản website
> cũ **không đưa `LEAD_WEBHOOK_TOKEN` vào trong Docker**: dù `.env` đúng, website
> vẫn gửi khách đi không kèm token và bị từ chối — khách thấy "Đã nhận", bảng
> trống. **Đã sửa. Chị chỉ cần chạy lại `./trien-khai.sh` trên VPS** (mục 0,
> bước 6). Không cần lập bảng mới. Khách để lại số trong lúc hỏng **không mất** —
> họ tự vào bảng ở lượt gửi thành công đầu tiên. Cùng vòng: khung Drive đọc được
> thư mục con; nghiên cứu hẹn giờ đăng bài xong — **bốn điều cần chị chọn ở mục
> 15**; một ảnh AI trên `/tien-ich` chờ chị quyết ở **mục 18**.
>
> **Vòng 13 (11/09, tối):** dựng xong hai tính năng chị giao — **khách liên hệ tự
> vào Google Sheets** và **ảnh tải lên Drive hiện trong dự án**. Để bật, làm
> đúng thứ tự ở **mục 0** ngay dưới — một lượt khoảng 20 phút. Và một phát hiện
> có hạn: nếu app Google của chị đang ở chế độ "Testing", **mọi kết nối Google
> tự chết sau 7 ngày** — kể cả Search Console vừa dựng. Bước 1 của mục 0 chữa.
>
> **Vòng 8 gạch được năm mục.** Mục 2 (redeploy VPS), 7 (cấp quyền Google) và 8
> (Bing) — chị đã làm, tôi đo trang thật để xác nhận chứ không tin lời kể. Mục 16
> và 17 (hai việc "cần mắt người") — phiên này gửi ảnh được nên tôi tự xem và tự
> kết luận. Tất cả chuyển xuống bảng ✅ ở cuối.
>
> **Vòng 9 làm Search Console thành thứ dùng được** — thêm bảng truy vấn thật,
> nạp số liệu đó vào Nhận định AI, và gỡ một bảng hứa hẹn không bao giờ có dữ
> liệu. Mục 7 viết lại, mục 11 hạ mức, mục 12 giờ có phép thử sạch.
>
> **Vòng 11 (11/09):** ô chọn dự án trên `/analytics` (chị hỏi "đổi của dự án
> nào?" — đúng), khối mới "Google đã lập chỉ mục trang nào" soi 31 địa chỉ bằng
> máy, `llms.txt` sửa tên site. Deploy xong, Bing đã nhận 31 địa chỉ.
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

### 0. Bật Sheets + Drive — làm đúng thứ tự, một lượt ~20 phút

Hai tính năng đã có trong Antigravity (đã lên Vercel). Chúng dùng token Google
của chị, nên phía Google Cloud phải mở đủ năm thứ. **Thiếu một thứ là tính năng
im lặng không chạy** — đúng như Search Console hôm qua thiếu mỗi bước bật API.

Mở **console.cloud.google.com**, chọn project **Antigravity Staging**.

> **Cập nhật khuya 11/09 (ảnh chị gửi):** bước 1 **đã xong sẵn** — app đang
> *In production*. Bước 3 **đã xong** — `drive.readonly` đã khai. Dòng vàng
> *"Your app requires verification… submit your app for review"* ở trang Audience:
> **bỏ qua, đừng gửi thẩm định.** Google chỉ cần thẩm định khi app mở cho người
> ngoài; app hai người dùng nội bộ chạy bình thường với màn cảnh báo lúc cấp
> quyền. Bản dựng Vercel đã có đủ nút mới (kiểm lúc khuya 11/09).

**Bước 1 — Kiểm chế độ phát hành (quan trọng nhất, có hạn).** ✅ *Đã In production.*
Google Auth Platform → **Audience** → dòng *Publishing status*.

- Nếu ghi **Testing**: bấm **Publish app** → xác nhận → thành **In production**.
- **Vì sao:** tài liệu Google, nguyên văn: *"a publishing status of 'Testing' is
  issued a refresh token expiring in 7 days"*. Tức là kết nối Google chị bấm
  hôm 09–11/09 sẽ **tự chết khoảng 16–18/09** — Search Console, Sheets, Drive
  cùng tắt. App sẽ báo "Kết nối đã ngừng hoạt động" (tôi đã làm cho nó nhận ra
  thay vì im lặng), nhưng khách liên hệ trong lúc đó sẽ không vào bảng.
- **Có sợ không:** không. App chưa thẩm định mà chuyển In production thì Google
  hiện một màn cảnh báo lúc cấp quyền và giới hạn **100 người dùng**. Công cụ
  nội bộ hai người là đúng trường hợp *"personal use"* Google ghi rõ là không
  cần thẩm định.
- Nếu đã ghi **In production** sẵn: bỏ qua bước này.

**Bước 2 — Bật hai API.** APIs & Services → Library → tìm và bấm **Enable**:
- **Google Sheets API**
- **Google Drive API**

**Bước 3 — Khai quyền mới.** ✅ *Đã xong.* Google Auth Platform → **Data Access** → Add or
remove scopes → tick **`.../auth/drive.readonly`** → Update → **Save**.
(Có thể bỏ tick `drive.file` — app không dùng nó nữa.)

**Bước 4 — Kết nối lại Google trong Antigravity.** ✅ *Xong 11/09 — "7 quyền đã cấp".* Cài đặt → **Kết nối tự động
hoá**. Google sẽ hiện **"Google hasn't verified this app"** → bấm **Advanced** →
**Go to … (unsafe)** → cấp đủ quyền. Chữ "unsafe" nghe đáng sợ nhưng đó là app
của chính chị; Google hiện nó cho mọi app chưa qua thẩm định.

> Bước 4 làm **sau** bước 1. Token đang có được cấp lúc còn "Testing" — tài liệu
> Google không nói nó có được gia hạn khi chuyển chế độ hay không, nên kết nối
> lại sau khi chuyển là cách chắc chắn. Đằng nào cũng phải kết nối lại vì quyền
> Drive mới.

**Bước 5 — Lập bảng khách.** ✅ *Xong 11/09 — "Đã lập".* Hướng dẫn cũ giữ bên dưới.

1. Mở Antigravity (`antigravity-seo-automation.vercel.app`) → cột trái bấm
   **Website của tôi**.
2. Trong năm thẻ dự án, tìm thẻ có dòng xám ghi **`halongxanh360.vn`** dưới tên
   (cái chị đã sửa website ở `/analytics`) → bấm **Xem chi tiết →** ở góc dưới
   thẻ.
3. Trang mở ra là **form sửa dự án** (tên, website, ngôn ngữ…). **Cuộn xuống
   dưới cùng**, qua hết form. Ở đó có hai khung mới:
   - **"Ảnh từ Google Drive"** — dùng ở bước 8
   - **"Khách liên hệ → Google Sheets"** — có nút **Lập bảng**
4. Bấm **Lập bảng**. Chờ vài giây. Một khung vàng hiện ra với **hai dòng**:
   ```
   LEAD_WEBHOOK_URL=https://antigravity-seo-automation.vercel.app/api/v1/lien-he/…
   LEAD_WEBHOOK_TOKEN=…(64 ký tự)
   ```
   Bấm **chép** ở từng dòng, dán tạm vào Notepad. **Token chỉ hiện một lần** —
   đóng trang trước khi chép là phải bấm lập lại (bảng mới, token mới).
5. Trong khung đó có link **"Mở bảng vừa tạo"** — bảng đã nằm trong Google Drive
   của chị, tên *"Khách liên hệ — <tên dự án>"*.

Nếu bấm xong hiện chữ đỏ *"API Google Sheets chưa bật…"* → làm bước 2 trước.
Nếu hiện *"Chưa kết nối Google"* → làm bước 4 trước. Không thấy nút **Lập bảng**
(chỉ thấy chữ) → tài khoản đang đăng nhập không phải chủ sở hữu workspace.

**Bước 6 — Dán vào VPS rồi deploy.** ⚠️ *Đã làm rồi thì vẫn chạy lại `./trien-khai.sh` một lần — xem khung dưới.*

> **12/09 — vì sao bảng trống dù đã làm đúng:** bản website cũ không đưa dòng
> `LEAD_WEBHOOK_TOKEN` vào trong Docker (Docker không tự đọc `.env`, chỉ đọc
> những biến được liệt kê trong `docker-compose.yml`, và dòng đó bị quên). Đã sửa
> ở bản mới trên GitHub. Chạy `./trien-khai.sh` là lấy bản mới. Kiểm nhanh mà
> **không in token ra màn hình**:
>
> ```bash
> cd /opt/halongxanh
> grep -cE '^LEAD_WEBHOOK_URL="?https://' .env
> grep -cE '^LEAD_WEBHOOK_TOKEN="?.{20,}' .env
> ```
> Cả hai phải ra **1**. Sau khi `./trien-khai.sh` chạy xong:
> ```bash
> docker compose exec web sh -c 'test -n "$LEAD_WEBHOOK_TOKEN" && echo CO-TOKEN || echo THIEU-TOKEN'
> ```
> Phải ra **CO-TOKEN**. `trien-khai.sh` bản mới cũng tự cảnh báo vàng nếu địa chỉ
> không bắt đầu bằng `https://` hoặc thiếu token.

```bash
ssh root@103.7.40.145
cd /opt/halongxanh
nano .env
```

Tìm hai dòng `LEAD_WEBHOOK_URL=` và `LEAD_WEBHOOK_TOKEN=` (nếu chưa có dòng
`LEAD_WEBHOOK_TOKEN=` thì thêm), dán giá trị vừa chép. `Ctrl+O`, `Enter`,
`Ctrl+X`. Rồi:

```bash
./trien-khai.sh
```

Đợt deploy này mang theo luôn: dải liên kết chân trang cho 14 trang chưa vào chỉ
mục, `llms.txt` tên mới, và cơ chế **không đánh rơi khách** (webhook hỏng thì
giữ khách trong tệp trên VPS thay vì báo lỗi).

**Bước 7 — Thử một lượt.** Mở `halongxanh360.vn/lien-he`, để lại số của chính
chị. Trong vài giây phải có **một dòng mới** trong bảng (giờ Việt Nam, số điện
thoại giữ nguyên số 0 đầu).

Không có dòng thì **tải lại trang dự án** trong Antigravity — thẻ *"Khách liên hệ
→ Google Sheets"* có dòng **"Lượt gần nhất …"** nói đúng chuyện gì xảy ra:

| Thẻ ghi | Nghĩa là | Làm gì |
|---|---|---|
| "đã ghi vào bảng" | Chạy đúng | Không làm gì |
| "KHÔNG KÈM TOKEN" | Website trên VPS vẫn là bản cũ | Chạy lại `./trien-khai.sh` |
| "SAI TOKEN" | Dòng token trong `.env` chép thiếu / dính dấu cách | Dán lại đúng token rồi `./trien-khai.sh` |
| "Chưa nhận lượt nào" | Website chưa hề gọi tới | Kiểm dòng URL trong `.env` — phải bắt đầu `https://` |
| "Google từ chối — …" | Antigravity nhận được, Google không cho ghi | Đọc lý do; thường là kết nối lại Google |

Nút **"Gửi thử một dòng vào bảng"** thử riêng nửa Antigravity → Google, không cần
website. Nút ghi được mà form không ghi được → lỗi nằm ở phía VPS.

⚠️ **Có thể thấy thêm vài dòng ghi nguồn "halongxanh360.vn · gửi bù".** Đó là
**khách thật** đã để lại số từ lúc trang lên tới giờ — trước đây chưa có bảng nên
số của họ nằm trong một tệp trên VPS mà chưa ai mở. Lượt gửi thành công đầu tiên
làm website tự đẩy họ sang bảng. **Nên gọi lại những người này trước.**

**Bước 8 — Nối thư mục ảnh.** ✅ *Đã nối "Ảnh Hạ Long Xanh" (11/09), đã tải ảnh lên. 12/09: khung đọc cả thư mục con; **ảnh đã được gắn vào bài tự động** (tối đa 2 ảnh/bài, AI chọn từ danh sách). Giữ tệp `danh-sach-anh.csv` trong thư mục để chú thích ảnh là câu chị/tôi đã viết.* Ảnh đã gom
sẵn ở `D:\vinhomes_ha_long_xanh\.tmp\anh-cho-drive\` — **chọn hết (Ctrl+A) rồi kéo
thả vào thư mục Drive trên trình duyệt**: 60 ảnh đang dùng + thư mục con 27 ảnh gốc
+ tệp `danh-sach-anh.csv` (mô tả từng ảnh), 70,7 MB. Đã bỏ 6 ảnh trong danh sách
cấm. Hướng dẫn cũ: Cùng trang dự án → thẻ **"Ảnh từ Google Drive"** →
dán link thư mục (trên Drive: chuột phải thư mục → Chia sẻ → Sao chép đường liên
kết). Ảnh mới nhất hiện ngay. ⚠️ Việc **gắn ảnh đó vào bài đăng lên website
chưa làm** — cổng nhận bài của website chưa nhận ảnh; cần sửa hai kho và một
lần deploy. Chị muốn làm trước chủ nhật thì báo, tôi làm tiếp.

### 1. Thu hồi khoá OpenAI đã lộ

Khoá `sk-proj-77fD…` đã xuất hiện trong hội thoại và **đã được dùng 5 lần**. Bất
kỳ ai đọc được đoạn hội thoại đó đều tiêu được tiền của chị.

- **Vì sao cần chị:** chỉ chủ tài khoản thu hồi được.
- **Làm ở đâu:** platform.openai.com → API keys → Revoke.
- **Nếu chưa làm:** rủi ro tiền, và tôi không dùng khoá đó cho việc gì nữa.

### 2. Deploy VPS — ĐÃ XONG 11/09, còn đúng một cú bấm

Chị đã deploy (ảnh terminal 11/09): tệp khoá IndexNow sống, `npm run bao-bing`
gửi **31 địa chỉ, Bing nhận HTTP 202**, `og:site_name` trên trang thật đã là
"Hạ Long Xanh 360". Chuyển xuống bảng ✅.

**Cập nhật 21:30:** Google đã tự crawl trang chủ lúc 20:46 — sau deploy. **Không
cần Yêu cầu lập chỉ mục nữa.**

✅ **Đã deploy (đo khuya 11/09): dải chân trang và `llms.txt` tên mới đều đang
chạy trên trang thật.** Đoạn dưới giữ lại để biết đã làm gì.

**Có một đợt deploy mới đáng làm** (không gấp, gom khi tiện): dải liên kết chân
trang cho 9 phân khu + 5 dòng sản phẩm. Đo 11/09: 14 trang đó chỉ được 3–4/16
trang đã vào chỉ mục trỏ tới, trong khi bốn trang trên thanh điều hướng được
16/16 — và đúng 11/14 trang đó đang "đã phát hiện – chưa lập chỉ mục". Sau
deploy mỗi trang được 31 liên kết nội bộ. Kèm `llms.txt` sửa tên site.

Việc cũ bên dưới **đã xong**, giữ lại để biết đã làm gì:
Search Console → Kiểm tra URL → `https://halongxanh360.vn/` → Yêu cầu lập chỉ mục.

Ảnh chị gửi ghi "Trang đã lập chỉ mục" — đó là **bản cũ**, Google crawl trước
khi chị deploy, còn khai tên site là "Vinhomes Global Gate Hạ Long". Tên mới vừa
lên; Google chưa biết. Không bấm thì nó tự quay lại theo lịch — vài ngày tới vài
tuần. Bấm thì thường trong vòng một ngày. Bấm **"Xem trang đã thu thập dữ liệu"**
trước để thấy ngày crawl và tên cũ trong đó.

Lệnh deploy cho lần sau (`trien-khai.sh` tự `git pull`):

```bash
ssh root@103.7.40.145
cd /opt/halongxanh
./trien-khai.sh
```

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

**Chị hỏi đúng: "đổi của dự án nào?"** — ba trong năm dự án cùng địa chỉ
`.vercel.app` (HaHalongxanh3, hạ long xanh 1, hạ long xanh). Đó là lỗi của tôi
ở màn hình, đã sửa: `/analytics` giờ có **ô chọn dự án** ngay dưới tiêu đề
Search Console, mọi câu chữ gọi đúng tên dự án, và có link "sửa ô này" dẫn thẳng
tới dự án đang xem.

**Việc còn lại:**

1. Chọn **một** trong ba dự án `.vercel.app` làm dự án thật — cái chị đang chạy
   luồng đăng bài (gợi ý: *HaHalongxanh3*, cập nhật mới nhất 3/9). Sửa ô "URL
   website" của nó thành `https://halongxanh360.vn`.
2. Hai dự án còn lại: nếu chỉ là bản thử thì **Sửa → Lưu trữ**, để ô chọn dự án
   không còn ba mục trông giống nhau. Không bắt buộc, nhưng đỡ nhầm về sau.
3. Tải lại `/analytics`, chọn đúng dự án trong ô chọn. Không cần kết nối lại
   Google.

**Khối mới sẽ hiện ngay bên dưới: "Google đã lập chỉ mục trang nào"** — soi từng
địa chỉ trong sitemap bằng máy, thay cho việc chị vào Search Console bấm 31 lần.
Nó cho biết bao nhiêu/31 đã vào chỉ mục, trang nào chưa và Google nói gì, và
**trang chủ được crawl lần cuối lúc nào** — tức Google đã đọc tên site mới chưa.
Lần đầu mất 10–20 giây (soi 31 địa chỉ), sau đó nhớ 30 phút.

**Cập nhật 21:30 ngày 11/09 — cả hai khối đã chạm Google thật, chị đã chụp.**
Kết quả: property `sc-domain:halongxanh360.vn` · 0 clicks / 0 hiển thị (khoảng
đo kết thúc 08/09, **trước** ngày lập chỉ mục 09/09 — là lịch, không phải lỗi) ·
**16/31 địa chỉ đã vào chỉ mục** · trang chủ được Google crawl lúc **20:46
11/09, SAU deploy** — tức Google đã đọc tên site mới. Sitemap chị nộp lại: 31/31
đã khám phá.

**Mục này gạch được.** Việc còn lại là của thời gian và của mục 2 (deploy dải
liên kết chân trang cho 14 trang đang chờ crawl).

| Nếu thấy | Nghĩa là |
|---|---|
| Số thật ở bốn thẻ, và "N/31 địa chỉ đã vào chỉ mục" | ✅ Đã thấy 11/09 |
| "Website của dự án đang ghi một địa chỉ XEM THỬ" | Chưa sửa ô website của **dự án đang chọn** — kiểm ô chọn dự án |
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

*Cập nhật 11/09 sau khi chị chốt: trang Facebook 356k like không phải của chị —
bỏ. Zalo OA hoãn. Tập trung bán hàng, nên danh sách rút lại còn thứ ra khách.*

| # | Việc | Mất | Vì sao |
|---|---|---|---|
| 1 | **Request indexing trang chủ** (mục 2) | 10 giây | Google đang giữ bản cũ với tên cũ |
| 2 | **Search Console → Trang (Pages)** → chụp màn hình gửi tôi | 1 phút | Cho biết Google thật sự lập chỉ mục **bao nhiêu trong 31** địa chỉ |
| 3 | **Google Business Profile** — hướng dẫn từng bước ở `D:\vinhomes_ha_long_xanh\HUONG-DAN-GOOGLE-BUSINESS.md` (+ PDF) | 30 phút + xác minh | Vừa là kênh ra khách trên Maps, vừa là "reference on the web" Google cần. **Cần tên sàn + số chứng chỉ trước** (mục 10) |
| 4 | Gửi tôi link hồ sơ GBP sau khi xác minh | 1 phút | Tôi khai `sameAs` nối site ↔ hồ sơ. Cố ý **chưa** khai gì vì chưa hồ sơ nào mang đúng tên |

⚠️ **Một điều đáng biết về GBP** (chi tiết trong hướng dẫn): Google xếp môi giới
BĐS vào nhóm "individual practitioner", tên hồ sơ theo mẫu **`[Tên sàn]: [Tên
chị]`** — **không đặt được "Hạ Long Xanh 360"** vì video xác minh phải cho thấy
giấy tờ khớp tên hồ sơ, và không giấy tờ nào mang tên đó. Thương hiệu vẫn có
mặt qua ô website và phần mô tả; Google nối hồ sơ với site qua website, không
qua tên. Và chị đã xác minh site trong Search Console bằng cùng tài khoản, nên
có cửa **xác minh tức thì** không cần quay video.

⚠️ **Kỳ vọng thời gian, có số.** Google tự ghi: "crawling can take anywhere from
several days to several weeks". Với truy vấn ĐÚNG TÊN THƯƠNG HIỆU, sau khi cả
hai nửa xong, thường thấy trong **1–3 tuần** — vì không có đối thủ nào tên
"halongxanh360". Với truy vấn chung như "hạ long xanh giá bán" thì là chuyện
khác hẳn: Ahrefs đo chỉ 5,7% trang mới lọt top 10 trong một năm. Đừng lẫn hai
mục tiêu.

### 8. Lập Zalo Official Account — HOÃN theo ý chị (11/09)

Zalo phủ **77% dân số Việt Nam** (~79 triệu). Đây là **kênh chốt**, không phải
kênh tìm — mọi khách từ mọi kênh khác cuối cùng đều rơi vào Zalo. Lập miễn phí,
không phí duy trì.

### 9. Google Business Profile — hướng dẫn từng bước đã viết riêng

`D:\vinhomes_ha_long_xanh\HUONG-DAN-GOOGLE-BUSINESS.md` (+ PDF cùng tên). Mọi quy
tắc trong đó trích từ tài liệu Google, có ghi nguồn. Điểm chính:

- Tên hồ sơ: **`[Tên sàn]: [Tên chị]`** — quy tắc "individual practitioner".
- Ẩn địa chỉ (service-area business). Cấm hòm thư, văn phòng ảo. Bán kính ~2 giờ
  lái xe.
- Xác minh: thử **tức thì qua Search Console** trước (cùng tài khoản, cùng
  website). Không được thì video quay trực tiếp trong app, ≥30 giây, ba phần —
  phần ba là **giấy đăng ký kinh doanh sàn + chứng chỉ hành nghề**.
- ⚠️ Luật KDBĐS 2023 Điều 61: lập dưới pháp nhân sàn, không tư cách cá nhân tự do.

**Chặn bởi mục 10** — cần tên sàn và số chứng chỉ trước khi bắt đầu.

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

### 12. Vercel tự deploy — ĐÃ XÁC NHẬN 11/09

Ảnh chị gửi lúc 21:14 cho thấy `/analytics` bản mới (ô chọn dự án, khối "Google
đã lập chỉ mục trang nào") đang chạy trên Vercel — commit đẩy lúc ~21:10. Webhook
ăn. Chuyển xuống bảng ✅.

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

### 15. Bật lịch đăng bài tự động — điền một thẻ, dán một dòng *(đã dựng 12/09)*

Chị đã chốt: VPS gõ nhịp · giữ duyệt tay · chủ đề từ danh sách rồi Search
Console · **mỗi ngày một bài**. Đã dựng đúng thế, lên Vercel rồi. Cách chạy:

**Bước 1 — Điền thẻ (3 phút).** Antigravity → **Website của tôi** → dự án
`halongxanh360.vn` → **Xem chi tiết** → cuộn tới thẻ **"Lịch đăng bài tự động"**
(ngay dưới form sửa dự án):

| Ô | Điền gì |
|---|---|
| Bật lịch | tick |
| Giờ bắt đầu viết | giờ chị muốn bài **bắt đầu được viết** mỗi ngày (giờ VN). Bài xong sau ~10–20 phút, rồi chờ chị duyệt. Nên đặt **6:00** để sáng dậy là có bài chờ. |
| Nhà cung cấp AI | chỉ hiện nhà cung cấp chị **đã có key** ở trang API Keys. Chưa có thì thêm ở đó trước. |
| Chuyên mục | "Thị trường" cho bài chung; đổi khi cần |
| Mô tả doanh nghiệp / khách hàng | như ô cùng tên ở trang Quy trình — điền một lần |
| Danh sách chủ đề | **mỗi dòng một bài**. Cứ 5–7 chủ đề là đủ cho một tuần. Viết xong tự bỏ qua; hết danh sách thì tự lấy từ Search Console (ô tick bên dưới) |

Bấm **Lưu lịch**. Một khung vàng hiện ra với **một dòng dài** — **chỉ hiện
một lần**. Bấm **chép**. *(Từ vòng 23, ở chế độ Đơn giản thẻ này nằm **ngay
đầu** trang dự án; biểu mẫu tên/giọng văn gấp xuống cuối.)*

**Bước 2 — Dán vào VPS (1 phút).** *(12/09: chị đã lưu thẻ nhưng chưa có
crontab — `crontab -l` trả "no crontab for root". Làm bước này.)*

Trên thẻ bấm **Tạo mã mới** (mã cũ hết hiệu lực, không sao — chưa có gì dùng
nó). Khung vàng hiện **một lệnh dài** bắt đầu bằng `(crontab -l …` → bấm chép.
Rồi:

```bash
ssh root@103.7.40.145
```

Dán nguyên lệnh vừa chép → Enter. Lệnh in ra **1** là xong (nó tự bỏ dòng cũ
nếu có, thêm dòng mới, đếm lại). Không cần mở trình soạn thảo nào. Trong 10
phút, thẻ đổi thành *"Máy chủ kiểm lần gần nhất … (VPS)"*.

**Bước 3 — Thử ngay, không đợi sáng mai.** Trên thẻ bấm **"Chạy thử một bài
ngay"** (tốn ~8 lượt gọi AI bằng key của chị). Sau ~10–20 phút tải lại trang:
mục **"Lượt gần đây"** ghi *chờ duyệt* kèm link → mở `halongxanh360.vn/duyet-bai`
để đọc và duyệt. Nếu ghi *dừng — …* thì đọc lý do ngay dòng đó (thường là key
AI hết hạn mức, hoặc website từ chối vì câu chạm luật cấm).

**Đọc thẻ thế nào:** dòng đầu **"Hôm nay: …"** nói một câu — đang viết bước
mấy / đã xong chờ duyệt (kèm nút mở trang duyệt) / dừng vì sao / máy chủ chưa
kiểm. Cùng câu đó hiện ở trang **Bắt đầu**, khối *"Hôm nay máy đã làm gì"* —
mỗi sáng mở trang đó là đủ. Dòng *"Máy chủ kiểm lần gần nhất …"* cho biết VPS có gõ không.
Chưa có dòng đó sau 15 phút dán crontab → dòng crontab dán sai, hoặc mã đã đổi
(bấm "Tạo mã mới" là mã cũ chết ngay — phải dán lại).

**Thẻ ghi "chờ duyệt" mà `/duyet-bai` in "Hàng chờ trống":** trước 12/09 màn
đó in "trống" cả khi không đọc được cơ sở dữ liệu (Neon vừa ngủ dậy). Sau khi
`./trien-khai.sh`, màn sẽ báo lỗi kèm lý do thay vì "trống" — bấm **Mở hàng
chờ** lại sau vài giây. Link "chờ duyệt" trên thẻ giờ mở thẳng hàng chờ; địa
chỉ bài chỉ mở được **sau khi duyệt** (trước đó 404 là cố ý).

**Nếu lượt dừng với "Site TỪ CHỐI vì nội dung chạm luật cấm":** đó là cổng
chặn của chính website (cam kết lợi nhuận, "nhất" không nguồn, giá thấp nhất,
chiết khấu bí mật, số điện thoại, link Drive). Từ 12/09 máy tự viết lại **một
lần** kèm đúng câu bị chạm; vẫn bị từ chối thì dừng trong ngày và hôm sau chọn
chủ đề khác. Chị không phải làm gì — nhưng nếu thấy lặp nhiều, gửi tôi câu bị
chạm (hiện ở dòng đỏ trong "Lượt gần đây").

**Nếu lượt đứng im** (một bước "đang chạy" quá 10 phút, không nhịp gõ mới):
1. Bấm **Gõ tiếp ngay** trên thẻ — bước kẹt quá 15 phút được đánh dấu hết giờ
   và thử lại; thẻ báo ngay đã tạo bước nào.
2. Kiểm crontab: `crontab -l | grep -c lich-dang` phải ra **1**. Ra 0 là chưa
   dán → lượt nào cũng có thể chết như lượt 02:30 hôm nay. Mất dòng crontab thì
   bấm "Tạo mã mới" để lấy lại (mã cũ hết hiệu lực).
3. Vẫn kẹt lần nữa thì chụp cho tôi màn **Vercel → dự án → Deployments → bản
   mới nhất → Functions/Logs** quanh giờ kẹt — tôi không đọc được log đó từ máy
   này.

**Không có cái gì tự lên trang.** Mọi bài vẫn nằm ở `/duyet-bai` tới khi chị
bấm duyệt. Muốn tạm dừng: bỏ tick "Bật lịch" → Lưu.

**Tạo website:** tầng 1 đã dựng (mục 19).

### 19. Trình dựng website — tầng 1 đã lên, tầng 2 cần chị chốt MÁY NÀO *(12/09)*

**Đã có gì (cập nhật vòng 24):** ở **Quy trình** chọn luồng **"Dựng website —
bản nháp"**, điền *Mô tả doanh nghiệp* (kể website để làm gì, cho ai) + tên +
địa chỉ web → Chạy. **Bốn bước**: **Ý định** → **Kiến trúc** (những trang nào,
mỗi trang ghép từ khối nào trong danh mục đã chạy thật trên halongxanh360 —
máy chỉ được *chọn*, không được bịa khối) → **Hệ thiết kế** (4 màu, cặp font
có tiếng Việt, độ dễ đọc tính thật) → **Viết chữ** (mỗi trang một lượt gọi;
ô *"Sự thật của bạn"* — giá, giờ mở, điện thoại — máy **chỉ** được dùng con số
trong đó, để trống thì viết câu không có số).

Chạy xong, vào **trang dự án → thẻ "Website dựng sẵn"**: nó liệt kê các trang,
những dữ liệu thật còn thiếu, và có nút **Tải mã nguồn (.zip)**. Nút chỉ bật
khi chị điền **số điện thoại thật** — mọi nút gọi trong mã dùng số đó, và máy
không bao giờ tự bịa số điện thoại.

Tệp nén giải ra là một dự án Next.js đầy đủ: `npm install` rồi `npm run dev` là
xem được trên máy; đưa cả thư mục cho người kỹ thuật là đưa lên mạng được. Tôi
đã chạy trọn đường này bằng máy (26 tệp, `next build` đạt) — **chưa** gọi AI
thật vì chưa được duyệt tiêu tiền. Tốn ~4 lượt gọi AI cho một website.

**Còn thiếu — xem trước ngay trong app, và dựng trên máy chủ — không chạy được trên Vercel**
(giới hạn 300 giây, ổ chỉ đọc; đã xác minh trong nghiên cứu 09/09). Nó phải
chạy trên một máy có Node: **máy tính của chị**, hoặc **VPS** (cạnh website).
Chị chọn:

| Chọn | Được | Mất |
|---|---|---|
| **VPS** (đề xuất) | Chạy từ điện thoại được: bấm trong Antigravity, VPS dựng, trả link xem trước | VPS đang chạy website; dựng thử nặng có thể làm website chậm vài phút. Cần thêm ~2 GB đĩa. |
| Máy tính của chị | Không đụng website | Phải mở máy, chạy một lệnh; không làm từ điện thoại được |

Trả lời một chữ (*VPS* hoặc *máy tôi*) là tôi làm tiếp.

### 20. Đưa "khoá duyệt bài" cho người duyệt — nếu không phải chị *(12/09)*

Màn `halongxanh360.vn/duyet-bai` xin **khoá duyệt bài** mỗi lần mở (cố ý không
nhớ — khoá này cho phép đăng lên trang). Khoá là giá trị `INGEST_TOKEN` trong
`.env` trên VPS. Nếu người duyệt là chị thì không có việc gì. Nếu là người
khác: gửi khoá cho họ **một lần qua kênh riêng** (không nhắn trong nhóm), bảo
cất ở ứng dụng ghi chú/mật khẩu trên điện thoại. Muốn không phải dán khoá mỗi
lần thì cần làm **phiên đăng nhập riêng cho màn duyệt** — nói tôi nếu muốn.

### 18. Ảnh rạp xiếc — ĐÃ GỠ, và ba ảnh AI "đã gỡ" hôm 10/09 hoá ra vẫn chạy *(12/09)*

Chị chốt gỡ và nói "khả năng phải tự tạo" ảnh thay. **Tôi không tạo ảnh AI
thay vào** — ba tấm bị gỡ ngày 10/09 lọt vào đúng bằng cách đó, và khách tinh
mắt nhìn ra ngay. Thay vào đó nhóm "Trong công viên chủ đề" còn 3 ảnh thật
(Ai Cập, Babylon, quảng trường lễ hội); câu dẫn đếm số giờ tự đọc từ mảng.

**Phát hiện trong lúc làm:** ba ảnh AI "đã gỡ" ngày 10/09 **vẫn chạy trên trang
chủ** (dải ảnh trượt "một ngày ở đây") và vẫn nằm trong kho ảnh gắn cho bài
"Sự kiện" — tôi đo trên trang thật. Lần gỡ hôm đó chỉ sửa `/tien-ich`, và bộ
kiểm không đỏ khi ảnh cấm được dùng. Đã sửa cả hai chỗ bằng phối cảnh gốc của
chủ đầu tư; bộ kiểm giờ đỏ khi ảnh cấm được gọi tên ở bất kỳ đâu.

**Lên trang khi chị chạy `./trien-khai.sh`** (cùng đợt với mục 0 bước 6). Nếu
chị vẫn muốn có một ảnh rạp xiếc, cách đúng là xin ảnh từ chủ đầu tư (mục 6) —
tôi không đưa ảnh AI lên trang nữa.

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
| **Deploy VPS vòng 8+10** | 11/09 | Tệp khoá IndexNow sống · `bao-bing` gửi 31 địa chỉ, Bing nhận 202 · `og:site_name` trên trang thật = "Hạ Long Xanh 360" |
| **Vercel tự deploy** (mục 12 cũ) | 11/09 | UI mới lên Vercel ~4 phút sau push |
| **Nộp lại sitemap** | 11/09 | 31/31 đã khám phá, đọc 11/09, Thành công |
| **Sửa website dự án + mở /analytics** (mục 7) | 11/09 | Hai khối chạm Google thật: 16/31 đã vào chỉ mục, trang chủ crawl 20:46 sau deploy |
| **Bật API Search Console** | 11/09 | Đã Enable trong project `antigravity-staging`. 403 biến mất, Google trả lời thật: tài khoản quản lý `sc-domain:halongxanh360.vn` |
| **Lập bảng khách + nối thư mục Drive** (mục 0, bước 1–5 và 8) | 11/09 | App đã *In production* · "7 quyền đã cấp" · bảng "Khách liên hệ" đã lập · thư mục "Ảnh Hạ Long Xanh" đã nối và có ảnh |
| **Nguồn hai ảnh cách ly** (mục 17 cũ) | 10/09 | **Cả hai giữ cấm.** `giai-tri-thuy-cung` là ảnh CHỤP bể Kuroshio, thuỷ cung Churaumi ở Okinawa (Nhật Bản) — ba con cá nhám voi trong một bể, Việt Nam không nơi nào nuôi được. `giai-tri-nha-hang-duoi-nuoc` lấy từ Drive chủ đầu tư nhưng Drive đó có lẫn ảnh chiếu ý tưởng không thuộc dự án |

---

## Ghi chú về cách tôi làm việc từ 09/09

Chủ dự án đã chuyển sang **vòng lặp tự chủ**: tôi tự đặt câu hỏi, tự nghiên cứu,
tự làm, tự kiểm, tự audit rồi quay lại — không dừng chờ. Mọi việc cần chị đều rơi
vào tệp này thay vì nằm rải trong các câu trả lời.

Những giới hạn an toàn **không** đổi: không bịa số liệu, không đăng thứ chưa có
nguồn, không tiêu tiền API cho việc chưa được duyệt, không đụng vào bí mật.

Nhật ký chi tiết từng phiên: `NHAT-KY.md` ở gốc mỗi kho.
