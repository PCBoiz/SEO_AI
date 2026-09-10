# Nhật ký — Antigravity OS

Mới nhất ở trên. Đọc tệp này **trước khi bắt tay vào việc**, đừng suy lại từ đầu
từ mã nguồn.

Sổ này KHÔNG chép lại git log — git đã ghi từng thay đổi và lý do rồi. Sổ giữ
đúng phần git không giữ được: trạng thái bắc qua nhiều phiên, việc nằm ngoài
kho, và những kết luận đã kiểm chứng để khỏi kiểm lại.

⚠️ `docs/implementation-status.md` tự nhận là "sổ chạy" nhưng dừng ở 2026-07-23
trong khi kho vẫn được sửa tới cuối tháng 8. Nó là ảnh chụp kiến trúc, KHÔNG
phải nhật ký — đừng tin phần trạng thái trong đó.

Kho anh em: `D:\vinhomes_ha_long_xanh` (halongxanh360.vn) — nơi bài được đăng tới.

---

## 10/09/2026 — VÒNG 8

### Quyền Google được cất vào kho từ đầu, mà không dòng mã nào đọc ra

Chủ dự án bấm "Cấp thêm quyền", huy hiệu `/analytics` chuyển xanh, và tôi đi kiểm
xem số liệu có chảy vào chưa. **Không có gì chảy vào cả, và không thể có.**

Bốn thẻ số Search Console trên trang đó viết cứng ngay trong JSX:

```
[analytics/page.tsx:172]  value="—"  sub="cần kết nối"
```

Không đọc từ đâu. Khối hướng dẫn "Bấm nút bên dưới, chọn tài khoản Google" cũng
hiện vĩnh viễn — nằm ngay dưới huy hiệu xanh "Đã kết nối", hai câu trên cùng một
màn hình nói ngược nhau, và câu sai là câu to hơn.

Tra cả kho: `searchconsole|webmasters|searchanalytics` khớp **đúng 3 dòng, cả 3
nằm trong tệp khai báo quyền**. `completeOAuth` mã hoá rồi cất token vào
`oauth_connections`, và chỗ duy nhất đọc lại là chính nó — chỉ để giữ
`refreshToken` cũ khi kết nối lần nữa. Không Drive, không Sheets, không Search
Console. **Không có cả cơ chế làm mới token** (`grant_type=refresh_token` không
xuất hiện ở đâu).

⚠️ Chỗ đau nhất: chú thích ở ĐẦU chính tệp đó đã cảnh báo đúng lỗi này cho phần
bên trên — *"một nút không bao giờ bật thì không phải nút, nó là một tấm biển"* —
rồi phần dưới lặp lại y nguyên với bốn thẻ số. **Người viết ra bài học đó vẫn mắc
lại nó cách vài chục dòng.** Ghi lại để nhớ rằng viết ra một nguyên tắc không
bằng có một phép kiểm.

**Đã dựng phần còn thiếu** — bốn lớp, tách ra để test được phần đáng test:
`google-token.server.ts` (lấy token, làm mới, và nhận ra `invalid_grant` để đánh
dấu kết nối đã chết thay vì để giao diện xanh mãi) · `domain/seo/search-console.ts`
(thuần tính toán) · `lib/seo/search-console.server.ts` (gọi API, trả **sáu** trạng
thái) · `page.tsx`.

**Bẫy tính toán đã cài test để khoá lại:** vị trí trung bình phải tính theo TRỌNG
SỐ hiển thị. Một trang 1 lượt ở vị trí 1 và một trang 999 lượt ở vị trí 90 ra
**89,9** — trung bình cộng ra 45,5, nghe hợp lý nên không ai nghi. Cùng loại lỗi
với CTR: trung bình hai CTR (100% và 0%) ra 50%, còn CTR thật là 0,1%.

### Ba mục trong VIEC-CAN-LAM.md hoá ra đã xong — kiểm mới biết

Tệp bàn giao ghi "redeploy VPS" là việc gấp nhất cả tệp. **Sai.** Đo trang thật:
tiêu đề trang chủ đã là bản vòng 7, `sitemap.xml` 31 địa chỉ · **0 `lastmod`** (bản
vòng 6), `FAQPage` chỉ còn ở trang chủ, ba ảnh AI đã biến khỏi `/tien-ich`. Ba
dấu vết từ ba commit khác nhau đều khớp.

**Bài học lặp lại lần thứ hai:** ngày 09/09 một báo cáo viết tay đã bảo chủ dự án
đi làm ba việc đã xong. Hôm nay tệp bàn giao của CHÍNH TÔI làm đúng như vậy. Trạng
thái ghi trên giấy hỏng nhanh hơn người ta tưởng — **gõ cửa trang thật trước khi
giao việc cho ai.**

### Tuyến IndexNow đầu tiên chạy đúng, và lấy mất trang 404 của cả site

Bản đầu dựng tuyến động `src/app/[khoaIndexNow]/route.ts` đọc khoá từ biến môi
trường. Thử: tệp khoá trả 200, khoá sai trả 404. Nhìn thì đạt.

Nhưng tuyến động **một đoạn ở GỐC** bắt luôn mọi địa chỉ lạ. Đo trên bản dựng
thật:

```
/khong-ton-tai/abc   (hai đoạn, không bị bắt)   404 · 40.708 byte HTML
/khong-ton-tai-dau   (một đoạn, bị bắt)         404 ·      0 byte
```

Mọi địa chỉ gõ sai một đoạn — `/du-a`, `/gia`, `/tien-ic` — nhận một trang TRẮNG.
`notFound()` không cứu được: tài liệu Next 16 ghi rõ nó *"serves a 404 to the
caller"*, tức 404 trần chứ không dựng giao diện 404.

**Đây là lỗi tôi suýt giữ lại**, vì cách sai đó chạy đúng ở đúng thứ tôi đi thử.
Chỉ lộ ra khi thử một thứ mình KHÔNG định làm.

Thay bằng tệp tĩnh trong `public/`. Khoá IndexNow vốn không phải bí mật — cả cơ
chế của nó là "tệp này đọc được công khai trên tên miền". Giấu vào biến môi trường
không thêm an toàn nào mà tạo hai nguồn sự thật.

### Hai việc "cần mắt người" — phiên này xem được, và cả hai đều ra kết luận

- **Hai ảnh nghi trùng: đúng là một ảnh.** Khác đúng một điểm — `vbm-hoan-thien-02`
  còn nguyên dải chữ *"(*) Thông tin hình ảnh chỉ mang tính chất minh hoạ"*, bản
  kia đã cắt theo quy ước `CAT_CHU_CHAN`. Và alt của nó ghi *"Dãy nhà HOÀN THIỆN
  tại Vịnh Bình Minh"* — giới thiệu một phối cảnh như công trình đã xây xong, ngay
  trên trang giá trị tài sản. **Chính dòng chữ in trên mặt ảnh đã nói ngược lại.**
- **`giai-tri-thuy-cung` là bể Kuroshio, thuỷ cung Churaumi ở Okinawa** — ba con
  cá nhám voi trong một bể, khung hình được chụp nhiều nhất thế giới. Việt Nam
  không nơi nào nuôi được cá nhám voi. Không phải "chưa xác minh" nữa.

### Bốn lỗi tồn từ vòng 6, và một cái trong đó chạy mãi

Cái đáng sợ nhất không phải `while` không trần, mà `if (!poll.ok) continue;` ngay
trong nó: phiên hết hạn trả 401 → vòng cứ 2,5 giây gõ cửa một lần, **mãi mãi**, và
người dùng không thấy một chữ nào. Đường này gặp thường xuyên hơn đường "job kẹt"
rất nhiều.

Zalo: `recipient: { target: {} }` rỗng. Ba câu trong cùng một hàm nói ba việc khác
nhau — mô tả module bảo "tạo bài viết", chú thích bảo "broadcast", mã gọi
`/message/cs` là cửa nhắn tin 1–1. Không cái nào khớp cái nào.

Module 11 sinh JSON-LD không qua bước kiểm nào — mà đó là module DUY NHẤT sinh ra
thứ được dán thẳng vào `<head>` trang thật. Đã thêm `validJsonLd`. Cố ý không kiểm
sâu schema.org: mỗi cảnh báo sai là một lượt gọi lại model, tức tiền thật.

### Số đo cuối vòng

| | Trước vòng 8 | Sau |
|---|---|---|
| Test Antigravity | 199 | **220** |
| Phép kiểm halongxanh360 | 10/10 | **11/11** |
| Lint cả hai kho | site đỏ 2 cảnh báo | **cả hai sạch** |

Cổng lint kho site đang đỏ vì hai tệp nháp trong `.tmp/` — `.gitignore` bỏ qua thư
mục đó nhưng `globalIgnores` của eslint ghi đè danh sách mặc định nên không bỏ.
Một cổng đỏ vì lý do không liên quan là cổng người ta **tắt**, không phải sửa.

### Vòng sau nên làm

- `/analytics` mới chưa được nhìn bằng mắt trên trình duyệt — mới chỉ typecheck,
  lint và test. Cần mở thật.
- Bốn thẻ số lấy dự án hoạt động ĐẦU TIÊN. Có hai dự án trở lên thì cần ô chọn.
- `layAccessTokenGoogle` đã có nhưng Drive/Sheets vẫn chưa ai gọi — hai quyền đó
  vẫn đang xin mà không dùng.

## 09/09/2026

### Vòng lặp dựng web ĐÃ CHẠY ĐƯỢC THẬT (09/09) — `8d92690`

Làm phần rủi ro nhất trước mọi thứ khác. Ba con số đo được, dùng để quyết định
thiết kế:

```
  npm install       ~8 phút lần đầu · 0.0s các lần sau (giữ node_modules)
  tsc + next build  7–11 giây
  next dev lên      2,9–3,7 giây
```

Nghĩa là vòng sửa-xem mất **vài giây**, không phải vài phút. Cảm giác "sửa là
thấy ngay" giữ được. `node_modules` của một dự án Next.js là **382 MB** — con số
này xác nhận `/tmp` 500 MB của Vercel là vừa đủ chật, đúng như đã dự đoán.

**Ba lỗi đã vấp, cả ba đều âm thầm — chú thích trong `moi-truong-may.ts` giữ
nguyên lý do, đừng xoá:**

1. `kill()` trên Windows với `shell: true` chỉ giết `cmd.exe`, để lại `next dev`
   là CHÁU còn sống và giữ cổng. Kịch bản chạy xong hết các bước rồi **treo** —
   nhìn từ ngoài không phân biệt được với "đang chạy dở".
2. Vá bằng `taskkill /T` **vẫn không ăn**, vì `cmd.exe` đã thoát trước nên cây
   tiến trình đứt. Đo thật: còn ba tiến trình Node sống sau khi xong. Cách chữa
   đúng không phải giết khéo hơn mà là **đừng đẻ ra cây** — gọi thẳng
   `node <tệp.js>`, khi đó pid chính là tiến trình cần giết.
3. Không bắt `stdout` của dev server nên khi nó không lên chỉ báo "không lên sau
   120 giây". Thực ra Next đang báo rõ nguyên nhân (một tiến trình dev khác giữ
   cùng thư mục `.next`) nhưng lời báo đó rơi vào hư không.

**Khuôn mẫu đã trích:** 41 component từ halongxanh360 →
`src/data/khuon-mau-halongxanh360.json`. 19/41 có chú thích giải thích VÌ SAO,
13/41 có khai báo props. Đọc bằng trình biên dịch TypeScript chứ không bằng
regex — regex sẽ chạy đúng trên 35 tệp rồi âm thầm bỏ sót 5 tệp.

**Phát hiện phụ:** Next.js 16 tự ghi ra `AGENTS.md` và `CLAUDE.md` khi cài. Đó là
nguồn gốc `AGENTS.md` trong cả hai kho, và nghĩa là mọi dự án sinh ra sẽ tự mang
theo lời cảnh báo "This is NOT the Next.js you know".

### Trình dựng website — ba quyết định đã chốt (09/09)

1. **Công cụ nội bộ**, chỉ 2 người dùng → bỏ hẳn gói tháng, hạn mức, đa người thuê.
   Toàn bộ phần tính toán quy mô ở `nghien-cuu-luu-tru-va-xem-truoc.md` mục 4 giữ
   lại để tham khảo nhưng **không phải làm**.
2. **Chạy được cả trên Vercel lẫn trên máy.**
3. **Trang sinh ra dùng Next.js + Tailwind** như halongxanh360.

Quyết định 3 làm việc xem trước khó hẳn lên, và đây là ràng buộc cứng đã xác minh:
**Vercel KHÔNG chạy được `npm install` + `next build` trong hàm** — hệ thống tệp
chỉ đọc trừ `/tmp` 500 MB, hàm tối đa 60 giây trên Hobby. Không tối ưu được, phải
đi đường khác.

Lời giải: một giao diện `MoiTruongDung`, hai bản hiện thực — tiến trình con khi
chạy trên máy (localhost thật, HMR, miễn phí), Vercel Sandbox khi chạy trên Vercel
(Hobby cho 5 giờ CPU/tháng ≈ 60 phiên xem trước, chạy được `npm run dev`).

Chi tiết: `docs/nghien-cuu-xem-truoc-va-skills.md`.

**Phát hiện đáng giá nhất về skills:** shadcn MCP cho model **tra kho component
thật** thay vì nhớ — cùng một bệnh với việc mô hình nhớ sai năm hiện tại, cùng một
thuốc. Và **nguồn bổ trợ tốt nhất không nằm trong 11 nguồn**: chính kho
halongxanh360 có 40 component đã chạy production, đúng ngành, đúng tiếng, đã qua
kiểm duyệt của chủ dự án.

### VÒNG 7 (10/09) — nghiên cứu GEO/SEO, và bàn giao phiên

Chủ dự án đổi sang phiên mới để gửi ảnh được. Đã lập `BAN-GIAO-PHIEN.md` (+ PDF)
để phiên mới bắt kịp trong 5 phút.

**Ba kết luận nghiên cứu đáng nhớ** (chi tiết ở `KE-HOACH-LEN-TIM-KIEM.md` bên
kho halongxanh360):

1. **"GEO" chủ yếu vẫn là SEO tốt.** Tổng hợp 54 nghiên cứu: thứ hạng tìm kiếm
   9,4/10, JSON-LD chỉ 5,6, **llms.txt 2,0 — thấp nhất trong 23 yếu tố**.
2. **Bất động sản là ngành AI Overviews xuất hiện ít nhất** (4,48–5,8%), và người
   dùng chỉ bấm link trong đó 1% số lần.
3. **FAQ schema bị dữ liệu bác bỏ** — nhóm dùng nhiều nhất thua 10 lần.

⚠️ **Tự hiệu chỉnh, ghi lại để không tự lừa mình:** khối `DuLieuQuyCan` tôi thêm
ở vòng 6 nằm ở mức **trung bình** về tác động, không cao như tôi tưởng lúc bắt
tay. Phần đáng giá của nó không phải bản thân JSON-LD (5,6/10) mà là số liệu cụ
thể có mốc thời gian (8,3/10). Bản vá `FAQPage` vẫn đúng nhưng vì lý do **tuân
thủ chính sách**, không phải vì thứ hạng.

**Việc có tác động cao nhất lại là thứ nhỏ nhất:** tên miền `halongxanh360.vn` mà
0/17 tiêu đề có chữ "Hạ Long Xanh". Đã sửa — "Vinhomes" 2/17 → 17/17.

**Bốn việc mới cho chủ dự án** đã vào `VIEC-CAN-LAM.md` (giờ 17 mục): nộp Bing
Webmaster (Bing không tìm thấy trang kể cả khi tra tên thương hiệu, mà Bing cấp
dữ liệu cho ChatGPT Search), lập Zalo OA, Google Business Profile kèm cảnh báo
Luật KDBĐS 2023 Điều 61, và gửi số chứng chỉ hành nghề.

**Dọn:** xoá một tệp rỗng tên `html` ở gốc kho — do một lệnh chuyển hướng lạc của
tôi sinh ra.

### Vì sao gửi ảnh bị API từ chối (10/09) — đã tìm ra, đừng điều tra lại

**Triệu chứng:** từ giữa phiên trở đi, mọi ảnh đều bị từ chối kèm thông báo
*"At least one of the image dimensions exceed max allowed size for many-image
requests: 2000 pixels"*. Chủ dự án nói bình thường không bị.

**Thông báo lỗi đó gây hiểu nhầm, và tôi đã mắc bẫy ba lần** — thu ảnh xuống
1200px, rồi 900px, rồi 760px, vẫn bị. Thí nghiệm quyết định: tạo một PNG
**120×60, nặng 192 byte** — vẫn bị từ chối với đúng thông báo đó. Một tấm ảnh
120 pixel không thể "vượt 2000 pixel".

**Lời giải thích khớp mọi quan sát:**

Quy định của API là: một yêu cầu chứa **trên 20 ảnh** thì MỖI ảnh phải ≤ 2000px
cạnh dài (dưới 20 ảnh thì giới hạn nới tới 8000px). Hội thoại này đã tích **401
khối ảnh**. Và trong số đã nạp từ trước có những tấm **2560px** (ảnh phối cảnh
đọc ở vòng audit, và ảnh chụp màn hình chủ dự án gửi).

Nghĩa là ngưỡng 20 ảnh bị vượt → luật ≤2000px kích hoạt cho **cả yêu cầu** →
những ảnh 2560px đã nằm sẵn trong lịch sử vi phạm → **mọi ảnh mới đều bị từ
chối bất kể kích thước của chính nó**.

Đầu phiên ảnh gửi bình thường vì lúc đó chưa quá 20 ảnh. Không phải lỗi máy chủ,
không phải lỗi tệp ảnh.

**Cách xử:**
- Cần gửi ảnh thì **mở hội thoại mới** — lịch sử sạch, ngưỡng đặt lại.
- Trong phiên dài, giữ mọi ảnh **dưới 2000px** ngay từ đầu thì ngưỡng không bao
  giờ bị kích hoạt. `scripts/thu-nho-anh.mjs` bên kho halongxanh360 giờ mặc định
  1200px và ép `deviceScaleFactor: 1` — đủ an toàn.
- Hệ quả còn treo: hai ảnh nghi trùng ở mục 12 của `VIEC-CAN-LAM.md` vẫn cần mắt
  người, vì tôi không xem được trong phiên này.

### VÒNG 6 (10/09) — chia tác tử, và ba lỗi chúng tìm ra

Chủ dự án gửi một bản "Báo cáo dự án" do trợ lý khác soạn và bảo chia tác tử.
Chạy ba tác tử song song: audit module Antigravity, audit GEO trang thật, tra
skills. Tôi kiểm lại từng phát hiện trước khi sửa — không sửa theo lời kể.

#### Bản báo cáo kia SAI bốn chỗ, ba chỗ nguy hiểm
Nó bảo `llms.txt` "chưa làm", `robots.txt` và `sitemap.xml` "không xác nhận được"
— **cả ba đang chạy thật, HTTP 200.** Làm theo là đi làm lại việc đã xong. Và
"122 test" trong khi thật ra 198. Đã ghi đính chính vào `VIEC-CAN-LAM.md`.

#### Đã sửa trong kho này
1. **Đăng bài HAI LẦN.** Luồng `article_publish` đã kết thúc bằng bước đăng, mà
   `pipeline-runner` lại cộng thêm bước đăng nữa. Idempotency không cứu được vì
   mỗi lượt sinh `randomUUID()` mới. **Hàng chờ duyệt của trang thật nhận hai bài
   trùng mỗi lần chạy trọn gói** — và điều kiện xảy ra rất dễ gặp: chỉ cần chọn
   đúng luồng đó và dự án nối đúng một nơi đăng (nên tự chọn sẵn). Không cần ai
   bấm nhầm.
2. **`registeredModuleKeys` thiếu 2 module** (`siteScanModule`, `vinhomesPublishModule`)
   trong khi kho gọi `registerModuleDefinition` 19 lần. Mảng này không dùng lúc
   chạy nên **không có gì hỏng** — chỉ mọi chỗ ĐẾM module là đếm hụt. Chính bộ
   báo cáo tự sinh của tôi báo 17. Một con số sai trên giấy thì không ai phát
   hiện được bằng cách dùng thử. Đã thêm test khoá lại.

#### Bộ sinh báo cáo `npm run bao-cao`
Chữa gốc chuyện "báo cáo viết tay rồi cũng cũ": đếm lại từ mã nguồn và gõ cửa
trang thật mỗi lần chạy. Nó **tự phơi ra bốn lỗi đo của chính nó** ngay lần đầu:
bắt chữ "warning" trong đầu ra npm (mà dòng `--max-warnings=0` có sẵn chữ đó);
đếm module cả ngoài mảng đăng ký; đếm ký tự thay vì byte (tiếng Việt lệch ~20%);
và lấy lần khớp ĐẦU của "9/9 phép kiểm" — vốn là dòng của một phép kiểm con, chứ
không phải dòng tổng kết.

#### Việc phải chuyển cho chủ dự án (đã vào `VIEC-CAN-LAM.md`)
- **Migration 0004 nặng hơn tài liệu mô tả rất nhiều.** Tài liệu gọi nó là tính
  năng "ghim kết quả". Thực tế `postgres-schema.ts` khai `pinnedAt` và
  `neon-module-job-repository` gọi `.select()` trần ở 6 chỗ → Drizzle liệt kê mọi
  cột, gồm `pinned_at`. **Thiếu cột thì MỌI thao tác đọc/ghi `module_jobs` trên
  Neon đều lỗi** — tạo job, poll, nối luồng, trang kết quả. Không phải tính năng
  phụ, là điều kiện sống của cả engine.
- **`.env.local` có `VINHOMES_INGEST_TOKEN` và `OPENAI_API_KEY` mỗi khoá hai lần,
  hai giá trị khác nhau.** dotenv lấy giá trị cuối. Tôi không mở tệp đó.

#### Chưa sửa, ghi lại để vòng sau làm
- **Module 15 (Zalo) không đăng được kể cả có token**: `recipient: { target: {} }`
  rỗng, mà endpoint `/message/cs` bắt buộc `user_id`. Khẳng định "chỉ cần token"
  là sai — cần sửa mã.
- **Module 11 sinh JSON-LD không qua bước kiểm nào** — không khai `validate:`. Mã
  schema dán vào `<head>` của khách có thể sai cú pháp mà không ai biết.
- Vòng poll trong `pipeline-runner` không có trần lặp.
- `pipelines/page.tsx` nhúng cứng tên module đăng → đổi tên là cả trang 500.

#### Skills đáng thêm (tra bởi tác tử, chưa làm)
`@adobe/structured-data-validator` (Apache-2.0, miễn phí) cắm vào `validate:` của
module 11 — bịt đúng lỗ trên. `SiteOne Crawler` (MIT, một binary) quét cả site,
xuất JSON, dùng được cho cả chốt kiểm chứng trang sinh ra. `textlint` (MIT) biến
tiêu chuẩn "cắt chữ thừa" từ tài liệu người đọc thành chốt máy chạy.
**Không tìm được gì đáng dùng** cho: nguồn dữ liệu bất động sản mở Việt Nam, và
bộ dò văn bản AI tiếng Việt (mọi phương pháp đều trượt với Claude/GPT-4o/DeepSeek).

### VÒNG 5 — bộ chuyển markdown→PDF, và một lỗi im lặng kiểu Windows

Chủ dự án cần một tệp PDF gom mọi việc cần họ làm. Viết `scripts/md-sang-pdf.mjs`
(tự dựng thay vì thêm thư viện markdown — kho chỉ dùng vài cú pháp).

**⚠️ Bản đầu HỎNG NẶNG mà nhìn không ra.** PDF vẫn in ra, đúng tên tệp, đủ chữ,
đúng số trang — nhưng **không một tiêu đề hay bảng nào**, tất cả thành `<p>`.

Nguyên nhân: tệp trên Windows lưu bằng **CRLF**. Tách dòng bằng ký tự xuống dòng
thường để lại ký tự "về đầu dòng" ở cuối mỗi dòng, và trong JavaScript **dấu chấm
trong biểu thức chính quy không khớp ký tự đó** — nên mọi biểu thức kết thúc bằng
neo cuối dòng đều trượt.

**Phát hiện được vì ĐẾM phần tử dựng ra rồi đối chiếu markdown gốc**: 6 dấu `##`
→ 0 thẻ `h2`. Nhìn lướt thì không thấy. Đã đưa phép đối chiếu đó **vào chính bộ
chuyển** — lệch thì nó dừng, không in ra tệp sai.

Lỗi thứ hai cùng loại: 8 dấu `**` lọt nguyên vào PDF, vì định dạng đậm **vắt qua
hai dòng** mà bộ chuyển xử lý từng dòng. Đã gộp đoạn trước khi định dạng.

**Và một bài học về công cụ, không về mã:** cũng chính CRLF làm mọi phép thay
chuỗi NHIỀU DÒNG của tôi trượt trong phiên này. Khi sửa tệp trên Windows: sửa
theo dòng, hoặc chuẩn hoá `

` trước khi so.

**Kèm:** phát hiện màn hình 2× làm ảnh chụp ra gấp đôi kích thước đặt — đây là lý
do thật khiến tôi không xem được ảnh ở vòng 2. Đã ép `deviceScaleFactor: 1` trong
`thu-nho-anh.mjs` bên kho halongxanh360.

**Sản phẩm:** `VIEC-CAN-LAM.md` + `VIEC-CAN-LAM.pdf` — 11 mục, xếp theo mức chặn
(🔴 chặn · 🟡 cần · ⚪ quyết định · 👀 cần mắt người).

### VÒNG 3 tự chủ — audit Antigravity (09/09)

**Cổng:** 198/198 test đạt (34 tệp), lint 0 cảnh báo, typecheck sạch.

**Tìm ra và đã vá:**

1. **Mã `dung-web` vừa viết chưa có test nào** — kể cả chốt chặn đường dẫn thoát
   thư mục, thứ liên quan trực tiếp tới an toàn. Đã thêm 5 ca.

2. **⚠️ VÀ VIẾT TEST LÀM LỘ RA MỘT LỖI TRONG CHÍNH CHỐT CHẶN ĐÓ.** Bản đầu so
   bằng `dich.startsWith(resolve(thuMuc))` — `startsWith` so tiền tố CHUỖI, nên
   thư mục `du-an-2` khớp nhầm với `du-an-22`, và một dự án ghi đè được lên dự án
   khác chỉ vì tên nó là tiền tố. **Lỗi này không lộ ra khi thử tay** — nó cần
   đúng hai tên dự án trong đó tên này là tiền tố của tên kia. Đã đổi sang
   `relative()` + `isAbsolute()`, và giữ lại một ca test dựng đúng tình huống đó.

3. **`quyenTuDongHoaConThieu` chưa có test.** Đã thêm 4 ca, trong đó một ca dựng
   lại đúng lỗi thật hôm nay: token 5 quyền, giao diện báo xanh, Search Console
   trả 403.

4. **Sáu script không đăng ký trong `package.json`** — cùng loại lỗi với kho
   halongxanh360. Đã đăng ký 5; `module-rubrics.ts` là thư viện được script khác
   nhập, không phải lệnh chạy.

**Vòng sau nên làm:** dựng `npm run kiem` tự tìm cho kho này như đã làm bên
halongxanh360, để không phải đăng ký tay nữa.

### 11 nguồn chủ dự án gửi — ĐÃ KHÔI PHỤC, đừng hỏi lại (09/09)

Chủ dự án gửi 11 nguồn ở một đoạn hội thoại về sau bị nén mất. Khôi phục từ bản
ghi `69e0234b-….jsonl` dòng 23133. Chép ra đây để không mất lần nữa:

1. https://github.com/mattpocock/skills — định dạng SKILL.md
2. https://claude.com/blog/the-ai-native-sdlc-playbook — **giá trị nhất**
3. https://github.com/donnemartin/system-design-primer
4. https://github.com/tt-a1i/archify — mẫu xác thực nguyên tử
5. https://horizonx.so/ — thư viện UI, **trả phí $24,99–99,99/tháng**
6. https://uiverse.io/ — component CSS mã nguồn mở
7. https://github.com/msitarzewski/agency-agents — 230+ vai trò tác tử
8. https://github.com/nextlevelbuilder/ui-ux-pro-max-skill — **dùng được ngay**
9. https://github.com/ChromeDevTools/chrome-devtools-mcp — **chốt kiểm chứng**
10. https://shaders.com/ — hiệu ứng nền
11. https://contentcore.xyz/ — tạo ảnh/video, **trả phí $9,99/tháng**

Phân tích đầy đủ: `docs/nghien-cuu-dung-website.md`.

**Kết luận lớn nhất, và nó không đến từ 11 nguồn mà từ chính mã kho này:**
Antigravity ĐÃ LÀ một bộ điều phối đa tác tử. Bảy trong chín mảnh cần thiết đã có
sẵn và đang chạy cho luồng viết bài. Thiếu đúng hai: kiểu đầu ra dạng cây tệp
(hiện là một chuỗi), và một module kiểm chứng chạy thật (`tsc` + `next build` +
mở bằng chrome-devtools-mcp). Đây là việc vài tuần, không phải vài tháng.

### Đã làm
- `ad4f9e8` — đối chiếu quyền OAuth đã cấp với quyền cần, gọi tên cái thiếu.
  Trước đó đếm scope, mà đếm không cho biết thiếu cái nào.
- `625b329` — nút "Kết nối Search Console" thành nút thật (trước là `<span>` chết,
  luôn ghi "(cần cấu hình)" kể cả khi đã cấu hình xong).
- Bỏ qua `.tmp/**` trong eslint — một tệp nháp đang làm đỏ cổng lint của cả kho.

### Đã chứng minh
- `npm run lint` sạch (0 cảnh báo) · `npx tsc --noEmit` sạch.
- **Trang Cài đặt và trang Analytics đọc cùng một hàm** `getOAuthProviderStatuses()`,
  cùng hai biến `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`. Cài đặt xanh được nghĩa là hai
  biến đó **đã có trên Vercel** — không cần thêm biến môi trường nào.
- **Nguyên nhân "không thấy nút" KHÔNG phải lỗi mã.** Dự án Vercel chưa từng nối
  với GitHub; nó được tải tay lên. Mọi commit nằm im ở GitHub. Chủ dự án đã nối
  `PCBoiz/SEO_AI` ngày 09/09.
- **Google Cloud → Data Access đã lưu đủ 6 quyền** (đã xem ảnh xác nhận):
  `openid`, `userinfo.email`, `userinfo.profile`, `drive.file`, `spreadsheets`
  (sensitive), `webmasters.readonly`.

### Chủ dự án cần làm
- **Vercel → Deployments → Redeploy một lần.** Nối Git xong KHÔNG tự dựng lại
  các commit đã đẩy trước lúc nối. Từ lần sau mới tự động thật.
- Sau khi deploy: vào `/settings` bấm **"Cấp thêm quyền"**. Token hiện tại chỉ có
  5 quyền, cấp trước khi `webmasters.readonly` được thêm vào — Google không tự
  nới token cũ. Xong thì huy hiệu ở `/analytics` phải chuyển xanh "Đã kết nối".
- **Thu hồi khoá OpenAI `sk-proj-77fD…`** đã lộ trong hội thoại (đã dùng 5 lần).

### Đang chặn
- **Trình dựng website đa tác tử**: chủ dự án đã chọn hướng "sinh mã đầy đủ bằng
  nhiều tác tử", đang chờ chị gửi các repos/skills/agents tham khảo.
- **Nghiên cứu từ khoá**: chờ CSV Keyword Planner.

### Quy ước đã chốt
- Bí mật: chủ dự án tự ghi vào `.env.local` (đã gitignore), script đọc từ đó.
  **Không bao giờ yêu cầu dán khoá vào hội thoại, không bao giờ `cat` tệp đó.**
- Mô hình không có đồng hồ. Lệnh cấm "KHÔNG bịa số" không sửa được năm sai —
  phải **đưa ngày vào lời nhắc** (`dongHomNay()` trong `src/domain/modules/seo-geo.ts`).
  Đã chứng minh: "…mới nhất 2024" → "…mới nhất 2026".
- Mốc ngày UTC rơi vào 07:00 giờ Việt Nam. Mọi phép so ngày phải dùng
  `Asia/Ho_Chi_Minh`, nếu không hai lần chạy cùng một ngày làm việc bị tính là
  hai ngày khác nhau — và sai âm thầm.
