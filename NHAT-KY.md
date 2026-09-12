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

## 13/09/2026 — VÒNG 46 · web khách lên mạng không cần máy: Đẩy lên GitHub → Cloudflare tự dựng

Khoảng trống lớn nhất còn lại của trình dựng web là **bước cuối**: mọi đường
"đưa lên mạng" đều cần một người mở terminal, và Antigravity trên Vercel không
dựng hộ được. Mục 19 treo câu "VPS hay máy tôi" từ 12/09. Nghiên cứu lại:
Cloudflare **Workers Builds** nối với kho GitHub, tự `npm install` + build +
deploy khi có commit — nghĩa là Antigravity chỉ cần ĐẨY MÃ LÊN GITHUB, việc đó
là vài chục lượt gọi HTTP, làm được từ Vercel. Không cần máy dựng nào.

Đã dựng:
- `domain/dung-web/github-day.ts` (thuần): `chuanBiChoCloudflare` (cấu hình ra
  gốc, `@opennextjs/cloudflare` 1.20.6 + `wrangler` 4.131.1 đóng cứng vào
  devDependencies, hai lệnh `dung-cloudflare`/`day-cloudflare`, `CLOUDFLARE.md`
  ghi cách nối), `mucGitTuCay` (blob utf-8/base64, chặn `..`), `tenRepo`.
- `lib/dung-web/github-api.ts`: Git Data API — ref → blob (4 cùng lúc) → MỘT
  cây đầy đủ (không base_tree: tệp bỏ đi là biến mất) → commit → PATCH/POST
  ref. `fetch` tiêm được; lỗi GitHub in nguyên câu + gợi ý (401 hết hạn, 403
  thiếu quyền, 409 kho trống).
- `lib/dung-web/github.server.ts`: token cá nhân lưu ở `oauth_connections`
  (provider `github`, TS-only enum → không migration), kiểm với `/user` trước
  khi lưu; kho của dự án ở `project_integrations` loại `github_web`. Tạo kho
  riêng tư `auto_init` (kho trống thì Git Data API 409). **Kho trùng tên mà
  không phải Antigravity tạo (mô tả không ghi) → từ chối**, không đè.
- Tuyến `/api/v1/github/token` (GET/POST/DELETE) và
  `/api/v1/projects/[id]/dung-web/github` (GET/POST/DELETE, `maxDuration` 120).
- Thẻ "Website dựng sẵn": khung "Đưa lên mạng không cần máy" — dán token một
  lần, nút Đẩy, kết quả kèm ba bước nối Cloudflare lần đầu.

Kiểm chứng: 11 test đơn vị (cây Cloudflare vẫn soát sạch; thứ tự và nội dung
từng lượt gọi trên GitHub giả; 403 giữa chừng thì không ghi nhánh); e2e
`day-github.spec.ts` (tuyến thật từ chối token ngắn/thiếu số; giao diện với
tuyến giả). `scripts/dung-web-thu.ts --cloudflare` dựng đúng cây sẽ đẩy: tsc +
`next build` + `opennextjs-cloudflare build` **đạt**. **Chưa kiểm được**: đẩy
thật lên GitHub và dựng thật trên Cloudflare — cần tài khoản của chị (ghi rõ ở
mục 19 và trong tài liệu). Nghiên cứu: Workers Builds chỉ nối kho qua bảng
điều khiển (không có API) — nên bước nối lần đầu là của người dùng, đúng ba
cú bấm.

## 13/09/2026 — VÒNG 45 · bước hỏng giữa luồng → "Chạy tiếp", không trả tiền lại

Rà đường "một bước hỏng giữa chừng" ở trang Quy trình — chuyện thật với luồng
dựng web: bước 2 (kiến trúc) hay bước 4 (viết chữ) thỉnh thoảng hỏng vì model
trả JSON không hợp lệ, chạy lại là được. Trước đây cách duy nhất là bấm "Chạy
cả luồng" lần nữa: đốt lại lượt gọi cho những bước đã xong, và với người không
rành thì trông như máy phải làm lại từ đầu.

- `pipeline-runner.tsx`: bước giữ `jobId`; `runPipeline(tuBuoc)` giữ nguyên
  các bước đã xong và chạy từ bước hỏng, nối `upstreamJobIds` vào job cũ. Nút
  **"Chạy tiếp từ bước N (tiết kiệm N−1 lượt gọi)"** hiện cạnh lỗi, kèm câu
  "sửa ô nào cần sửa rồi bấm" — tức là sửa *sự thật* / *yêu cầu sửa* rồi chạy
  tiếp là đủ. Hỏng ngay bước 1 thì không có nút (chạy tiếp = chạy lại).
- Lỗi ném ra giữa chừng (không tạo được job, mất mạng) giờ cũng đánh dấu đúng
  bước là hỏng — trước để bước kẹt ở "đang chạy" trên màn hình.
- Kiểm bằng e2e **không tốn lượt gọi nào**: `tests/e2e/chay-tiep-buoc-hong.spec.ts`
  chặn tuyến tạo job ngay trong trình duyệt (bước 1 xong, bước 2 hỏng lần đầu),
  lưu một khoá AI giả cho tài khoản e2e rồi xoá (nút Chạy chỉ bật khi có khoá).
  Đo: sau lỗi có nút; bấm thì bước 1 KHÔNG gọi lại, bước 2 nối `["job-1"]`,
  bước 4 nối `["job-1","job-3","job-4"]`, thẻ "Website đã dựng xong" hiện.
  13/13 e2e · 432 unit · tsc · lint.

## 13/09/2026 — VÒNG 44 · web khách như một sản phẩm giao được: một chỗ sửa, chia sẻ, 404, icon

Rà bản dựng thử như một người sắp giao web cho khách, thấy năm chỗ "chưa
xong" mà `next build` không bao giờ nói, và **một lỗi thật**:

- **Lỗi thật**: `du-lieu-co-cau-truc` (JSON-LD LocalBusiness) nằm trong khối
  chung, được *nhập* vào layout nhưng **không bao giờ được vẽ** — layout chỉ
  vẽ ba khối quen tên. tsc không bắt (nhập thừa không phải lỗi kiểu), soát
  không bắt, Lighthouse không bắt; chỉ khi curl HTML mới thấy thiếu hẳn. Sửa:
  khối chung không có chỗ cố định vẽ ở cuối body. Thêm luật soát **1b**: khối
  nhập vào layout/trang mà không vẽ → lỗi nặng.
- **Số điện thoại rải tám tệp** → README từng phải liệt kê tên tệp cho chủ web
  đi sửa tay. Giờ mọi nút gọi, Zalo, tên, tên miền đọc từ **`src/lib/thong-tin.ts`**
  lúc chạy; khuôn dùng `LINK_GOI`/`THONG_TIN`, `tep()` tự chèn dòng nhập. Nút
  Zalo quyết định lúc chạy (`THONG_TIN.zalo ?`) — thêm Zalo sau không phải dựng
  lại. Luật soát 10: khối nào gõ thẳng `href="tel:` → lỗi.
- **Không thẻ chia sẻ**: dán link lên Zalo/Facebook chỉ ra một dòng địa chỉ
  trần. Thêm `src/lib/meta.ts`: `meta(tieuDe, moTa, duong)` cho từng trang —
  canonical, Open Graph đủ cụm (Next không gộp sâu `openGraph` giữa layout và
  trang), ảnh chia sẻ là tấm đầu trong `public/anh/`. Kiểm bằng curl: `og:image`
  ra địa chỉ tuyệt đối, có cả thẻ twitter.
- **Tab trình duyệt trống**: `src/app/icon.svg` chữ cái đầu trên nền màu nhấn
  (SVG tĩnh, không `next/og`, chạy được ở mọi nơi). "đồ gỗ" → "Đ".
- **404 tiếng Anh mặc định** → `not-found.tsx` tiếng Việt, đúng hệ thiết kế,
  có nút gọi; trả HTTP 404 + `noindex`.
- **Đầu HTTP an toàn** trong `next.config.ts` (nosniff, SAMEORIGIN,
  Referrer-Policy, Permissions-Policy) — curl thấy đủ bốn.
- `viewport.themeColor` = màu nền; Google Analytics **chỉ khi** đặt
  `NEXT_PUBLIC_GA_ID` (kiểm: HTML không có `googletagmanager` khi không đặt);
  `.env.example` giờ liệt kê cả `NEXT_PUBLIC_DIA_CHI` (README nhắc mà tệp mẫu
  thiếu).
- **JSON-LD thoát `<`** (`\u003c`): chữ do model viết có `</script>` là đóng
  được thẻ script → hàm `jsonLd()` trong `kieu.ts`; test đưa `</script>` vào
  câu trả lời, HTML không còn `<` thô mà máy đọc vẫn ra đúng chữ.
- Hai lỗi test có sẵn trước vòng này (không phải do vòng này): test bẫy bot
  dùng kiến trúc không có khối biểu mẫu; test `don()` gọi `npm install` vào cây
  không có `package.json` (stamp cài đặt vòng 39 làm lộ). Sửa cả hai: cây không
  có `package.json` thì không cài.

Kiểm chứng thật: fixture dựng → soát sạch → tsc + `next build` đạt → `next
start` + curl từng thứ (headers, 404, icon, OG hai trang, hai JSON-LD, không GA).
432/432 · tsc · lint. Cloudflare: chạy lại `opennextjs-cloudflare build` +
`wrangler dev --local` với `headers()` mới — worker trả đủ bốn đầu HTTP, 404
tiếng Việt, icon.svg đúng kiểu, OG ở trang con, JSON-LD doanh nghiệp, API
biểu mẫu, sitemap. Đường Cloudflare vẫn nguyên.

## 13/09/2026 — VÒNG 43 · sửa chữ website không cần đụng JSON

Commit `dd6f8e3`. Rà lại đường "khách muốn sửa chữ" trong luồng dựng web:
trước đây cách duy nhất là chạy lại cả luồng (4 lượt gọi, mất luôn kiến trúc
đã ưng) hoặc sửa tay JSON đầu ra — cả hai đều không hợp người không rành.

- Module #27 *Viết chữ* thêm ô **"Muốn sửa gì so với lần trước?"** (tùy chọn,
  ≤600 ký tự). Có chữ thì prompt kèm một dòng "Yêu cầu của chủ website cho lần
  viết này: …"; để trống thì prompt y như cũ (kiểm bằng test: không có chữ →
  không có dòng đó).
- Thẻ "Website dựng sẵn" vốn đã lấy đầu ra **mới nhất** của #27, nên chạy lại
  một bước là đủ — không phải chạy lại luồng.
- Hướng dẫn `docs/huong-dan-dung-web-cho-khach.md` (+PDF) đổi đoạn "Muốn
  sửa?" cho khớp.

## 13/09/2026 — VÒNG 42 · hướng dẫn trọn bộ cho người không rành; dọn trùng lặp

- `docs/huong-dan-dung-web-cho-khach.md` (+PDF): bốn bước từ tạo dự án tới
  đưa lên mạng, bảng "ô nào điền gì", và phần "chưa làm được" nói thẳng.
- Thẻ lịch: gộp hai chỗ dựng biểu mẫu (lần đầu từ máy chủ / tải lại) về một
  hàm thuần `formBanDau` — bản trước lặp mười dòng ở hai nơi, đổi một chỗ là
  lệch chỗ kia.
- `docs/viec-con-sot.md`: C10 cập nhật trạng thái thật (trọn đường ở máy).

## 13/09/2026 — VÒNG 41 · Lighthouse cho chính Antigravity

Commit `a27afd3`. Đo `/bat-dau` và trang dự án bằng Lighthouse điện thoại:

- **Accessibility 100, Best practices 100** ở cả hai trang — không phải sửa gì.
- `/robots.txt` trả **404 HTML** → Lighthouse báo "robots.txt is not valid".
  Với một công cụ nội bộ có đăng nhập, không có robots nghĩa là "cho phép lập
  chỉ mục tất cả" — ngược hẳn thứ cần. Thêm `src/app/robots.ts`: `Disallow: /`.
  (Điểm SEO tụt xuống 63 vì "page is blocked from indexing" — đúng chủ đích.)
- **CLS 0,11–0,22 ở trang dự án**: thẻ lịch nở từ một dòng "đang kiểm…" thành
  cả biểu mẫu sau khi tải, mọi thứ bên dưới nhảy xuống. Thử `min-h` trước —
  không ổn (đo lại còn tệ hơn, vì dev mode nhiễu và thẻ có thể co lại). Cách
  đúng: trang dự án đọc `trangThaiLich` ở **máy chủ** rồi đưa xuống thẻ
  (`banDau`) — thẻ vẽ đúng ngay từ HTML đầu. Đo lại: **CLS 0**.
- Bài học: đo trước khi tin một cách sửa "hiển nhiên" — `min-h` nghe hợp lý
  mà số đo nói không.

424/424 · tsc · lint.

## 13/09/2026 — VÒNG 39–40 · cài lại khi phụ thuộc đổi; luồng dựng web chỉ đường sau khi xong

Commit `c1a255c`, `be4d13b`.

- **`chuanBi` cài lại khi `package.json` đổi.** Bản đầu chỉ kiểm "có
  `node_modules` chưa" — bản ghim `next` đổi 16.2.11 → 16.3.5 mà thư mục làm
  việc cũ giữ nguyên bản cũ, không gì báo. Giờ ghi dấu cài đặt
  (`.antigravity-cai-dat.json` = phụ thuộc lúc cài); khác là cài lại. Đo:
  lần đầu 28 s + ghi dấu, lần hai 0 s.
- Chạy xong luồng dựng web, trang Quy trình hiện thẻ xanh chỉ thẳng tới
  "Website dựng sẵn" của dự án — trước đó người dùng đứng trước "Gói nội
  dung" toàn JSON và không biết bước tiếp theo ở đâu.
- Dọn thư mục làm việc cũ trong Temp (`thu-nghiem`, `du-an-project_local_demo`);
  giết `workerd`/`esbuild` còn sót từ lần thử Cloudflare (chúng giữ tệp trong
  `node_modules/miniflare`, làm `npm install` lần sau EBUSY).
- Website: `npm run build` xanh sau khi đổi chữ màn duyệt (vòng 19 bên đó).
- e2e: một lượt chạy 2/12 hỏng vì **timeout khi máy đang build website song
  song** (CPU đầy); chạy lại ngay sau: 12/12. Ghi lại để lần sau đừng chạy e2e
  chồng lên `next build`.

424/424 · tsc · lint · e2e 12/12 · website build xanh.

## 12/09/2026 — VÒNG 37–38 · chống spam web khách; lỗ hổng "sự thật"; regression nút viết hộ

Commit `9d28d3d`, `7aeb4f9`.

- **Chống spam biểu mẫu web khách**: ô bẫy bot ẩn (`diaChiWeb`, bot điền mọi
  ô) + giới hạn 5 lượt/10 phút theo IP trong tuyến `/api/lien-he` của website
  sinh ra. Thử thật trên xem trước: bot → `{"ok":true,"luuO":"bo-qua"}`, lượt
  thứ 6 → 429. Tuyến đọc `cf-connecting-ip` trước (Cloudflare) rồi
  `x-forwarded-for`.
- **Lỗ hổng thật trong luồng Quy trình**: preset dựng web chạy #27 mà KHÔNG
  có chỗ nào để điền "sự thật" (giá, giờ mở, điện thoại) — website ra toàn
  chữ không số, đúng như thiết kế an toàn, nhưng người dùng không có cách nào
  cho số vào. Thêm ô vào `POOL_FIELDS` (tự hiện khi luồng dùng).
- **"AI viết hộ" KHÔNG được mời viết sự thật** — máy viết hộ sự thật là máy
  bịa số, đúng thứ cả hệ thống dựng để tránh. Thêm `^suThat$` vào
  `khongVietHoDuoc`.
- **Regression bắt được bằng test mới**: khi gộp `/url/i` thành một regex ở
  vòng 24, cờ `i` rơi mất → nút "AI viết hộ" lại hiện dưới "URL website" suốt
  mấy vòng (có trong ảnh chụp vòng 25 mà không ai nhìn ra). Sửa + 8 ca kiểm.

424/424 · tsc · lint.

## 12/09/2026 — VÒNG 34–36 · build xanh, thêm khối bất động sản, lưới an toàn chạy từ Bắt đầu

Commit `16ef85f`, `d674e69`, `f24bf93`.

- **`next build` của chính Antigravity** — chưa chạy suốt phiên; giờ chạy: xanh,
  không cảnh báo. `maxDuration` của tuyến xem trước hạ từ 600 về **300** (trần
  Vercel Hobby; tuyến đó trả 501 trên Vercel nên không cần hơn).
- **#25** có thứ tự khối mặc định cho trang bán hàng (mở đầu → lý do gọi ngay
  → giá/sản phẩm → niềm tin → hỏi đáp → biểu mẫu; mỗi trang một biểu mẫu;
  trang không có biểu mẫu thì kết bằng khối chốt).
- **Ba khuôn bất động sản** — ngành của chủ dự án: bảng hàng trong khu, số
  liệu dòng sản phẩm, **bộ gợi ý theo nhu cầu** (client component có trạng
  thái; bấm chọn trên xem trước → hiện đúng gợi ý + nút gọi). Danh mục bđs giờ
  chỉ còn `so-do-phan-khu` (cần dữ liệu bản đồ) và `karst-backdrop` (hình
  trang trí) chưa có khuôn.
- **Lưới an toàn của lịch đăng — bản mạnh hơn.** (1) Chạy từ **trang Bắt
  đầu** (`<GoHoLich/>` trong khối "Hôm nay") — người vận hành mỗi sáng mở
  trang đó chứ không mở trang dự án; lưới nằm ở trang không ai mở thì không
  phải lưới. Hai chỗ dùng chung chốt `sessionStorage` 10 phút để không gõ đôi.
  (2) **VPS im quá 24 giờ = coi như chưa có crontab.** Đây là lỗi im lặng
  nhất: khởi động lại VPS mất cron, dòng "máy chủ kiểm lần gần nhất" vẫn có
  ngày giờ — của tuần trước. Chỉ vai có `pipeline.run` mới gõ hộ.
- Memory mới: `tar-tren-windows` (GNU tar của Git Bash không đọc zip; gọi
  `System32\tar.exe` với tên tệp tương đối).

423/423 · tsc · lint · `next build` xanh; dựng thử thật: soát sạch, ĐẠT.

## 12/09/2026 — VÒNG 33 · trang Quy trình đi thử lại như người dùng lần đầu

Commit `50e50eb`. Đi thử luồng "Dựng website" từ đầu như chủ dự án chưa có gì:

- **Chưa có khoá AI mà vẫn bấm Chạy được** — bước đầu chết với một câu lỗi từ
  engine, *sau khi* đã điền xong cả biểu mẫu. Trang Bắt đầu và thẻ lịch đã
  chặn chuyện này từ trước; trang Quy trình thì chưa. Giờ: nhà cung cấp không
  có khoá bị mờ đi kèm chữ "chưa có khoá", không có khoá nào thì một hộp vàng
  nói rõ + link sang Khoá AI, và nút Chạy tắt.
- **Cùng ô, khác câu hỏi**: luồng dựng web dùng lại ô `audienceBrief` nhưng
  hỏi "website này để làm gì, cho ai" — không phải "mô tả doanh nghiệp cho
  bài SEO". Nhãn, gợi ý và ví dụ đổi theo luồng; ô tên miền thành "Tên miền
  dự kiến" (dựng web cho khách thì lúc đó chưa có tên miền nào).
- Cạnh ô Dự án: "Mỗi website khách là một dự án. Khách mới? Tạo dự án."

422/422 · tsc · lint · e2e 12/12.

## 12/09/2026 — VÒNG 32 · đường Cloudflare (miễn phí, được phép thương mại) đã CHẠY THỬ THẬT

Hứa ở vòng 31 thì làm ở vòng 32.

- **Phát hiện chặn**: `@opennextjs/cloudflare` 1.20.6 đòi `next >=15.5.24 <16
  || >=16.3.3`. Bản sinh ra đang ghim `next` 16.2.11 (theo hai kho của dự án)
  → `npm install` từ chối thẳng (ERESOLVE). Nâng bản ghim lên **16.3.5**; dựng
  sạch từ đầu: cài 28 s, `tsc` + `next build` ĐẠT 23 s.
- **Chạy thử đủ đường** trên dự án sinh ra: cài bộ chuyển, chép hai tệp cấu
  hình, `opennextjs-cloudflare build` xong, `wrangler dev --local` phục vụ
  trang chủ (đúng `<title>`/`<h1>`), trang con, ảnh trong `public/anh`
  (`image/webp`), sitemap, và tuyến `/api/lien-he` trả `{"ok":true}`. Bước
  `wrangler deploy` cần tài khoản Cloudflare — **chưa chạy**, ghi rõ.
- **Đưa vào tệp nén**: `trien-khai/cloudflare/{wrangler.jsonc, open-next.config.ts,
  HUONG-DAN.md}`. Đặt trong thư mục riêng và **không** thêm phụ thuộc vào
  `package.json`: bộ chuyển kéo ~300 gói, không phải ai cũng dùng Cloudflare.
  `tsconfig` của dự án sinh ra loại `trien-khai/` — không thì `tsc` báo lỗi
  giả vì gói chưa cài. `.gitignore` thêm `.open-next`, `.dev.vars`.
- Một chuyện nhỏ nhưng tốn thời gian: `rm -rf` trong Git Bash không xoá được
  `.open-next/assets` ("Device or resource busy"); PowerShell `Remove-Item`
  thì được.

Bài học: một dòng ghim phiên bản "cho ổn định" cũng là một dòng có thể chặn
đường triển khai duy nhất miễn phí — ghim thì phải ghi vì sao ghim bản đó.

422/422 · tsc · lint; dựng thử thật: soát sạch, build ĐẠT, worker chạy.

## 12/09/2026 — VÒNG 31 · TỰ ĐÍNH CHÍNH: Vercel bản miễn phí KHÔNG dùng cho web khách được

Không có mã mới; đây là một lỗi trong **lời khuyên** tôi đưa ở vòng 26, và nó
đáng một vòng riêng.

`docs/dua-web-khach-len-mang.md` bảo chủ dự án đưa website khách lên **Vercel
bản Hobby (miễn phí)**. Tra lại điều khoản: **Hobby chỉ cho dùng phi thương
mại**, và Vercel định nghĩa "thương mại" rất rộng — một trang quảng cáo sản
phẩm/dịch vụ là thương mại kể cả khi chưa thu đồng nào, và *được trả tiền để
dựng hoặc để chạy trang* cũng tính. Website dựng cho khách rơi đúng vào đó.

Viết lại tài liệu với bốn cách, xếp theo chi phí thật:
1. **VPS đang chạy halongxanh360** — 0đ thêm, cần người kỹ thuật ~30 phút/site;
2. **Cloudflare Pages** — miễn phí và **cho phép** dùng thương mại; Next.js
   cần bộ chuyển `@opennextjs/cloudflare` (1.0, 02/2026) — **tôi chưa chạy
   thử**, ghi rõ trong tài liệu và hứa dựng thử trước khi khuyên dùng;
3. **Vercel Pro** 20 USD/tháng — gọn nhất về vận hành;
4. giao nguyên tệp .zip cho khách.

Bảng chi phí sửa theo. Nguồn đã tra ghi ở cuối tài liệu.

Bài học ghi lại: **lời khuyên cũng phải audit như mã**. Một câu "dùng bản miễn
phí" nghe vô hại nhưng đẩy chủ dự án vào chỗ vi phạm điều khoản của bên thứ ba
— và không có test nào bắt được loại lỗi đó.

## 12/09/2026 — VÒNG 30 · web khách nối thẳng vào bảng khách; nói trước số lượt gọi AI

Commit `1b8afda`, `1f6d8e8`.

- **Biểu mẫu của web khách → bảng khách Google Sheets đang dùng.** Dự án đã
  lập bảng thì `.env.example` của website sinh ra điền sẵn địa chỉ nhận
  (`/api/v1/lien-he/<dự án>` của chính Antigravity) và README nói rõ chỉ còn
  dán thêm token. **Không kèm token trong tệp nén** — tệp đó có thể đi tới tay
  khách, và một token ghi được vào bảng của chủ dự án thì không thu hồi lại
  được.
- **Nói trước giá.** Trang Quy trình hiện "chạy cả luồng tốn khoảng N lượt gọi
  AI bằng khoá của bạn"; luồng dựng web ghi "ít nhất N" vì bước viết chữ gọi
  một lượt cho mỗi trang. Người trả tiền cho từng lượt có quyền biết trước khi
  bấm, chứ không phải đọc hoá đơn sau.
- Nhớ ảnh Drive 5 phút: bấm "Tải mã nguồn" rồi "Xem thử" không tải lại 8 tấm
  ảnh lần nữa. Chưa nối Drive thì KHÔNG nhớ — vừa nối xong là thấy ngay.

422/422 · tsc · lint; dựng thử thật: soát sạch, build ĐẠT.

## 12/09/2026 — VÒNG 29 · lưới "mọi trang đều mở được" + tự soát website trước khi giao

Commit `5d3b15c`, `2c8457d`.

- **E2E `moi-trang-mo-duoc`**: mở 16 đường dẫn ở bản Nâng cao và 4 ở bản Đơn
  giản, đòi HTTP 2xx + có tiêu đề + không có màn lỗi Next. Cố tình NÔNG nhưng
  phủ rộng: nó bắt đúng loại lỗi mà `npm test` và `tsc` bỏ sót (trang vỡ lúc
  dựng phía máy chủ). e2e 12/12.
- **Tự soát website sinh ra** (`domain/dung-web/soat-cay-tep.ts`, 9 test):
  chín luật mà `next build` không bao giờ bắt — mỗi trang đúng MỘT `<h1>`, có
  metadata, ảnh có `alt` không rỗng, không có chữ "undefined" lọt vào nội
  dung, không có `href="#"` trống, JSON-LD parse được, đủ tệp khung + đủ biến
  thiết kế, và không còn số điện thoại giữ chỗ. Chạy trong `dung-web:thu`
  trước khi dựng, và hiện trên thẻ "Website dựng sẵn" (không chặn tải về —
  đó là lỗi của bộ dựng, chặn thì người dùng kẹt mà không tự sửa được).
- Dọn: tắt máy chủ dev cũ đang giữ thư mục `.next` (nó chặn cả bộ e2e khởi
  động — `next dev` thứ hai cùng thư mục là cả hai cùng hỏng).

422/422 · tsc · lint · e2e 12/12.

## 12/09/2026 — VÒNG 28 · trình dựng web chạy qua engine thật (test tích hợp); kiểm hành vi CSDL hỏng bên website

Commit `62ade05` (Antigravity), `e94446e` (website).

- **`tests/integration/dung-web.test.ts`**: tạo job #24 → #27 qua
  `ModuleJobService` + `runModuleJobAppNative` trên SQLite thật, chỉ giả model
  AI. Chứng minh ba thứ test đơn vị không chứng minh được: (1) đầu ra đi qua
  bảng job — bị `flattenModuleOutput` biến thành text có nhãn, JSON nằm trong
  khối ```json giữa chữ tiếng Việt; (2) `parseModuleInput` nhận đúng đầu vào
  giao diện gửi; (3) cây tệp dựng từ **dữ liệu còn lại trong CSDL**, không
  phải biến trong bộ nhớ test. Chạy xanh ngay lần đầu.
- **#25 biết dự án có bao nhiêu ảnh**: khai `needsDrive`, đếm ảnh trong thư
  mục Drive rồi nói cho model. Chưa có ảnh thì cấm chọn khối cần ảnh — khối đó
  tự biến mất khi dựng, để lại một lời hứa suông trong bản kiến trúc.
- **Website (`e94446e`)**: `kiem-hang-cho-that.ts` — trỏ `DATABASE_URL` vào
  cổng chết rồi gọi thật `docBaiChoDuyetThat()`; đòi `{ok:false, lyDo}`, đòi
  trang công khai vẫn trả rỗng để trang còn sống, và kiểm hai chẩn đoán mã lỗi
  Postgres. Phép kiểm cũ chỉ đọc mã nguồn nên đổi cách bắt lỗi bên trong là nó
  vẫn xanh. 19/19.

413/413 · tsc · lint; website 19/19.

## 12/09/2026 — VÒNG 27 · lưới an toàn: mở trang cũng là một nhịp gõ

Commit `223ee62`.

- **Vấn đề thật, không phải giả định:** thẻ lịch đã lưu từ 12/09 nhưng crontab
  vẫn chưa dán (`crontab -l` → "no crontab for root"). Suốt những ngày đó
  **không bài nào tự chạy**, và cái duy nhất báo là một dòng chữ nhỏ.
- **Lưới an toàn** (`domain/lich-dang/luoi-an-toan.ts`, thuần, 7 test): trình
  duyệt của chính người vận hành là một nhịp gõ có sẵn. Điều kiện HẸP vì việc
  này tiêu tiền của chủ dự án: lịch BẬT + **chưa từng** có nhịp từ VPS + (tới
  giờ mà hôm nay chưa có lượt **hoặc** lượt dở mà không ai gõ ≥12 phút). Một
  nhịp là đủ — các bước sau tự nối nhau bằng HTTP.
- Giao diện gõ hộ **một lần mỗi lần mở trang** và luôn hiện một dòng nói rõ vì
  sao nó chạy, kèm nhắc dán crontab. Thử thật trên trình duyệt (gieo cấu hình
  lịch giả vào `local.db` rồi xoá): "đang bắt đầu bài hôm nay (đã tạo bước 1)",
  câu tóm tắt đổi sang "Đang viết bài … bước 1/9".
- **An toàn**: máy chủ xem trước giờ nghe `127.0.0.1`. `next dev` mặc định nghe
  0.0.0.0 — website khách bản nháp hiện ra cho cả mạng nội bộ (quán cà phê,
  văn phòng chung).
- `/projects/new`: ô "URL website" nói rõ chưa có website thì điền tên miền dự
  kiến — dựng web cho khách thì lúc tạo dự án chưa có tên miền nào cả.

409/409 · tsc · lint.

## 12/09/2026 — VÒNG 26 · hợp đồng khối khớp với bộ sinh mã; hướng dẫn đưa web khách lên mạng

Commit `2b89c41`.

- **Lỗ hổng hợp đồng.** Bước Kiến trúc mời AI chọn trong **cả 40 mã** của danh
  mục, nhưng bộ sinh mã mới có 19 khuôn. AI chọn `so-do-phan-khu` → bộ sinh mã
  bỏ khối đó → kiến trúc nói có, website không có, và người dùng không được
  báo gì rõ ràng. Sửa: `danhMucChoAi(nganh, coMauKhoi)` chỉ mời khối dựng
  được, và `kiemKienTruc` coi "có trong danh mục nhưng chưa có khuôn" là không
  dùng được (nhắc model ngay lượt đầu).
- **Thêm 4 khuôn**: `du-lieu-co-cau-truc` (JSON-LD LocalBusiness — chỉ ghi
  trường CÓ THẬT; bịa địa chỉ vào dữ liệu có cấu trúc tệ hơn bịa trong chữ),
  `moc-voucher`, `phan-tich-phan-khu`, `quy-can-xem-truoc`. Dựng thử thật lại:
  ĐẠT.
- **`docs/dua-web-khach-len-mang.md` (+PDF)**: ba cách đưa web khách lên mạng
  (Vercel / VPS đang chạy halongxanh360 / giao tệp .zip), ba việc kiểm ngay sau
  khi lên, và bảng chi phí một website. Ghi rõ phần **tôi chưa tự kiểm được**
  (không có tài khoản Vercel của chủ dự án).

403/403 · tsc · lint.

## 12/09/2026 — VÒNG 25 · xem trước ngay trong app, ảnh thật vào web khách, Lighthouse 100

Commit `13ad833` (xem trước), `c1d2922` (ảnh), `ca8a506` (đường vào).

- **Xem trước trong app.** Thẻ "Website dựng sẵn" có **Xem thử trên máy** →
  dựng cây tệp, `npm install` (lần đầu), bật `next dev` thật, trả link; kèm
  **Dựng lại** và **Tắt**. Trên Vercel tuyến này từ chối thẳng kèm lý do và chỉ
  đường tải .zip — không chạy rồi chết giữa chừng.
- **⚠️ Lỗi thật, và là loại tệ nhất — im lặng:** bấm Tắt, giao diện báo xong,
  mà cổng 50557 **vẫn LISTENING**. Bộ nhớ tiến trình nằm trong `Map` cấp
  mô-đun, trong khi `next dev` của Antigravity **nạp lại mã mỗi lần sửa tệp** →
  `Map` mới, rỗng → DELETE không có gì để giết. Giờ ghi dấu vết phiên ra đĩa
  (`.xem-truoc.json` trong thư mục làm việc): tìm lại được sau khi nạp lại mã,
  và không bật hai máy chủ cho cùng một dự án. `gietCaCay` chạy **đồng bộ**
  (bản cũ "bắn rồi quên" nên `taskkill` hỏng cũng không ai biết). Thêm
  `scripts/xem-truoc-tat.ts` — vừa là tiện ích dọn tiến trình mồ côi, vừa là
  phép thử thật cho đường đó vì nó chạy ở **tiến trình khác**.
- **Ảnh thật vào website khách.** `TepSinh` nhận `Buffer`; `dungCayTep` ghi
  `public/anh/…`; khối mở đầu thành hai cột ảnh+chữ (khung 4/3 giữ chỗ), thêm
  khối `dai-anh-lon` cuộn ngang. Nguồn ảnh **chỉ** là thư mục Drive của dự án
  (tối đa 8 tấm, ưu tiên thư mục gốc, alt lấy từ `danh-sach-anh.csv`). Không
  nối Drive thì trang toàn chữ — **không sinh ảnh AI**, theo đúng chỉ đạo
  12/09 sau vụ ba ảnh AI lọt lên trang thật.
- **Đo bằng Lighthouse (điện thoại) trên chính trang sinh ra**: Accessibility
  100 · Best practices 100 · SEO 100 · Agentic browsing 100, 54 mục đạt, 0 hỏng.
- **Đường vào**: thẻ "Dựng một website mới" ở trang Bắt đầu + `/pipelines?luong=`.
  Trước đó trình dựng web chỉ tới được qua trang Quy trình — trang không có
  trong thanh bên bản Đơn giản, nên tính năng tốn công nhất lại không có đường
  nào tìm ra.
- Nhỏ mà đáng: không có link Zalo thì **bỏ hẳn** nút "Nhắn Zalo" (bản cũ rơi về
  `tel:` — nút ghi nhắn tin mà bấm vào thì gọi điện).

400/400 · tsc · lint.

## 12/09/2026 — VÒNG 24 · trình dựng web SINH MÃ THẬT; tải về .zip; bộ e2e đã mục

Chủ dự án: "Kiểm tra tiếp rồi nghiên cứu cải tiến… còn làm thêm phần build web
cho khách nữa… audit cẩn thận vào. Chạy vòng lặp cho đến khi hết usage".
Commit `b6118b4` (audit e2e), `792b00a` (sinh mã), `2028df4` (#27), `0db0246` (tải .zip).

**Audit trước.** Bộ e2e (Playwright, KHÔNG nằm trong `npm test` nên cổng kiểm
thường ngày không thấy) đã mục từ vòng 23: bốn tệp khẳng định sau đăng nhập là
`/dashboard`, mà chế độ Đơn giản giờ về `/bat-dau`; `projects.spec` điền thẳng
vào biểu mẫu sửa dự án — biểu mẫu đó giờ nằm trong khối gấp nên Playwright coi
là không nhìn thấy. Thêm `tests/e2e/che-do.ts` (`batNangCao`) để bộ thử nào cần
bản đầy đủ thì tự nói ra. Còn bắt được một phép thử **hỏng từ trước mà không ai
biết**: nó đọc tiêu đề "Tổng quan" trên /dashboard — chữ đó chỉ có ở thanh bên,
không phải tiêu đề. 10/10 e2e xanh. Cũng sửa: khối "Hôm nay" hiện địa chỉ Google
Sheet cho **mọi vai**, giờ chỉ vai quản lý bí mật thấy.

**Trình dựng web tầng 2 — sinh mã chạy được.**
- `domain/dung-web/khoi/`: **18 khuôn khối** viết lại theo danh mục
  halongxanh360. Không chép mã gốc: mã đó nhập `@/data/project`, dùng token màu
  riêng và kéo GSAP — chép sang là `next build` gãy dòng đầu. Mọi chữ đi qua
  `chu()` nên dấu nháy/ngoặc nhọn/`<script>` do model viết không phá cú pháp.
- `dung-cay-tep.ts` (thuần): ra `package.json` (phiên bản **đóng cứng**),
  tsconfig, postcss, `globals.css` sinh từ hệ thiết kế, `app/` từng trang,
  `api/lien-he`, sitemap, robots, README.
- **#27 "Viết chữ"**: mỗi trang một lượt gọi (các khối một trang phải ăn khớp);
  chỉ được dùng con số/tên riêng trong ô "sự thật" của chủ website.
- **Tải về**: `lib/zip.ts` tự viết (deflate qua `zlib`, byte tất định) +
  tuyến `/api/v1/projects/[id]/dung-web?tai=1` + thẻ trên trang dự án. Không
  lưu cây tệp vào CSDL — dựng lại từ hợp đồng, nên không cần migration.
- **Đã chứng minh bằng máy, không bằng lời**: `npm run dung-web:tu-job` đi
  trọn CSDL → hợp đồng → cây tệp → .zip → giải nén → `npm install` →
  `next build`: 26 tệp, 14 KB, **ĐẠT**. Và `npm run dung-web:thu` dựng từ hợp
  đồng mẫu rồi mở xem trước thật để nhìn bằng mắt.

**Năm lỗi bắt được, đều nhờ chạy thật rồi nhìn:**
1. `<h1>` lấy từ `JSON.stringify` nên trang hiện nguyên dấu nháy: `"Bảng giá"`.
2. Hai trang cùng dùng một khối thì trang sau lặp y chữ trang trước (một mã =
   một tệp). Giờ khoá theo **mã + chữ**.
3. `next build` chết sau một phiên xem trước vì `.next/dev/types` cũ → dọn
   `.next` trước khi dựng.
4. `lamSlug` bỏ mất chữ **đ**: "Đường 3/2" → `uong-3-2` (NFD không tách `đ`).
5. Phép thử "trình giải nén thật" nuốt mọi lỗi nên **xanh giả**: `tar` của Git
   Bash là GNU tar, không đọc được zip; phải gọi `bsdtar` của Windows.

397/397 · tsc · lint · e2e 10/10.

## 12/09/2026 — VÒNG 23 · rà luồng tự động cho người không rành; trình dựng web tầng 1

Chủ dự án: "Cứ tiếp tục nghiên cứu cải tiến… xem thử luồng tự động hoá có dễ
hiểu với người không rành công nghệ không… dựng dần khâu tự động tạo web".
Commit `bf9e8b5` (UX), `5a7ce8a` (dựng web); website 1 commit nhỏ (chữ ở màn duyệt).

- **Rà UX** — đi thử bằng trình duyệt ở chế độ Đơn giản, máy bàn + 390px. Kết
  luận và bằng chứng ở `docs/ra-soat-luong-tu-dong-cho-nguoi-khong-ranh.md`.
  Sáu chỗ vấp đã sửa: sau đăng nhập rơi vào dashboard đầy thuật ngữ (giờ
  Đơn giản → /bat-dau); không có "hôm nay" (khối **Hôm nay máy đã làm gì**,
  `tomTatLich()` thuần, 12 test); menu điện thoại không biết chế độ (11 mục,
  không có Bắt đầu — giờ 4 mục, nền đặc); thẻ lịch nói tiếng máy (crontab/nhịp
  gõ/GSC → "Lưu lịch", "Máy chủ kiểm", "việc kỹ thuật làm một lần", link Khoá
  AI); thẻ nằm dưới biểu mẫu (Đơn giản: thẻ lên đầu, biểu mẫu gấp); màn duyệt
  xin "INGEST_TOKEN" (→ "khoá duyệt bài"). Breadcrumb từng in nguyên UUID dự án
  (regex chỉ bắt chuỗi không gạch) — sửa.
- **Trình dựng web — tầng 1 (phần "nghĩ", chưa sinh mã).** Danh mục 37 khối
  halongxanh360 viết tay (`domain/dung-web/danh-muc-thanh-phan.ts`; test kiểm
  tệp gốc tồn tại khi kho ở cạnh). Ba module nhóm **Website**: #24 Ý định, #25
  Kiến trúc (JSON hợp đồng — mã khối lạ bị nhắc rồi loại sang "cần viết mới",
  trang chủ bắt buộc, ≤8 trang), #26 Hệ thiết kế (hex, font trong danh sách có
  tiếng Việt, tương phản WCAG tính thật). Preset "Dựng website — bản nháp".
  Trang Quy trình giờ chỉ hiện ô mà luồng đang chọn thật sự nhận (trước bắt
  điền "Chủ đề" cho luồng dựng web). #24 dùng khoá chung `audienceBrief/
  siteName/websiteUrl` để chạy được trong luồng. Bước sinh tệp + kiểm chứng
  (tsc, next build) **phải chạy trên máy** — tầng 2, cần chị chốt máy nào.
- Chưa chạy thật ba module bằng AI (không tốn tiền cho việc chưa được duyệt);
  kiểm bằng model giả + hợp đồng.

363/363 · tsc · lint; website 18/18.

## 12/09/2026 — VÒNG 22 · C1, C2, C4 từ bản rà: IndexNow nửa sau, ảnh ở danh sách tin, chọn ảnh chạy tay

Chủ dự án: "Tiếp tục" → làm theo thứ tự đã đề xuất. Commit `77250c0` (Antigravity),
`c63aaee` (website).

- **C1 · IndexNow nửa sau.** Website có `/api/bao-bai-toi-ngay` (Bearer
  INGEST_TOKEN): bài đã duyệt có `ngayDang` = hôm nay → báo IndexNow + revalidate;
  **idempotent theo ngày** (`.data/indexnow-bao/<ngày>.json`), không ghi dấu khi
  IndexNow không nhận để lần sau thử lại. Lịch đăng bên Antigravity gõ tuyến này
  **một lần mỗi ngày** ngay trong nhịp gõ có sẵn (khoá đăng bài của dự án) —
  không bắt chủ dự án dán thêm crontab. Test tích hợp bắt được một lỗi thật ngay
  lúc viết: dấu "đã gõ hôm nay" không đi qua `docCauHinh` → gõ 12 lần/12 nhịp;
  sửa, giờ 1 lần/ngày.
- **C2 · Ảnh ở `/tin-tuc`.** Chỉ bài nổi bật có ảnh kèm mới hiện ảnh bìa; danh
  sách dưới giữ dạng chữ — đúng ý đồ "danh mục để lướt" của trang.
- **C4 · Chọn ảnh chạy tay.** `RIS_CHON_ANH` bỏ `an` → hiện ở /automations (20
  module hiện + 1 ẩn), có tên chế độ Đơn giản. Chạy tay để xem AI chọn gì cho
  một chủ đề trước khi tin nó trong lịch.
- **C3 (gắn ảnh cho bài cũ)**: không làm — mỗi bài gửi lại là về hàng chờ duyệt
  và tốn lượt AI; để chủ dự án chọn lô.

331/331 · tsc · lint; website 18/18 · build.

## 12/09/2026 — VÒNG 21 · ảnh kèm bài từ Drive — xong cả hai kho; rà việc còn sót

Chủ dự án: "Còn phần gán ảnh nữa làm đi, sau đó nghiên cứu những việc mình còn
sót". Commit Antigravity `9d96534`, website `53b0e90`.

### Thiết kế — chọn từ danh sách, không sinh; không migration ở cả hai kho

- **Website** nhận `anh: [{mime, base64, alt}]` (≤2, ≤3 MB, webp/jpg/png, kiểm
  chữ ký byte đầu). Ảnh ghi `.data/anh/<slug>/<băm>.<đuôi>` (volume), phục vụ
  qua `/anh-bai/<slug>/<tệp>` (regex chặt, `immutable`). **Không thêm cột**:
  ảnh bìa là `<figure data-anh-bia>` ở đầu `noiDung`, trang bài tách ra làm
  ảnh đầu bài + og:image; ảnh 2 đứng trước FAQ. Bộ lọc HTML vốn đã cho `img`
  nội bộ. Bài không kèm ảnh → ảnh theo chuyên mục như cũ. Đây là ngoại lệ có
  chủ ý của luật "ảnh chọn ở phía trang" — nguồn giờ là Drive của chính chủ
  trang, ảnh thật.
- **Antigravity**: engine bơm `drive: { lietKe, tai }` cho module khai
  `needsDrive` (token của người NỐI thư mục). `RIS_CHON_ANH` (#23, ẩn): danh
  sách đánh số (tên + mô tả từ `danh-sach-anh.csv`) → AI trả số → **kiểm lại
  theo danh sách**; lọc bản trùng gốc/thư-mục-gốc; alt ưu tiên mô tả CSV. Bước
  đăng tải từng tấm qua `sharp` (≤1600px WebP, bỏ EXIF), gửi base64; tấm hỏng
  thì bỏ tấm đó. Lịch đăng 9 bước; preset "đẩy thẳng sang site" cũng thêm.
- Gõ cửa thật ở máy (website chế độ tệp): 201 `soAnh=2`, tệp trên đĩa, tuyến
  ảnh trả đúng byte, `../` 404, mime giả 422, gửi lại 0 ảnh dọn thư mục; trang
  bài hiện ảnh bìa (ảnh chụp màn hình), og:image đúng.
- Test: website `kiem-anh-bai.ts` 24 ca; Antigravity +9 đơn vị, +2 tích hợp
  (Drive nối → bài kèm ảnh + alt CSV; chưa nối → không gọi AI). 329/329 · 17/17.

### Rà việc còn sót → `docs/viec-con-sot.md` (+PDF)

A (chị làm, 5 việc: deploy, crontab, thử form, thu hồi khoá, kiểm Neon) · B
(đợi bên ngoài, 6) · C (tôi làm được, 11 — đề xuất thứ tự C1 IndexNow nửa sau
→ C2 ảnh ở danh sách tin → C3 gắn ảnh bài cũ → C4 chọn ảnh chạy tay).

## 12/09/2026 — VÒNG 20 · "chờ duyệt" một bên, "hàng chờ trống" một bên

Sau vòng 19, lượt viết lại chạy trọn: thẻ ghi *chờ duyệt* kèm link. Chủ dự án
bấm link → `/tin-tuc/<slug>` **404**; mở `/duyet-bai` → **"Hàng chờ trống."**

- 404 là cố ý của website (bài chưa duyệt không mở được). Lỗi ở thẻ: link
  trỏ vào bài. Giờ trỏ `/duyet-bai` của site, địa chỉ bài để ở tooltip; bước
  đăng ghi thêm "Duyệt tại: …" và cảnh báo khi site trả `luuO: "tep"`
  (`de74d56`).
- "Hàng chờ trống" — sửa bên kho site (`b8a4d4f`): màn duyệt từng nuốt lỗi
  DB và in "trống"; giờ báo lỗi kèm chẩn đoán. Chưa kết luận được lần này là
  DB hỏng hay mở hàng chờ trước khi lượt xong.

## 12/09/2026 — VÒNG 19 · lượt đầu chết ở bước 8: website từ chối bài AI viết

Sau "Gõ tiếp ngay" (03:17): bước 5→8 chạy trọn trong một phút (log Vercel:
bốn POST `/tick` 03:18:10 → 03:18:41 — chuỗi tự gõ tiếp hoạt động). Rồi
**dừng ở bước đăng**: website trả 403 — bài chạm luật cấm của cổng nội dung
(`cong-chan.ts` bên kho site). Máy thử lại bước đăng **y nguyên bài cũ** → 403
lần nữa → dừng. Lỗi ở phía VIẾT, không phải ở máy. Và `crontab -l` trên VPS:
*"no crontab for root"* — lưới an toàn vẫn chưa có. Commit `fd60d2a`.

### Sửa ở phía viết, hai lớp

1. **Luật đi trước khi viết.** `domain/lich-dang/luat-viet.ts` chép 7 luật chặn
   của website (cam kết lợi nhuận, "nhất" không nguồn, giá thấp nhất, chiết
   khấu bí mật/voucher, số điện thoại, link Drive) + "không bịa số liệu" thành
   khối `LUAT_VIET_BAI`, ghép vào `audienceBrief` của mọi bước — ô duy nhất có
   mặt ở MỌI module nội dung và được nhúng nguyên văn vào lời nhắc; không phải
   sửa schema `.strict()` của từng module. ⚠️ Site đổi luật thì phải đổi tệp
   này — test khoá các từ khoá chính.
2. **Bị từ chối thì viết lại, không gửi lại.** `tinhTienDo` nhận `khongThuLai`:
   bước đăng hỏng vì "TỪ CHỐI vì nội dung" → dừng ngay (không lần 1). Máy chủ
   đóng lượt, **mở một lượt viết lại** cùng ngày (lan+1) mang `suaVi` = các dòng
   `[luật] “trích”` → vào lời nhắc "LẦN TRƯỚC BÀI BỊ WEBSITE TỪ CHỐI…". Viết lại
   vẫn bị từ chối → dừng hẳn trong ngày, không lượt thứ ba (chủ đề tính hai
   lần hỏng → mai bỏ qua). Thông báo 403 của bước đăng đổi gọn: mỗi vi phạm
   một dòng `[luật] “trích”` (thông báo job cắt 500 ký tự; lý do đầy đủ của
   một luật đã >200).

### Crontab: một lệnh, không mở trình soạn thảo

`(crontab -l 2>/dev/null | grep -v lich-dang; echo '…') | crontab - && crontab -l
| grep -c lich-dang` — bỏ dòng cũ, thêm dòng mới, in số dòng (phải là 1). Giả
lập `crontab` trong bash: dán hai lần vẫn một dòng.

Test: +2 tích hợp (403 lần đầu → 16 job, lượt viết lại `da-dang`, prompt lượt 1
mang câu bị chạm, bài đăng không mang khối luật; 403 hai lần → dừng, không lượt
3), +4 đơn vị. 318/318 · tsc · lint.

### Chưa rõ

Vì sao hàm chạy bước 5 lúc 02:31 bị ngắt — log Vercel chị chụp chỉ có phần sau
03:17. Rào 250 giây + "Gõ tiếp ngay" + crontab là ba lớp bọc; nguyên nhân gốc
vẫn cần log quanh 02:31–02:36 nếu lặp lại.

## 12/09/2026 — VÒNG 18 · lượt lịch đăng đầu tiên KẸT ở bước 5, và ô nhập bị bó

Chủ dự án chạy thật lượt đầu (02:30, OpenAI gpt-5.4-mini): bước 1–4 xong trong
một phút, **bước 5 "Mở đầu" đứng ở "đang chạy" từ 02:31, tới 02:54 vẫn thế**,
không nhịp gõ nào sau 02:31. Kèm: ô nhập cố định 3–4 dòng làm chữ AI viết bị
bó. Commit `32243b0`.

### Vì sao kẹt — kết luận từ bằng chứng, chưa có log Vercel

CLI Vercel ở máy này chưa đăng nhập, không đọc được log hàm. Bằng chứng có:
(1) job bước 5 còn "đang chạy" → hàm chạy nó **bị ngắt trước khi kịp ghi trạng
thái** (nhà cung cấp trả lỗi thì job đã "hỏng"; adapter có `AbortSignal` 120s
nên "đơ" cũng thành "hỏng" — chỉ có bị giết mới để lại "đang chạy"); (2) **không
có nhịp gõ nào từ ngoài** trong 23 phút → crontab VPS chưa dán (thẻ ghi "nhịp
gõ gần nhất 02:31" — đúng nhưng vô dụng, vì đó là lượt tự gõ, không phải VPS).
Thiết kế đã lường lưới an toàn là VPS; lưới chưa có thì một hàm chết là lượt
chết. Không đoán thêm vì sao hàm chết — ghi lại để đối chiếu khi có log.

### Sửa ba lớp

- **Rào thời gian mỗi bước** (`raoBuocMs()` = 250 s): `chay()` đua bước với
  đồng hồ; quá rào → đánh dấu job hết giờ, **vẫn gõ tiếp trong `finally`** →
  lượt kế thử lại. Đồng hồ được huỷ khi bước xong trước (không thì hàm sống
  thêm 250 s vô ích). Test: nhà cung cấp giả treo mãi → job `timed_out`
  (`LICH_DANG_QUA_RAO`) trong <5 s → lượt kế tạo lần 1.
- **Nguồn nhịp gõ** (`vps` / `tu-go` / `tay`) + `lanGoVpsCuoi`. Thẻ nói thẳng
  *"VPS chưa gõ lần nào"* và *"lượt đang dở nhưng không có nhịp gõ nào N
  phút"*; nút **"Gõ tiếp ngay"** khi lượt đang dở (trước đây bị khoá — chủ dự
  án không tự cứu được lượt kẹt). Tooltip từng bước: cập nhật lúc nào, đứng
  bao lâu, lỗi gì.
- **Ô nhập tự cao theo chữ** (`Textarea` dùng chung): thấp nhất `rows`, cao
  nhất 10 dòng (hoặc `rows` nếu lớn hơn — khung sửa bài 16 dòng giữ nguyên),
  đo lại mỗi khi giá trị đổi kể cả khi AI điền. Áp cho mọi form. Trình duyệt:
  14 dòng → cao 10 dòng có cuộn; 7 dòng → vừa khít.

312/312 · tsc · lint.

### Việc của chủ dự án ngay

Đợi Vercel dựng (~4 phút) → mở thẻ → bấm **Gõ tiếp ngay** (bước 5 kẹt >15 phút
sẽ được đánh dấu hết giờ và thử lại) → dán crontab nếu chưa (`crontab -l |
grep -c lich-dang` phải ra 1).

## 12/09/2026 — VÒNG 17 · "AI viết hộ" cạnh mọi ô nhập, có lịch sử quay về

Chủ dự án (sáng 12/09, kèm ảnh thẻ lịch đăng): người dùng nên được gọi AI
viết hộ từng ô — ở thẻ này, ở form các module, ở tính năng khác — bằng khoá
API họ đã cho, **chọn được nhà cung cấp**, **ghi lịch sử** để không thích thì
quay về bản cũ (cùng lý do đã đòi lịch sử đầu ra từng module), và "set system
instruction kỹ". Commit `75a715e`.

### Cách dựng — tận dụng hạ tầng job, không bảng mới

Cân nhắc bốn chỗ lưu lịch sử: `content_revisions` (**không có trên Neon** —
chỉ SQLite có), `knowledge_base` / `prompts` (hiện lên trang Kiến thức — dùng
sai nghĩa), bảng mới (migration Neon `0004` còn chưa xác nhận). Chọn: **một
module ẩn `RIS_VIET_HO`** — mỗi lần viết là một job. Được sẵn: khoá BYOK theo
người dùng, gọi lại khi sai định dạng, lỗi nhà cung cấp đã làm sạch, lịch sử
= `listRecentForModule` lọc theo `input.truong`, và **bản trước khi AI đè**
nằm ngay trong `input.giaTriHienTai`. Thêm cờ `an: true` vào
`ModuleDefinition`; `listModuleDefinitions()` mặc định bỏ module ẩn (bộ đếm
vẫn 19), `{ keCaAn: true }` cho ba chỗ dịch tên job bất kỳ.

### System prompt (viet-ho.ts)

Chỉ trả nội dung của ô · không lời dẫn/markdown/ngoặc · danh sách mỗi dòng
một mục không đánh số · **không bịa số liệu** (giá, pháp lý, tiến độ, ngày,
tên người — thiếu thì "[cần điền]") · tôn trọng giới hạn · có bản nháp thì
cải thiện theo gợi ý. Gợi ý riêng cho 15 ô hay gặp (`audienceBrief`, `chuDe`,
`primaryKeyword`, `headline`, `outline`…). Có đầu ra module trước (từ khoá,
cụm chủ đề, quét web) thì đưa vào làm tham khảo, cắt 1.500 ký tự. Đầu ra
được dọn: bỏ ```/ngoặc/đánh số, bỏ trùng, cắt theo câu.

### Giao diện `<AiVietHo>`

Nút dưới mỗi ô chữ (không ô chọn, không ô URL) → chọn nhà cung cấp (mặc định
theo ô "Trợ lý AI" của form) + gợi ý + **Viết** → poll job 1,5 giây, tối đa 3
phút → điền vào ô. "**N bản đã viết**" → *Dùng bản này* / *bản trước đó*.
Gắn vào: form module `/automations/run/*`, trang Quy trình, thẻ lịch đăng
(`audienceBrief`, `chuDe` dạng danh sách, giới hạn 160 ký tự/mục). Lịch sử
theo (dự án, ô) nên cùng ô ở hai trang thấy cùng lịch sử — chủ đề gõ ở Quy
trình dùng lại được ở lịch đăng.

Gõ cửa bằng trình duyệt ở máy: nút hiện đúng chỗ; bấm Viết khi chưa có khoá
→ *"Chưa có API key deepseek — vào trang API Keys…"* (không treo); chèn hai job
giả vào `local.db` → "2 bản đã viết" → *Dùng bản này* và *bản trước đó* đổi
đúng giá trị ô. Dọn job giả sau khi thử.

Test: 7 đơn vị + 3 tích hợp (engine thật, AI giả). 310/310 · tsc · lint.

### Chưa làm

Form sửa dự án (tên, ngành, giọng) chưa có nút — giá trị thấp; thêm khi cần.

## 12/09/2026 — VÒNG 16 · máy chạy theo lịch: mỗi ngày một bài, VPS gõ nhịp

Chủ dự án chốt bốn điều (12/09, rạng sáng): VPS kích hoạt · giữ duyệt tay ·
chủ đề từ danh sách rồi Search Console · **mỗi ngày một bài** (nâng từ 2–3
ngày). Dựng xong trong vòng này, commit `e479319`.

### Thiết kế — vì sao không có "bảng lịch" riêng

- **Lưu ở `project_integrations` loại `lich_dang`** — enum chỉ ở TypeScript,
  `drizzle-kit generate` in "No schema changes". Không đụng migration Neon
  `0004` còn chưa xác nhận.
- **Tiến độ một lượt suy ra từ bảng job**, không lưu riêng: mỗi bước của mỗi
  lượt có khoá chống trùng TẤT ĐỊNH (`uuidTatDinh("lich-dang:<dự án>:<ngày>#
  <lần>:buoc<i>:lan<thử>")`, UUID v8 để qua `z.uuid()`). VPS gõ trùng lúc với
  lượt tự gõ tiếp → cùng khoá → bảng job từ chối bản thứ hai. Không có trạng
  thái thứ hai để lệch với trạng thái thật. Bỏ tính tất định → 8 test đỏ.
- **Mỗi lần gõ đi đúng một bước** (trần 300 giây của Vercel Hobby). Bước xong
  thì `after()` gọi HTTP tới chính mình để bước kế có lượt 300 giây mới; nhịp
  10 phút của VPS là lưới an toàn. Kẹt 15 phút → đánh dấu hết giờ, thử lại một
  lần; hỏng hai lần → dừng lượt, hôm sau thử lại chủ đề; hỏng hai lượt → bỏ
  chủ đề. Lượt dở quá 2 ngày → hết hạn.
- **8 bước** = luồng bài viết bỏ #13 (llms.txt/sitemap — bước đăng không đọc,
  website tự sinh) + đẩy sang website với `ngayDang` = ngày của lượt. Bài vào
  hàng chờ duyệt như mọi bài khác.
- **Chủ đề GSC:** vị trí 11–30, ≥4 chữ, bỏ gần trùng (Jaccard ≥0,6) với chủ đề
  đã đăng — không viết hai bài tranh nhau một truy vấn. Cần
  `layTruyVanChoLich` mới (250 truy vấn) vì bảng top-15 của trang phân tích
  toàn truy vấn đã ở trang 1.
- **Chạy bằng khoá AI + token Google của người bấm Lưu.** Lúc lưu kiểm ngay có
  khoá cho nhà cung cấp đã chọn — lỗi hiện ở đây, không phải 6 giờ sáng mai.

### Một lỗi cũ tìm ra khi đo luồng: bản ghim thắng lượt chạy

Engine nối ngữ cảnh bằng "bản chính thức" mỗi module (ghim, không thì mới
nhất). Chạy cả luồng: bước 8 có thể đọc tiêu đề CỦA CHỦ ĐỀ KHÁC đã ghim tuần
trước → bài lai hai chủ đề, không lỗi nào báo. Giờ job mang `upstreamJobIds`
(các bước đã xong của chính lượt) và chúng thắng bản ghim
(`domain/modules/upstream.ts`, 5 test). Trang Quy trình cũng dùng.

### Đã gõ cửa bằng trình duyệt ở máy

Lưu → dòng crontab hiện một lần → `curl` tick ba lần trước giờ (`chua-toi-gio`)
→ sai mã 401 → "Chạy thử một bài ngay" với khoá DeepSeek **giả** (không tốn
tiền): bước 1 hỏng, tự gõ tiếp, thử lại, dừng — thẻ kể đúng: *"dừng ở bước 1:
AI provider từ chối… api key ****0000 is invalid"*. Bắt được một lỗi giao
diện: hai ô đổi liên tiếp thì ô sau đè ô trước (spread closure cũ) → cập nhật
theo hàm. Dọn khoá giả + lịch thử khỏi `local.db`.

Test: 21 đơn vị (lịch) + 5 (upstream) + **10 tích hợp chạy engine THẬT trên
SQLite** với AI giả và website giả. 299/299 · tsc · lint sạch.

### Vòng sau

- Chủ dự án: mở trang dự án halongxanh360 trên Vercel → thẻ "Lịch đăng bài tự
  động" → điền → Lưu → dán dòng crontab vào VPS (VIEC-CAN-LAM mục 15).
- Chưa làm: ảnh Drive gắn vào bài (cổng ingest chưa nhận ảnh); trình dựng
  website (sau Chủ nhật).

## 12/09/2026 — VÒNG 15 · bảng khách trống, ảnh trong thư mục con, và nghiên cứu hẹn giờ đăng

Chủ dự án gửi ba việc (ảnh khuya 11/09): khung Drive không đọc ảnh trong thư mục
con `anh-goc-chat-luong-cao`; thử form liên hệ thấy "Đã nhận" mà bảng trống;
nghiên cứu **tự động đăng bài (hẹn giờ) và tạo website**.

### Bảng khách trống — nguyên nhân thật nằm bên kho site

`docker-compose.yml` của website **không chuyển `LEAD_WEBHOOK_TOKEN` vào hộp
chứa** (`.dockerignore` loại `.env` khỏi ảnh, hộp chứa chỉ thấy biến khai trong
compose). Website gửi khách tới đây không kèm token → 401 → khách rơi về tệp
trên VPS. Sửa + phép kiểm máy bên kho site (39304d7) — chi tiết ở nhật ký kho đó.

Phía Antigravity, hai lớp chẩn đoán:

1. **063d944** — mỗi lượt website gọi tới để lại dấu vết (`lanNhanCuoi`,
   `ketQuaCuoi` trong config của `lead_sheet`); thẻ dịch ra câu chữa được; nút
   **"Gửi thử một dòng vào bảng"** (thử nửa Antigravity → Google, không cần
   website); thẻ hiện **địa chỉ đầy đủ** `https://…` để chép. Bản đầu của thẻ
   hiện đường dẫn tương đối — dán nguyên thế vào `.env` là website không gọi
   được mà vẫn báo khách "Đã nhận". Đó là một nghi phạm, giờ đã khoá.
2. **9449015** — thiếu token trước đây bị route chặn **trước** khi ghi dấu vết,
   nên thẻ sẽ nói "Chưa nhận lượt nào từ website" — sai, và dẫn chủ dự án đi
   kiểm sai chỗ. Giờ ghi `thieu-token` (giới hạn 1 lần/phút chung với
   `sai-token`). Câu cho `sai-token` không còn khuyên "lập bảng mới" trước —
   lập lại là đẻ thêm bảng. Test tích hợp 5 ca; bỏ dòng ghi → 2 ca đỏ.

### Ảnh trong thư mục con (063d944)

`lietKeAnh` giờ đi cây thư mục: **2 tầng, tối đa 25 thư mục, 200 ảnh**, cây
nhớ 5 phút. Proxy ảnh thu nhỏ kiểm cha của tệp nằm trong cây (không phải chỉ
thư mục gốc) — không mở thành cửa xem mọi ảnh trong Drive. Thẻ gom theo thư mục,
mỗi nhóm hiện 18 ô trước, "Xem tất cả N ảnh". Ảnh → bài đăng: **vẫn chưa làm**,
thẻ nói thẳng.

### Nghiên cứu tự động đăng bài — `docs/nghien-cuu-tu-dong-dang-bai.md`

Đo trên mã, không đoán:
- Hẹn **ngày** đã có (`ngayDang`, `vinhomes-publish.ts:78`), website lọc đúng.
- Luồng **"Chuỗi bài viết → đẩy thẳng sang site"** (`registry.ts:108`) đã nối
  8 bước viết + bước đăng → hàng chờ duyệt. Thiếu duy nhất: nó chạy **trong tab
  trình duyệt** (`pipeline-runner.tsx:419`). `buildInput` chỉ ~15 dòng.
- Vercel Hobby: cron **1 lần/ngày, lệch ±59 phút**, một lượt tối đa **300 giây**
  → không chạy liền 9 bước. Đề xuất: máy chạy theo lịch từng bước, VPS crontab
  gõ `/api/v1/lich/tick` mỗi 10 phút, lịch lưu trong `project_integrations`
  (loại mới, không cần migration), **giữ duyệt tay** (scaled content abuse +
  câu sai về giá/pháp lý). Trình dựng website: **không kịp Chủ nhật**.
- Soát tài liệu với mã trước khi ghi sổ bắt được 3 chỗ sai của chính tôi:
  "bốn preset" (thật: năm, và cái thứ năm là cái quan trọng nhất), "41
  component" (thật: 40), "DeepSeek rẻ nhất" (bảng mô hình xếp bốn mô hình cùng
  hạng giá 1 — câu đó không có nguồn, đã bỏ).

**Chưa dựng gì cho hẹn giờ** — chờ chủ dự án chọn bốn điều (VIEC-CAN-LAM mục 15).

259/259 test · tsc · lint sạch.

### Vòng sau

- Chủ dự án: trên VPS chạy `./trien-khai.sh` (lấy compose đã sửa) → thử form →
  mở trang dự án đọc dòng "Lượt gần nhất". Kỳ vọng: "đã ghi vào bảng" + các
  dòng "gửi bù".
- Chủ dự án trả lời mục 15 → dựng máy chạy theo lịch.
- Nửa sau của sửa IndexNow bên site (báo khi bài hẹn tới ngày) đi cùng nhịp gõ
  hằng ngày của máy chạy theo lịch.

## 11/09/2026 — VÒNG 14 · bảng khách đã lập, nút xoá dự án, và ảnh cho Drive

**Chủ dự án làm xong bước 1–5 của mục 0.** App đã In production sẵn (không có
hạn 7 ngày), `drive.readonly` đã khai, kết nối lại được "7 quyền đã cấp", bảng
khách đã lập, thư mục Drive "Ảnh Hạ Long Xanh" đã nối (đang rỗng).

### Nút xoá hẳn dự án (chủ dự án yêu cầu)

Khác "Lưu trữ". Chỉ chủ workspace. **Bắt gõ đúng tên** — ba trong năm dự án
tên gần giống nhau; máy chủ kiểm lại tên, gọi API thẳng không lách được.

⚠️ `module_jobs` có `project_id` mà **không có khoá ngoại** — bảy bảng khác tự
xoá theo nhờ cascade, riêng lịch sử chạy thì nằm lại mồ côi nếu chỉ xoá dòng dự
án. Xoá tay trong cùng giao dịch. Test tích hợp SQLite thật + làm nó đỏ (bỏ dòng
xoá jobs → test bắt được) + gõ cửa bằng trình duyệt (tạo → gõ thiếu tên nút khoá
→ đúng tên xoá → 404; API tên sai → 400).

### Ảnh cho thư mục Drive — không tải thẳng được, gom sẵn để kéo thả

Công cụ Drive của tôi chỉ nhận tệp dưới dạng base64 gõ thẳng trong lời gọi — 70
MB ảnh là hàng chục triệu ký tự, không khả thi. Token Google của Antigravity là
`drive.readonly` (và `drive.file`, không ghi được vào thư mục người dùng tạo).
Nên: gom sẵn `D:\vinhomes_ha_long_xanh\.tmp\anh-cho-drive\`, mở sẵn cửa sổ đó và
thư mục Drive, chủ dự án kéo thả.

- **60 ảnh đang dùng trên trang** ở gốc thư mục — khung Antigravity chỉ đọc ảnh
  nằm trực tiếp trong thư mục, không đọc thư mục con.
- **27 ảnh gốc chất lượng cao** trong thư mục con `anh-goc-chat-luong-cao/`.
- `danh-sach-anh.csv` — tên tệp, kích thước, **mô tả alt của trang**, có bản gốc
  hay không. 60/60 ảnh có mô tả.
- **Bỏ 6 ảnh trong danh sách cấm** (3 ảnh AI, thuỷ cung Okinawa, nhà hàng dưới
  nước, ảnh trùng) + bản gốc của ảnh thuỷ cung. Đưa chúng vào thư mục ảnh dự án
  là mời chúng quay lại bài đăng.

### Bên website cùng vòng

Khách từ trước khi có webhook đang nằm trong `.data/dang-ky.jsonl` trên VPS mà
chưa ai mở — website giờ **tự đẩy bù** sang bảng mỗi lần gửi được một khách mới
(chi tiết ở nhật ký kho site). Đã đẩy trước khi chủ dự án chạy bước 6.

254/254 test · lint sạch.

### Vòng sau

- Chủ dự án: bước 6 (dán hai dòng vào `.env` VPS + deploy), bước 7 (thử một
  khách), kéo ảnh vào Drive.
- Sau bước 7: bảng có thể hiện thêm dòng "gửi bù" — khách thật từ trước.

## 11/09/2026 — VÒNG 13 · hai quyền Google xin từ đầu, giờ mới được dùng

Chủ dự án chốt: làm tính năng cho Drive (ảnh tải lên → dùng cho bài) và Sheets
(khách liên hệ → tự điền vào bảng). Hạn: chủ nhật 13/09.

### Sheets — khách liên hệ vào thẳng bảng của chủ dự án

Trước: form website gửi `LEAD_WEBHOOK_URL` nếu có, không thì ghi `.data/dang-ky.
jsonl` trên VPS — tệp sống qua deploy nhưng không ai mở. Số điện thoại thật nằm
trong một tệp JSONL.

Giờ: trang dự án có nút "Lập bảng" → Antigravity tạo Sheet bằng token Google của
người bấm, sinh token chia sẻ → website POST tới `/api/v1/lien-he/[projectId]` →
một dòng mới. Hợp đồng hai kho tách ra `domain/lead/khach-lien-he.ts` (8 test).

**Bốn quyết định, đều vì mất khách hoặc lộ khách:**
- Schema **không** strict — website thêm trường là mọi lượt khách trả 400.
- Website: webhook hỏng thì **rơi về tệp trên VPS**, không ném lỗi. Trước đây
  hỏng webhook là khách thấy "chưa gửi được" và số điện thoại biến mất. Đích
  mới đi qua ba lớp hỏng độc lập (Antigravity, token Google, API Sheets).
- `lead_sheet` **không** vào `socialIntegrationTypes`: danh sách đó là cổng vào
  của `PUT /integrations/[type]` — biên tập viên ghi được config tuỳ ý, mà config
  này quyết định token của AI ghi và ghi vào ĐÂU.
- Lập bảng **chỉ chủ workspace** (`workspace.secrets.manage`) — bảng tạo bằng
  token của người bấm, tức khách chảy vào Drive của người bấm.

Cổng trả 401 **như nhau** cho sai token / chưa lập / dự án không có. Đã gõ cửa
thật: 5 nhánh đúng thiết kế.

### Drive — ảnh tải lên thư mục hiện ngay trong dự án

`drive.file` → `drive.readonly`. `drive.file` chỉ thấy tệp DO APP TẠO; ảnh tải
bằng app Drive trên điện thoại sẽ vô hình — thư mục hiện rỗng, không lỗi nào.
Test khoá lại để không ai "thu hẹp quyền cho an toàn".

Đường ảnh thu nhỏ đọc bằng token của người nối thư mục, nhận `fileId` từ địa
chỉ yêu cầu — nên **kiểm thư mục cha**. Bỏ bước đó là ai biết mã một tệp đều
xem được tệp đó trong Drive của chủ dự án.

**Chưa làm, và thẻ nói thẳng:** gắn ảnh vào bài đăng lên website. Cổng
`/api/ingest` chưa nhận ảnh; cần sửa hai kho + deploy. Để chủ dự án chọn có làm
trước chủ nhật không.

### Phát hiện có hạn: chế độ "Testing" làm token chết sau 7 ngày

Tài liệu Google: *"a publishing status of 'Testing' is issued a refresh token
expiring in 7 days"*. Kết nối Google cấp 09–11/09 sẽ chết ~16–18/09 nếu app còn
Testing. Chữa: Publish app → In production. Google gọi dưới-100-người là
"personal use" — không cần thẩm định, chỉ có màn cảnh báo. Chưa kiểm được chế độ
hiện tại từ đây — đã ghi thành bước 1 của mục 0 `VIEC-CAN-LAM.md`.

### ⚠️ Sự cố trong lúc làm — ghi để không lặp

Một kịch bản tạm tên `enum.py` trong `$TEMP` **che mô-đun chuẩn** của Python.
`import re` kéo nó vào thay `enum` thật, và nó CHẠY LẠI đoạn sửa cũ — chèn
`"lead_sheet"` ba lần vào hai tệp schema. Đo, gỡ về một, xoá tệp. **Từ nay:
chạy kịch bản tạm bằng `python -P`** (không cho thư mục kịch bản chen trước thư
viện chuẩn), và không đặt tên kịch bản trùng mô-đun chuẩn.

### Số đo

253/253 test (thêm 14) · lint sạch · site 13/13 · cả hai tính năng gõ cửa thật
trên máy (không có Google thật để thử lượt ghi/đọc).

### Vòng sau nên làm

- Chủ dự án làm mục 0 → lượt khách thật đầu tiên vào bảng, thư mục ảnh thật đầu
  tiên — lúc đó mới biết hai tính năng chạy với Google thật.
- Khách rơi về tệp khi webhook hỏng: chưa có cách đẩy lại vào bảng khi hết hỏng.
- Ảnh Drive → bài đăng website: chờ chủ dự án chọn.

## 11/09/2026 — VÒNG 12 · lần đầu hai khối chạm Google thật, và chúng đọc được

### Số Google trả về, 21:14

| | |
|---|---|
| Property | `sc-domain:halongxanh360.vn` |
| Clicks / hiển thị (12/08 → 08/09) | 0 / 0 — khoảng đo kết thúc **trước** ngày vào chỉ mục (09/09). Là lịch, không phải lỗi |
| Đã vào chỉ mục | **16/31** |
| Trang chủ crawl lần cuối | **20:46 11/09** — deploy xong trước 20:35, tức Google đã đọc bản tên mới trong vòng một giờ, không cần Request indexing |

**15 trang chưa vào**, hai nhóm: 11 "đã phát hiện – chưa lập chỉ mục" (Google
biết, chưa ghé), 4 "không xác định được URL" (chưa từng thấy). Trong đó **7/9
phân khu và 4/5 dòng sản phẩm** — đúng những trang nhật ký ghi là mỏng từ 09/09.

### Đo ra nguyên nhân cấu trúc, không chỉ nội dung

Đếm liên kết từ 16 trang đã vào chỉ mục tới từng trang chưa vào:

```
bốn trang trên thanh điều hướng     16/16 trang trỏ tới
mỗi trang phân khu / sản phẩm        3–4/16
```

Google xếp lịch crawl theo đúng mật độ đó. Chú thích trong chân trang đã ghi
quy tắc *"thêm một trang thì thêm luôn một dòng ở đây"* — 14 trang này dựng
SAU câu đó, không ai thêm. Thêm dải liên kết gọn (flex-wrap, `min-h-11`, không
phình chân trang điện thoại). Đo trên bản dựng: mọi trang giờ trỏ tới 14/14.
Chờ deploy.

### Hai chuyện lộ ra nhờ dữ liệu thật

- **Khối giải thích dưới bảng trống trơn.** Tôi gửi `languageCode: "vi"` nên
  Google trả câu tiếng Việt, mà mã so chuỗi tiếng Anh. Đúng kiểu lỗi chỉ lộ khi
  chạm dữ liệu thật. Đã sửa, so cả hai thứ tiếng.
- **Hai lần soi cách 7 phút cho hai tập "không xác định được" khác nhau** — ba
  trang chuyển sang "đã phát hiện" (Google vừa nạp sitemap chủ dự án nộp lại),
  hai trang đi ngược. Cả hai trạng thái đều là "chưa crawl"; ranh giới giữa
  chúng đồng bộ không đều giữa máy chủ Google. **Chỉ "đã vào chỉ mục" là mốc
  thật.** Và vì sao soi lại dù đệm 30 phút: Vercel nhiều máy, mỗi máy một đệm —
  đúng giới hạn đã ghi trong mã.

### Nhận định AI giờ thấy cả 15 trang chưa vào

`buildIndexSummary` nạp danh sách trang chưa vào kèm câu Google nói vào prompt —
chỉ phần chưa vào, không liệt kê phần đã vào (model sẽ khen chúng thay vì nói về
15 trang đang kẹt). Prompt yêu cầu: clicks và hiển thị bằng 0 thì nói thẳng là
chưa có dữ liệu, đừng suy diễn.

### Gạch được

Mục 7 (mở /analytics), mục 12 (Vercel tự deploy — UI mới lên ~4 phút sau push),
nộp lại sitemap (31/31 đã khám phá). Mục 2 giờ là "deploy dải chân trang +
llms.txt", không gấp.

239/239 · lint sạch.

### Hydration mismatch — tồn ba vòng, hoá ra không phải của `/analytics`

Đọc trọn thông báo (kịch bản soi cũ cắt ở 200 ký tự): mismatch ở thẻ `<html>` —
máy khách gắn `data-theme="light"` từ localStorage TRƯỚC khi React hydrate, máy
chủ dựng không có. Xảy ra ở MỌI trang, kể cả `/login`. Ba vòng ghi nó vào "vòng
sau" của `/analytics` vì chỉ nhìn thấy nó ở đó. **Bài học: đọc trọn thông báo
lỗi trước khi xếp nó vào đâu.** `suppressHydrationWarning` trên `<html>` — đúng
trường hợp React dành cho nó. Đo lại: "Lỗi trang: không có".

### Vòng sau nên làm

- Ngày **13/09** mở lại: khoảng đo phủ 09–10/09, lượt hiển thị đầu tiên nếu có.
- Sau deploy dải chân trang: soi lại xem 11 trang "đã phát hiện" chuyển động.
- Quyền Drive/Sheets vẫn đang xin mà không dùng — cần chủ dự án quyết: làm
  tính năng, hay bỏ hai scope khỏi màn cấp quyền.

## 11/09/2026 — VÒNG 11 · lượt gọi thật thứ hai lộ ra dữ liệu sai ba tuần, và một câu hỏi tôi né

### 403 đúng là API chưa bật — chủ dự án bật xong là thông

Ảnh Google Cloud xác nhận: trước đó API **chưa** bật. Bật xong, lượt gọi thật thứ
hai trả lời: tài khoản đang quản lý `sc-domain:halongxanh360.vn` — đúng
property, đúng loại tốt nhất.

### …và lộ ra dự án ghi website là địa chỉ xem thử từ tháng 8

`https://vinhomeshalongxanh-five.vercel.app`. Chưa ai đổi sang tên miền thật vì
mọi thứ khác vẫn chạy — ô website chỉ được đọc để nhét vào prompt hay hiện ra
màn hình, không chỗ nào dùng nó để gọi API. Chỗ duy nhất nó lộ ra là Search
Console: không bao giờ có property cho một địa chỉ xem thử. **Mã so không khớp
nên từ chối, đúng thiết kế — và nhờ vậy mới lộ.** Giao diện giờ nhận ra
`.vercel.app` / `.netlify.app` / `localhost` và chỉ thẳng vào ô cần sửa.

### Rồi chủ dự án hỏi đúng câu tôi đã né

*"Nó ghi đổi tên website trong dự án nhưng tôi có cả 5 dự án mẫu đang thử thì
biết là đổi của dự án nào."* Ba trong năm dự án cùng địa chỉ `.vercel.app`.
Màn hình lấy "dự án hoạt động đầu tiên" rồi im.

Nhật ký vòng 9 ghi rõ *"Bốn thẻ số vẫn lấy dự án hoạt động đầu tiên… chưa có ô
chọn"* vào mục vòng-sau-nên-làm. Tức là tôi **biết**, và xếp nó xuống. Cái giá:
người dùng đứng trước một chỉ dẫn không thể làm theo. **Bài học:** "chưa có ô
chọn" khi có nhiều hơn một lựa chọn không phải việc-để-sau; nó là lỗi.

Sửa: form GET `?duAn=<id>` — không JavaScript, link chia sẻ được, nút Back chạy.
Hiện cả khi chỉ có một dự án. Mọi câu chữ gọi đúng tên dự án, link thẳng tới
trang sửa. Nhận định AI cũng nhận `projectId`.

### Khối mới: Google đã lập chỉ mục trang nào

URL Inspection API — soi từng địa chỉ trong sitemap thật: vào chỉ mục chưa,
Google nói gì, crawl lần cuối lúc nào, canonical có lệch không. Trước đây câu
"Google index chưa" trả lời bằng cách mở Search Console bấm từng địa chỉ rồi
chụp màn hình — 31 địa chỉ là 31 lần bấm, nên không ai làm.

Ba quyết định trong tầng thuần, đều có test:
- **Bị chặn xét TRƯỚC verdict.** Trang bị robots chặn cũng mang `FAIL`; xếp theo
  verdict trước là nó rơi vào "chưa vào" — đúng về kết quả, sai về việc cần làm.
- **Canonical lệch chỉ so khi cả hai có giá trị.** Trang mới chưa có
  `googleCanonical`; so với rỗng là báo động giả cho mọi trang mới.
- **Một địa chỉ lỗi không làm hỏng cả bảng.**

Dòng *"Trang chủ: Google crawl lần cuối <lúc>"* là câu trả lời cụ thể nhất sau
khi đổi tên site: Google đọc bản mới chưa.

Hạn mức: 2.000 lượt/ngày mỗi property, 600/phút (Google, "Usage limits"). 31
địa chỉ, 5 luồng song song, đệm 30 phút — còn xa. Suspense **riêng**: soi mất
10–20 giây, không được kéo bốn thẻ số chờ theo.

### Bên kho site cùng vòng

`llms.txt` mở đầu bằng `# Vinhomes Global Gate Hạ Long` — tệp viết riêng cho AI
mà cùng lỗi tên. Quy ước llmstxt.org: H1 là tên site. Đã sửa cùng ba việc tồn
từ vòng 6 (link `[tên](url)`, mốc ngày giờ VN). `kiem-ten-site` thêm chỗ thứ 5.

Chủ dự án đã deploy, `bao-bing` gửi 31 địa chỉ, Bing nhận 202. GBP để sau;
hướng dẫn đã viết (`HUONG-DAN-GOOGLE-BUSINESS.md`), điểm chính: tên hồ sơ phải
`[Sàn]: [Tên]` vì video xác minh cần giấy tờ khớp tên.

### Số đo

239/239 test (thêm 11) · lint sạch · mở bằng trình duyệt: ba khối dựng đúng,
`?duAn=` lạ không 500.

### Vòng sau nên làm

- **Khối lập chỉ mục chưa chạm Google thật** — chưa có token trên máy này. Lần
  chủ dự án mở `/analytics` sau khi sửa website dự án là lần đầu.
- Ba dự án cùng địa chỉ `.vercel.app` — chủ dự án cần chọn MỘT làm thật, đổi
  website, và cân nhắc lưu trữ hai cái kia. Đã ghi vào `VIEC-CAN-LAM.md`.
- Hydration mismatch trên `/analytics` vẫn còn (có từ trước vòng 8).

## 11/09/2026 — VÒNG 10 · lượt gọi Google thật đầu tiên, và một mã 403 có ba nghĩa

### 403 sau khi đã kết nối lại — vì "kết nối lại" không phải việc cần làm

Chủ dự án mở `/analytics` trên bản Vercel mới: **lượt gọi Search Console thật
đầu tiên**. Trả 403. Giao diện hiện "tài khoản không có quyền đọc property này"
và gợi ý kết nối lại. Kết nối lại — vẫn 403.

Huy hiệu xanh là thật (token đủ scope, vì mã kiểm scope TRƯỚC khi gọi). 403
*sau khi* có quyền gần như chắc chắn là chuyện khác: **API Search Console chưa
được bật trong dự án Google Cloud.** Quyền OAuth và API là hai công tắc riêng —
"Data Access đã lưu đủ 6 quyền" (mục ✅ ngày 09/09) là công tắc thứ nhất.

Google gói lý do trong thân phản hồi, `error.errors[0].reason`, và với trường
hợp này còn nhét sẵn **đường link bật API mang project ID** vào `error.message`.
Mã vòng 8 đọc thân đó rồi… ghi vào log Vercel và ném ra đúng ba chữ "HTTP 403".
Lý do thật và cách sửa nằm ở nơi chủ dự án không đọc; giao diện thì gợi ý việc
duy nhất không sửa được gì.

**Ba lý do 403 ở API này, ba việc khác nhau** — giờ giao diện nói đúng tên:

| `reason` | Nghĩa | Việc |
|---|---|---|
| `accessNotConfigured` | API chưa bật trong Cloud project | Bấm link bật, chờ 1–2 phút |
| `forbidden` | Tài khoản không có quyền trên property | Kết nối bằng đúng tài khoản |
| `insufficientPermissions` | Token thiếu scope | Cấp lại quyền |

Trạng thái `api-chua-bat` có nút riêng — link lấy từ chính thân phản hồi. Nút
"kết nối lại" KHÔNG hiện trong trạng thái đó, vì bấm bao nhiêu lần cũng vẫn 403.

⚠️ **Chưa xác nhận đây là nguyên nhân thật.** Tôi đoán từ triệu chứng, không từ
log. Bản mới sẽ hiện đúng `reason` Google trả — nếu là thứ khác, sẽ biết ngay và
không ai phải đi bật một API đã bật.

### Phần đọc lý do tách ra domain

`docLyDoGoogle(than)` nằm ở `domain/seo/search-console.ts`, test bằng thân lỗi
**thật** của Google (rút gọn). Lớp `LoiGoogle` ở tệp `.server` chỉ bọc nó.

### Bài học

Một mã HTTP không phải một lý do. Ghi thân phản hồi vào log rồi trả ra giao diện
mỗi con số là biến một câu trả lời rõ ràng thành một câu đố — và người giải đố
là người ít thông tin nhất.

228/228 test (thêm 3) · lint sạch.

### Chuyện bên kho site cùng ngày

Tra "halongxanh360" không ra trang: site tự xưng là dự án của Vinhomes ở cả bốn
chỗ Google đọc tên site. Chi tiết trong `NHAT-KY.md` bên kho halongxanh360, vòng
10. Việc chủ dự án: `VIEC-CAN-LAM.md` mục 7b.

## 10/09/2026 — VÒNG 9 · làm Search Console thành thứ dùng được

Vòng 8 nối được API. Vòng này làm cho nó đáng mở.

### Đã mở trang bằng trình duyệt thật — việc vòng 8 ghi là "còn nợ"

`HTTP 200 · dựng xong sau 1025 ms · không lỗi trang.` Trạng thái "chưa kết nối"
hiện đúng cả sáu câu chữ. Đây là thứ typecheck không trả lời được, và vòng 8 đã
ghi vào mục "vòng sau nên làm" thay vì tự nhận là xong.

⚠️ Playwright **chưa cài trình duyệt** trên máy này — nghĩa là `npm run
audit-giao-dien` của kho cũng đang không chạy được. Đã `npx playwright install
chromium`. Nếu phiên sau gặp lại lỗi "Executable doesn't exist" thì đó là chuyện
cũ, chạy lại lệnh đó.

**Còn một cảnh báo chưa xử:** hydration mismatch trên `/analytics`. Nó có TỪ
TRƯỚC khi tôi sửa (thấy ở lần chạy đầu tiên, trước cả refactor Suspense), nên
không phải do vòng này. Chưa lần ra nguồn — ghi lại để không ai tưởng đó là hậu
quả của bản mới.

### Cố vấn AI tự xưng "SEO + GEO" mà chỉ nhìn thấy số lần chạy module

Dòng chữ dưới nút bấm đã hứa sẵn từ trước: *"Sẽ mở rộng sang dữ liệu xếp hạng
GSC khi kết nối."* Nhưng dữ liệu duy nhất nó có là `module_jobs`. Từ đó thì lời
khuyên hay nhất nó đưa được cũng chỉ là "chạy thêm module" — **một câu về công
cụ, trong khi người dùng cần câu về thứ hạng.**

Giờ nạp cả truy vấn, trang, vị trí vào. Hai ràng buộc đi kèm, và cái thứ hai
quan trọng hơn: cấm bịa số không có trong dữ liệu, và **khi CHƯA kết nối thì nói
thẳng với model rằng nó không có số thứ hạng nào** — không nói thì nó sẽ suy đoán
rất trôi chảy về những thứ hạng không tồn tại.

### Một lời hứa trên giao diện là một cái bẫy trí nhớ

Câu "Sẽ mở rộng sang… khi kết nối" nằm đó bao lâu rồi không ai biết. Nó đã thành
sự thật hôm nay — nhưng nếu tôi không tình cờ đọc lại đúng dòng đó thì nó còn nằm
ở thì tương lai thêm nhiều vòng nữa.

**Quy ước rút ra:** câu chữ hứa hẹn trên giao diện phải đi kèm một chú thích
trong mã nói rõ ai làm và bao giờ, hoặc đừng viết. Đã đổi sang thì hiện tại và
ghi chú lý do ngay cạnh.

### Gỡ bảng "Được AI trích dẫn (GEO)" — nó không bao giờ có dữ liệu

Bảng đó hứa theo dõi nội dung được ChatGPT / Perplexity / AI Overviews nhắc tới,
bên dưới một ô trống. Tra ba nguồn:

- **Search Console gộp** lượt hiển thị trong AI Overviews vào tổng chung, không
  có chiều nào lọc riêng.
- **ChatGPT và Perplexity** không phát API nào cho chủ trang.
- **`log-bot.mjs`** bên kho halongxanh360 nghe như bản ghi lượt bot — nhưng đọc
  mã thì nó **GIẢ LÀM bot** để kiểm trang có phục vụ nội dung không. Nó không ghi
  lượt truy cập thật của ai cả.

Nên đó đúng là "tấm biển đội lốt tính năng" mà chú thích đầu `page.tsx` cảnh báo.
Người dùng nhìn ô trống rồi chờ nó đầy lên, và nó sẽ không bao giờ đầy. Thay bằng
lời nói thẳng vì sao không có, cộng thứ đo được thật ngay bên trên.

### Ba cải tiến còn lại

- **Suspense.** Bốn lượt gọi GSC, mỗi lượt tối đa 20 giây, trước đây `await`
  thẳng trong component trang → Google chậm là trắng cả trang, kể cả biểu đồ hoạt
  động nội bộ đọc từ cơ sở dữ liệu của chính mình.
- **Bảng truy vấn.** Top trang cho biết cái gì đang chạy được; top truy vấn cho
  biết **nên viết gì tiếp**. Nhãn "đuôi dài" (≥7 chữ) — và đã ghi rõ trong mã
  rằng đếm chữ theo khoảng trắng là phép **xấp xỉ** với tiếng Việt, vì tiếng Việt
  viết rời từng âm tiết còn ngưỡng gốc đo trên tiếng Anh.
- **Bộ nhớ đệm 30 phút.** Chỉ nhớ kết quả THÀNH CÔNG — nhớ cả lỗi thì người dùng
  bấm kết nối lại xong vẫn đọc y nguyên câu báo lỗi cũ trong nửa tiếng, rồi kết
  luận việc kết nối lại không ăn thua.

### ⚠️ Suýt tự tạo lại đúng lỗi mình vừa đi sửa

Viết xong `xoaDemHieuQua()` rồi **không cắm nó vào đâu cả**. Đúng kiểu
`RIS_VHGG_PUBLISH` — hàm tồn tại, đăng ký đàng hoàng, không có đường nào chạm
tới. Lint không bắt được vì nó được `export`.

Đã nối vào callback OAuth. Kịch bản nó cứu: đổi sang tài khoản Google khác mà vẫn
thấy số của tài khoản cũ — sai thật, và sai một cách rất khó nghi ngờ.

### Số đo

225/225 test (thêm 5) · lint sạch · typecheck sạch · trang mở được bằng trình
duyệt thật.

### Vòng sau nên làm

- **Chưa có lượt gọi Google THẬT nào.** Máy này chưa có kết nối OAuth nào trong
  `oauth_connections`, nên mọi nhánh sau `trangThai: "ok"` — cộng số, chọn
  property, bảng truy vấn — mới chỉ chạy qua test tự dựng. Cần chủ dự án mở
  `/analytics` trên bản thật.
- Bốn thẻ số vẫn lấy **dự án hoạt động đầu tiên**. Đã hiện chú "đang xem 1 trong
  N dự án" khi có nhiều hơn một, nhưng chưa có ô chọn.
- Quyền Drive và Sheets vẫn đang xin mà chưa ai gọi.
- Hydration mismatch trên `/analytics` (có từ trước vòng 8).

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
