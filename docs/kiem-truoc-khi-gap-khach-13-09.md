# Kiểm lần cuối trước khi mang cho khách — 13/09/2026

*Viết cho chị, để chạy thử một lượt cuối vào chiều nay. Mọi con số dưới đây là
đo thật trong sáng 13/09 (trang thật `halongxanh360.vn`, và bản build
Antigravity trên máy), không phải ước lượng.*

## Kết luận một câu

**Cả hai sản phẩm đều chạy được để đem cho khách xem.** Sáng nay tôi tìm ra và
sửa 9 lỗi/trục trặc (không cái nào làm hỏng buổi demo, nhưng 3 cái khách có thể
nhìn thấy) — **các bản sửa của halongxanh360 chỉ lên trang khi chị deploy**
(mục 1 dưới đây). Antigravity trên Vercel tự nhận bản mới khi tôi đẩy.

## 0. Bổ sung lúc 18:40 — sự cố Vercel và kết quả chạy thử

**Sự cố:** ảnh chụp Logs của chị lúc 18:16 cho thấy bản Antigravity trên Vercel
trả **500** ở trang dự án, dashboard và lượt gõ lịch đăng mỗi 10 phút: `Failed
to load external module sharp-20c6a5da84e2135f`. `sharp` là thư viện xử lý ảnh;
Next 16 (Turbopack) nạp nó theo đường `import()` ESM qua một liên kết băm trong
`.next/node_modules` — đường này hỏng trong gói hàm Vercel, trong khi `pino`
cũng qua liên kết băm nhưng bằng `require()` thì chạy tốt. Hậu quả: **lịch đăng
bài chưa bao giờ chạy được trên Vercel → hàng chờ trống → trang tin tức của
halongxanh360 đang "Chưa có bài viết nào".**

**Đã sửa, đã đẩy (2 commit `c0c8dc1`, `a5a8351`):** (1) `sharp` chỉ được nạp khi
thật sự xử lý ảnh — trang dự án, Bắt đầu, lịch đăng không còn chết theo nó;
(2) nạp bằng `require` thật (cùng cơ chế với `pino`) và khai cho Vercel gói kèm
tệp của sharp. Kiểm ở máy: build không còn đường ESM, phân giải đúng tới
`node_modules/sharp`, thu ảnh được. **Chị tải lại `/dashboard`** sau khi Vercel
dựng xong (2–5 phút sau 18:40); còn lỗi thì bấm vào dòng đỏ trong Logs và gửi
tôi câu đầy đủ sau dấu hai chấm.

**Chạy thử kịch bản mục 4 (tôi làm được tới đâu):**

| Bước | Kết quả |
|---|---|
| 1 | ✓ Trang chủ trên điện thoại: 6 nút gọi, đều `tel:0941328658`. |
| 2 | ✓ `/tin-tuc` lần 1: 4,1 s (lần đọc lạnh đầu tiên sau khi chị deploy), lần 2: **73 ms**. Nội dung: *"Chưa có bài viết nào"* — xem sự cố trên. |
| 3 | ✓ Trang phân khu: 3 điểm nhấn nằm đúng trong `<ul>`, nhãn Khu trước/Khu tiếp đã là bản `/60`. **Chị đã deploy bản sáng nay** (tôi đo thấy) — mục 1 bước 1 xong. |
| 4 | ✓ Dán khoá SAI → *"Khoá không đúng."* (không lộ lỗi cơ sở dữ liệu). Khoá đúng chỉ chị có. |
| 5 | ✓ Biểu mẫu liên hệ có 9 ô, nút *"Nhận phương án của tôi"*. **Tôi không gửi** để không tạo khách giả trong bảng của chị — chị gửi bằng số của mình rồi xem Google Sheets. |
| 6–7 | ✓ Trên bản build ở máy (không phải Vercel): đăng nhập, Bắt đầu, trang dự án, 4 thẻ đều hiện. |
| 8 | ✓ Trên bản build ở máy với dữ liệu gieo sẵn (không tốn AI): thẻ "Website dựng sẵn" hiện 2 trang/35 tệp; chưa điền số → từ chối kèm câu rõ; có số → .zip 250 KB trong 0,5 s, 48 tệp, `thong-tin.ts` đúng số. |
| 9 | ⚠ Trên máy tôi: "Module 1 chưa được cấu hình (BRIDGE_DATABASE_URL)". Trên Vercel: chị kiểm (A6). |
| 10 | — Cần tài khoản Google của chị; tôi không làm được. |

**Muốn mục tin tức có bài khi demo:** sau khi Vercel lên bản mới, vào trang dự
án halongxanh360 → thẻ "Lịch đăng bài tự động" → *Chạy ngay* (tốn ~8 lượt AI
bằng khoá của chị) → vài phút sau vào `halongxanh360.vn/duyet-bai` dán khoá →
*Đăng*. Hoặc để nguyên "Chưa có bài viết nào" — câu chữ ở đó đã viết cho
trường hợp này.

## 1. Việc chị làm TRƯỚC buổi chiều (theo thứ tự, ~15 phút)

| # | Việc | Vì sao |
|---|---|---|
| 1 | ~~Trên VPS: `./trien-khai.sh`~~ **ĐÃ XONG** (đo trang thật 18:35: bản sáng nay đang chạy). | — |
| 2 | Mở `vercel.com` → dự án Antigravity → *Deployments*: bản mới nhất **Ready**? | Sáng nay tôi đẩy thêm 1 đợt sửa; Vercel tự dựng. Đỏ thì chụp màn hình gửi tôi. |
| 3 | Trong Antigravity (bản đầy đủ) → *Tự động hoá* → *Module 1 · Sitemap* → bấm **Lịch sử kết quả** | Trên máy tôi (không có biến `BRIDGE_DATABASE_URL`) chỗ này báo "Module 1 chưa được cấu hình". Nếu trên Vercel cũng báo thế thì thêm biến đó ở Vercel → Settings → Environment Variables (giá trị: chuỗi kết nối Neon của bridge, có trong `.env.local` của chị). Không ảnh hưởng 23 module còn lại. |
| 4 | **Ngay trước khi demo (1–2 phút):** mở `halongxanh360.vn/tin-tuc` một lần | Kể cả sau khi deploy, lần đọc ĐẦU TIÊN sau khi máy chủ khởi động vẫn phải đánh thức cơ sở dữ liệu (Neon ngủ khi vắng khách). Mở trước một lần thì khách không phải đợi. |

## 2. halongxanh360.vn — kết quả kiểm

### Đã kiểm gì, thấy gì

| Hạng mục | Cách đo | Kết quả |
|---|---|---|
| Mọi trang mở được | Gọi 31 URL trong sitemap | 31/31 trả 200, 0,13–0,4 s. Đường cũ (`/phap-ly`, `/tien-do`) chuyển hướng 308 đúng. |
| Bản đang chạy | So HTML thật với mã | **Đã là bản có sửa 13/09** (chân trang /60, lưới ảnh 46vw) → chị đã deploy đợt trước. |
| Giao diện, ảnh, chữ | Trình duyệt điện thoại mở 31 trang, cuộn hết | **0 ảnh vỡ, 0 ảnh thiếu alt, 0 chữ lộ** (undefined/NaN), mỗi trang đúng 1 h1, console sạch. |
| Lighthouse điện thoại (trang thật) | 12 trang | Accessibility / Best practices / SEO: **100** ở 9 trang; **90–97 ở 3 trang** (phân khu, quỹ căn, tài liệu) — **đã sửa, chờ deploy**, đo lại trên bản build: 100. |
| Hiệu năng | Lighthouse điện thoại | Trang chủ **73** (LCP 5,5 s — do màn mở đầu + chữ trồi lên, **chị chọn giữ, mục 22**); `/du-an` 90, `/tin-tuc` 92, `/gia…` 91, phân khu 89. |
| Trang tin tức | Đo 4 lần liên tiếp | Lần đầu **8,4 s**, các lần sau 0,4 s → Neon ngủ. **Đã sửa** (xem dưới). |
| SEO kỹ thuật | Đọc HTML | Title, description, canonical, Open Graph, Twitter card đủ; JSON-LD 2 khối hợp lệ: WebSite, RealEstateAgent (số 0941 328 658), Place, **FAQPage 9 câu**. |
| Mô tả/tiêu đề | Đo độ dài | 3 mô tả 201–232 ký tự (Google cắt sau ~155) → **rút về 143–154**; 2 tiêu đề phân khu 71–73 ký tự → **62–64**. |
| GEO | `robots.txt`, `llms.txt` | 15 bot AI được cho phép rõ ràng; `llms.txt` 170 dòng, mọi link sống, ghi rõ "không phải trang chính thức của chủ đầu tư". |
| Màn duyệt bài | Mở `/duyet-bai` | noindex, hỏi "khoá duyệt bài" bằng chữ cho người thường; hàng chờ chỉ về sau khi có khoá. |
| Bộ kiểm của kho | `npm run kiem` | **20/20** (thêm 1 phép kiểm mới), lint, build xanh. |

### Đã sửa sáng nay (chờ chị deploy — bước 1 ở mục 1)

1. **Khách không đợi Neon dậy.** Trang tin tức và từng bài nhớ kết quả trong
   máy chủ: trả ngay bản đang có, làm mới ở nền; duyệt/gỡ/ghi bài thì xoá bộ
   nhớ để bài hiện tức thì. Làm mới hỏng thì giữ bản cũ, không hiện "Chưa có
   bài viết nào" oan.
2. **HTML sai ở 4 chỗ** (`<ul>` → `<div>` hiệu ứng → `<li>`): trang phân khu,
   lịch thanh toán ở quỹ căn, danh sách tin tức, "Bài khác" trong từng bài.
   Trình đọc màn hình mất cả danh sách; Lighthouse bắt ở trang phân khu (90).
3. **Chữ mờ dưới chuẩn** ở nhãn "Khu trước/Khu tiếp" (3,4:1), số đếm bộ lọc
   bảng hàng (3,4:1), câu miễn trừ ở tài liệu (4,0:1) → đều ≥ 4,5:1.
4. Mô tả và tiêu đề SEO như bảng trên.

### Xếp hạng và truy vấn Google — nói thẳng

- Bộ tìm kiếm tôi truy được từ máy (không phải Google Việt Nam) **chưa thấy
  tên miền** với cả `site:halongxanh360.vn` lẫn từ khoá dự án; 9 tên miền đối
  thủ chiếm trang đầu (`vinhomeglobalgatehalong.vn`, `vinhomehalongxanh.vn`,
  `vinhomesland.vn`…). Tên miền mới lên chỉ mục từ ~11/09 — **đây là bình
  thường**, không phải lỗi.
- Số thật duy nhất là **Google Search Console**: mở Antigravity → *Phân tích*
  (`/analytics`). Tính tới 11/09 theo Search Console: **16/31 địa chỉ đã vào
  chỉ mục**, Bing đã nhận 31 địa chỉ qua IndexNow.
- Nếu khách hỏi "bao giờ lên top": kế hoạch có số ở
  `KE-HOACH-LEN-TIM-KIEM.md` (kho website) — ba sự thật đặt trước: tìm kiếm
  không phải kênh ra khách của quý này; bất động sản là ngành AI Overviews
  xuất hiện ít nhất; GEO chủ yếu vẫn là SEO tốt.

### Còn lại, không sửa (là lựa chọn, không phải lỗi)

- Trang chủ perf 73 / LCP 5,5 s vì hiệu ứng mở đầu — chị chọn **B, giữ nguyên**
  (mục 22). Nếu Google xếp hạng theo Core Web Vitals thì đây là điểm trừ có
  chủ ý.
- Thiếu header `Strict-Transport-Security` (HSTS) — không ảnh hưởng người
  xem; muốn thêm thì một dòng trong Caddyfile, làm sau.

## 3. Antigravity — kết quả kiểm

### Đã kiểm gì, thấy gì

| Hạng mục | Cách đo | Kết quả |
|---|---|---|
| Bản thật trên Vercel | `/api/v1/health`, `/ready`, `/login` | ok/ready (database, vault, auth đều true), 1,2–1,7 s từ máy tôi. |
| Mọi màn mở được | Đăng nhập chủ workspace, mở **17 màn** ở máy tính và điện thoại | 17/17 mở được, không màn lỗi, không chữ lộ. |
| Nhanh/chậm | Bản build, đo TTFB và tới khi trang xong | **Đăng nhập < 0,5 s; mọi màn TTFB 10–400 ms, hiện xong < 0,5 s.** Trên Vercel cộng thêm đường mạng (~1 s). |
| Điện thoại | 412 px | 1 màn tràn ngang (**Quy trình** — ô "Chọn luồng" rộng 450 px) → **đã sửa**. |
| Bộ kiểm | tsc · eslint · vitest · next build · e2e | 489/489 test, e2e 14/14, build xanh. |
| Module | Đọc sổ đăng ký | **24 module hiện + 1 ẩn**, 6 luồng chạy sẵn (bài viết SEO+GEO; + video; + tái chế; trọn gói; đẩy thẳng sang site; dựng website 4 bước). |

### Đã sửa sáng nay (đã đẩy, Vercel tự dựng — bước 2 ở mục 1)

1. **Link chết trong đường dẫn phân cấp**: ở màn chạy module, đoạn "Chạy việc"
   là link tới `/automations/run` — trang không tồn tại, bấm là 404 (và mọi
   màn chạy module đều tải trước cái 404 đó). Giờ là chữ thường.
2. **Màn Quy trình tràn ngang trên điện thoại** (ô chọn luồng).
3. Nhãn bước dựng website ghi "1/3, 2/3, 3/3" trong khi có **4** bước → "1/4…4/4".
4. `/api/v1/ready` báo `automationProvider: "mock"` (hằng cứng từ thời còn
   Make.com) — người kỹ thuật đọc sẽ tưởng tự động hoá đang giả lập → "app-native".
5. Lỗi 500 không rõ nguồn **giờ được ghi nhật ký** (trước trả 500 mà log
   trống — sáng nay phải gọi lại bằng tay mới biết Module 1 thiếu biến).

### Dễ dùng — nhận xét khi đi qua như người mới

- Bản **đơn giản** (Bắt đầu · Bài đã viết · Website của tôi · Cài đặt) đủ cho
  khách không rành: trang Bắt đầu nói rõ "hôm nay máy đã làm gì", ô viết bài
  chỉ hỏi chủ đề. Chưa có khoá AI thì báo đúng một câu kèm link.
- Trang dự án: 4 thẻ việc máy tự làm (lịch đăng, ảnh Drive, khách → Sheets,
  website dựng sẵn) mỗi thẻ 2–3 câu giải thích, không thuật ngữ.
- Khách sẽ hỏi: "AI của ai?" → *Chạy bằng khoá của bạn* (BYOK) ghi ngay đầu
  các màn; "bài có tự lên trang không?" → không, vào hàng chờ duyệt.

### Còn lại

- Module 1 · Sitemap cần `BRIDGE_DATABASE_URL` trên Vercel (bước 3 ở mục 1).
- Chưa có lần đẩy GitHub → Cloudflare thật (cần token của chị, mục B1 trong
  `VIEC-CAN-LAM.md`). Demo phần này bằng nút *Tải mã nguồn (.zip)* hoặc *Xem
  thử trên máy* là đủ.

## 4. Kịch bản chạy thử cuối (15 phút, đúng thứ tự)

**halongxanh360 (sau khi deploy, trên điện thoại thật):**
1. Mở trang chủ → cuộn hết → bấm *Gọi* thử: đúng số 0941 328 658.
2. Mở `/tin-tuc` **hai lần** — lần hai phải hiện tức thì.
3. Mở một trang phân khu, cuộn xuống "Điểm nhấn": danh sách đủ, chữ "Khu
   trước / Khu tiếp" đọc rõ.
4. `/duyet-bai`: dán khoá → *Mở hàng chờ* → thấy hàng chờ (hoặc "Hàng chờ
   trống."), KHÔNG được thấy câu lỗi cơ sở dữ liệu.
5. Điền thử biểu mẫu liên hệ bằng số của chính chị → dòng mới phải xuất hiện
   trong Google Sheets của dự án (nếu chưa: mục 0/12 trong `VIEC-CAN-LAM.md`).

**Antigravity (trên Vercel, tài khoản của chị):**
6. Đăng nhập → *Bắt đầu*: thấy khối "Hôm nay máy đã làm gì" với dự án
   halongxanh360.
7. *Website của tôi* → dự án → 4 thẻ hiện đủ; thẻ "Khách liên hệ → Google
   Sheets" ghi *Đã lập* nếu bước 5 chạy.
8. *Quy trình* → chọn "Dựng website — bản nháp" → điền mô tả → chạy (4 lượt AI,
   DeepSeek thường dưới 2.000đ) → thẻ "Website dựng sẵn" → điền số điện thoại →
   *Tải mã nguồn (.zip)*. Đây là phần "ồ" nhất để cho khách xem.
9. Chuyển *bản đầy đủ* → *Tự động hoá* → Module 1 → *Lịch sử kết quả* (bước 3
   ở mục 1).
10. *Phân tích* → Search Console: nếu huy hiệu chưa xanh, bấm *Cấp thêm quyền*
    ở *Cài đặt* (mục 7 `VIEC-CAN-LAM.md`).

Chỗ nào lệch với mô tả trên: chụp màn hình gửi tôi kèm số bước.

## 5. Quyết định của chị sáng nay — đã ghi

| Mục | Chị chọn | Tôi ghi/làm |
|---|---|---|
| B1 (token GitHub + Cloudflare) | Hỏi "để khách làm?" | **Việc của chị, một lần**, để mọi web khách lên mạng bằng một nút; khách không cần tài khoản gì. Chưa cần cho chiều nay. |
| C1 (tin tức cho web khách) | Có, nhưng **halongxanh360 trước** | Ghi "có mục tin tức — làm sau"; phương án A/B chốt khi tới lượt. |
| C2 (ai duyệt bài) | **Khách** | Chị gửi "khoá duyệt bài" cho khách **một lần qua kênh riêng** (mục 20). Nếu khách phải dán khoá mỗi lần thấy phiền → tôi làm phiên đăng nhập riêng cho màn duyệt (nói tôi một câu). |
| C3 (LCP trang chủ) | **B — giữ nguyên** | Đóng mục 22; ghi là lựa chọn có chủ ý. |
| D1, D2 | **Bỏ qua** | Rút khỏi bảng việc. |
