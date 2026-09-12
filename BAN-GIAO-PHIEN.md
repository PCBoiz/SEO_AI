# Bàn giao phiên — đọc tệp này đầu tiên khi mở phiên mới

*Cập nhật 13/09/2026 (vòng 76). Viết để một phiên mới bắt kịp trong 5 phút mà không phải
đọc lại toàn bộ lịch sử.*

---

## Vì sao phải đổi phiên

Phiên cũ đã tích **401 khối ảnh**. Quy định của API: một yêu cầu chứa **trên 20
ảnh** thì mỗi ảnh phải ≤ 2000px cạnh dài. Trong lịch sử phiên cũ có những tấm
2560px, nên **mọi ảnh gửi thêm đều bị từ chối bất kể kích thước của chính nó** —
kể cả một tấm 120×60 nặng 192 byte.

Thông báo lỗi nói về kích thước nên rất dễ hiểu nhầm; tôi đã mắc bẫy ba lần, thu
ảnh xuống 1200px rồi 900px rồi 760px vẫn bị.

**Phiên mới có lịch sử sạch nên gửi ảnh lại được bình thường.** Để tránh lặp lại:
giữ ảnh dưới 2000px ngay từ đầu thì ngưỡng không bao giờ kích hoạt.

---

## Hai kho, hai cuốn sổ

| Kho | Đường dẫn | Sổ |
|---|---|---|
| Antigravity OS | `D:\Dự án cô Giang` | `NHAT-KY.md` |
| halongxanh360.vn | `D:\vinhomes_ha_long_xanh` | `NHAT-KY.md` |

**Đọc `NHAT-KY.md` của kho đang làm trước khi bắt tay.** Nó ghi từng vòng: đã tìm
ra gì, đã sửa gì, cái gì hoá ra là dương tính giả, và vòng sau nên làm gì.

---

## Bốn tệp cần biết

| Tệp | Nội dung |
|---|---|
| `D:\Dự án cô Giang\VIEC-CAN-LAM.md` (+ `.pdf`) | **Chỗ duy nhất** ghi việc cần chủ dự án. Mục 0–15 và 18 (16, 17 là số của việc cũ đã xong), xếp theo mức chặn |
| `D:\vinhomes_ha_long_xanh\KE-HOACH-LEN-TIM-KIEM.md` (+ `.pdf`) | Kế hoạch SEO/GEO dựa trên bằng chứng có số. Kèm danh sách việc **không** nên làm |
| `D:\vinhomes_ha_long_xanh\CAU-HOI-CHU-DAU-TU-09-09-2026.pdf` | 10 câu hỏi mang đi gặp chủ đầu tư |
| `D:\vinhomes_ha_long_xanh\HUONG-DAN-GOOGLE-BUSINESS.md` (+ `.pdf`) | Lập GBP từng bước, mọi quy tắc trích tài liệu Google |
| `D:\Dự án cô Giang\docs\nghien-cuu-*.md` | Ba tài liệu nghiên cứu trình dựng website + `nghien-cuu-tu-dong-dang-bai.md` (hẹn giờ đăng, 12/09) |
| `D:\Dự án cô Giang\docs\viec-con-sot.md` (+ `.pdf`) | **Bản rà việc còn sót 12/09** — A chị làm / B đợi ngoài / C tôi làm được, có thứ tự đề xuất |

---

## Cách làm việc đã chốt

Chủ dự án chuyển sang **vòng lặp tự chủ** (09/09): tự đặt câu hỏi, tự nghiên cứu,
tự làm, tự kiểm, tự audit rồi quay lại — **không dừng chờ**. Mọi việc cần chủ dự
án rơi vào `VIEC-CAN-LAM.md` thay vì nằm rải trong câu trả lời.

**Ghi nhật ký cuối MỖI VÒNG, không đợi cuối phiên.** Một phiên chạy nhiều vòng;
chỉ ghi ở cuối thì các vòng giữa biến mất khi ngữ cảnh bị nén.

Giới hạn an toàn **không** đổi: không bịa số liệu, không đăng thứ chưa có nguồn,
không tiêu tiền API cho việc chưa được duyệt, không mở tệp bí mật.

---

## ⚠️ Chạy kịch bản Python tạm: luôn `python -P`, và KHÔNG viết bằng heredoc

Ngày 11/09 một tệp `$TEMP/enum.py` che mô-đun chuẩn `enum`, và `import re` đã
chạy lại một đoạn sửa cũ lên mã nguồn. `-P` chặn thư mục chứa kịch bản chen trước
thư viện chuẩn. Và đừng đặt tên kịch bản trùng mô-đun chuẩn.

**Heredoc trong môi trường này ĂN MỘT NỬA dấu `\`** — kể cả `<<'EOF'` có nháy.
Viết `\\` ra `\`. Hậu quả đã gặp ngày 11/09: `"\\n"` thành xuống dòng thật giữa
chuỗi TypeScript (lỗi biên dịch, hai lần), và đường dẫn `D:\\vinhomes…\\.tmp\\anh…`
thành `D:<tab dọc>inhomes…<chuông>nh…` trong hai tệp sổ. Kịch bản nào có dấu `\`
thì **viết bằng công cụ Write** vào thư mục scratchpad rồi chạy. Quét ký tự lạ:
`scratchpad/quet_ky_tu_la.py` (tự kiểm trên tệp hỏng cài sẵn trước khi quét).

## Lệnh hay dùng

```
# Deploy halongxanh360 lên VPS (IP tra từ DNS 11/09; trien-khai.sh tự git pull)
ssh root@103.7.40.145
cd /opt/halongxanh && ./trien-khai.sh
# Hộp chứa có thấy token khách liên hệ không (không in giá trị):
docker compose exec web sh -c 'test -n "$LEAD_WEBHOOK_TOKEN" && echo CO-TOKEN || echo THIEU-TOKEN'

# halongxanh360
npm run kiem            # tự tìm và chạy MỌI phép kiểm (hiện 19/19)
npm run build
node scripts/thu-nho-anh.mjs --rong=1200 <ảnh>   # soi ảnh bằng mắt

# Antigravity
npm test                # 422/422
npm run lint            # 0 cảnh báo
npm run bao-cao         # sinh BAO-CAO-TRANG-THAI.md bằng số đo thật
npm run md-sang-pdf <vào.md> <ra.pdf>
npm run test:e2e        # 12/12 Playwright (KHÔNG nằm trong npm test — nhớ chạy khi sửa giao diện)
npm run dung-web:thu    # hợp đồng mẫu → soát → npm install → tsc + next build (--xem: mở xem trước)
npm run dung-web:tu-job # CSDL → hợp đồng → .zip → giải nén → build (đường nút "Tải mã nguồn")
npx tsx scripts/xem-truoc-tat.ts   # tắt mọi máy chủ xem trước web khách còn sống
npm run kiem:neon       # đối chiếu schema với Neon + đếm khoá trùng .env.local
                        # (chỉ đọc; cần MIGRATOR_DATABASE_URL để chạm được Neon)
```

⚠️ **Đừng chép số từ báo cáo cũ.** Chạy `npm run bao-cao` để có số mới — nó đếm
lại từ mã nguồn và gõ cửa trang thật. Ngày 09/09 một bản báo cáo viết tay đã sai
bốn chỗ, ba chỗ bảo chủ dự án đi làm lại việc đã xong.

---

## Trạng thái ngay lúc bàn giao

*Cập nhật sau vòng 76 (13/09).*

**halongxanh360.vn** — đã lập chỉ mục trên Google, đã nộp vào Bing Webmaster.
`llms.txt`, `robots.txt`, `sitemap.xml` đều chạy thật. **15/15 phép kiểm đạt**,
lint sạch, build sạch.
**Đã deploy 11/09** — bản sửa tên site đang chạy (vòng 10: trước đó trang tự
xưng là dự án của Vinhomes ở cả bốn chỗ Google đọc tên site), tệp khoá IndexNow
sống, Bing đã nhận 31 địa chỉ. Google crawl trang chủ 20:46 11/09 — sau deploy.
16/31 địa chỉ đã vào chỉ mục. Dải liên kết chân trang + `llms.txt` tên mới **đã
lên** (đo khuya 11/09). **Có commit chắc chắn chưa deploy**: 37c81aa (tự đẩy bù
khách tồn), 6bcdb13 (IndexNow không báo bài hẹn ngày sau), **39304d7 (compose
chuyển `LEAD_WEBHOOK_TOKEN` vào hộp chứa — thiếu nó là bảng khách trống)**,
821d87f (trien-khai.sh tự kiểm đường tới bảng khách), **7905425 (ba ảnh AI bị
cấm 10/09 vẫn chạy trên trang chủ thật — đã thay; ảnh rạp xiếc AI đã gỡ)**,
9ba235f/e94446e (màn duyệt nói "khoá duyệt bài"; kiểm hành vi khi CSDL hỏng),
**1a4095b (13/09: Lighthouse accessibility 94 → 100 — chữ chân trang mờ 2,9:1,
`<dl>` sai cấu trúc ở 5 trang)**. Chưa rõ VPS đang ở commit nào;
`./trien-khai.sh` lấy hết.

**Antigravity OS** — **484/484 test** (+ e2e **14/14**, chạy riêng bằng
`npm run test:e2e`; `next build` xanh), lint sạch, 24 module hiện (gồm
`RIS_CHON_ANH` và bốn bước dựng web #24–27 `RIS_WEB_*`) + 1 ẩn (`RIS_VIET_HO`).
**Trình dựng web đã trọn đường, kể cả LÊN MẠNG KHÔNG CẦN MÁY (vòng 46)**: 4
bước AI → thẻ "Website dựng sẵn" → **Đẩy lên GitHub** (Git Data API, một
commit trọn cây; token cá nhân lưu vault ở `oauth_connections` provider
`github`; kho `web-<slug>` riêng tư; `chuanBiChoCloudflare` đưa cấu hình ra
gốc + ghim `@opennextjs/cloudflare` 1.20.6 / `wrangler` 4.131.1) → Cloudflare
Workers Builds tự dựng — người dùng nối kho một lần trong dashboard (hai lệnh
`npm run dung-cloudflare` / `day-cloudflare`). **Chưa kiểm được lần đẩy thật**
(cần token của chủ dự án); đường HTTP tới GitHub đã kiểm bằng token giả (401 in
đúng câu). Vẫn còn: tải .zip; **Xem thử trên máy** (`next dev` thật; trên
Vercel nút này ẩn). Web sinh ra (vòng 44): thông tin liên hệ MỘT chỗ
`src/lib/thong-tin.ts`, `meta.ts` (Open Graph + canonical), `icon.svg`, 404
tiếng Việt, đầu HTTP an toàn, GA tuỳ chọn, JSON-LD thoát `<`; tự soát 12 luật.
Lighthouse điện thoại 100/100/100/100. Bản Next ghim **16.3.5**. Quy trình: bước
hỏng giữa luồng có nút **"Chạy tiếp từ bước N"** (vòng 45), #27 có ô "Muốn sửa
gì so với lần trước?" (vòng 43). Lịch đăng có **lưới an toàn** (chưa dán
crontab thì mở trang dự án cũng là một nhịp gõ). Còn chờ chủ dự án: **mục 19
giờ chỉ còn "một token GitHub + một tài khoản Cloudflare"**, 20 (khoá duyệt),
**21 (web khách có tin tức không — A/B/C)**. Chế độ Đơn giản: đăng nhập →
`/bat-dau` có khối "Hôm nay máy đã làm gì" và danh sách web khách đã dựng kèm
trạng thái lên mạng. Xem thẻ web bằng mắt không tốn AI:
`npx tsx scripts/gieo-web-thu.ts` (rồi `--nho`). Từ vòng 50–62: ô Zalo nhận
số điện thoại; thẻ nhớ số/Zalo/ảnh mở đầu theo dự án (`dung_web`); khối "Địa
chỉ, giờ mở cửa, bản đồ"; bộ khối (chung/bất động sản) suy từ ngành nghề khi
chạy cả luồng; #27 ghi dấu kiến trúc, chữ lệch kiến trúc bị bỏ và nhắc; lượt
chạy sống qua tải lại trang; thẻ GitHub ở Cài đặt; thư mục dựng là ảnh chụp
của cây. Tài liệu cho chị đã dọn (vòng 52): ví dụ là sàn môi giới, "Nha khoa
Bình Minh" chỉ là dữ liệu thử. Vòng 64–69: rà mã phần đẩy GitHub — vá lỗ phân
quyền ở tuyến xem thử (POST/DELETE), chờ nhánh sau `auto_init`, báo đúng giới
hạn tốc độ của GitHub, dừng đẩy khi một blob hỏng, trần 30 s mỗi lượt gọi; cấu
hình không bí mật của dự án đọc/ghi qua `lib/integrations/cau-hinh-du-an.server.ts`;
rà cả 15 tuyến `projects/[id]` — các tuyến khác đều kiểm quyền ở tầng dịch vụ.
Website: lưới sản phẩm hết tải ảnh to gấp bốn (2c0752a, chưa deploy); LCP 5,7 s
trên điện thoại chờ chị chọn (mục 22 `VIEC-CAN-LAM.md`). Vòng 70: web khách tự
lưu font (`lib/dung-web/font-web.ts`, hỏng thì quay về thẻ link) và ảnh có kích
thước thật — hiệu năng điện thoại của mẫu 84/66 → 90/90 (trung vị 3 lần).
Cổng trước khi đẩy: tsc · lint · vitest · build — `next build` KHÔNG kiểm kiểu `tests/`.
Vòng 71–73: màu chữ phụ / chữ trên nút / liên kết / cảnh báo tự chỉnh cho đủ
4,5:1 (`domain/dung-web/mau-an-toan.ts`; mẫu nền sáng: `dung-web-thu.ts --sang`,
Lighthouse 100); Cloudflare cần `public/_headers` để cache tệp tĩnh (có sẵn trong
`trien-khai/cloudflare/` và kho đẩy GitHub); tải trước font qua `ReactDOM.preload`.
Vòng 74: web khách đếm khách liên hệ trong GA (`goi_dien`, `nhan_zalo`,
`generate_lead`; `src/lib/su-kien.ts` + `src/instrumentation-client.ts`; chỉ khi
có `NEXT_PUBLIC_GA_ID`), đã bấm thử trên `next start` và `wrangler dev`; hướng
dẫn Cloudflare sửa chỗ đặt biến — `NEXT_PUBLIC_*` ở *Build variables and
secrets*, webhook ở *Variables and Secrets*; ô số điện thoại có `pattern` dịch
được với cờ `v` (mẫu cũ hỏng trên Chromium, trình duyệt bỏ kiểm tra).
Vòng 75: hết cảnh báo DEP0190 (lệnh npm là một chuỗi); dữ liệu mẫu ghi rõ là
bịa, tên miền đuôi `.example`; dừng `wrangler dev` phải giết cây tiến trình node
cha (giết chủ cổng 8787 chỉ giết `workerd`). Vòng 76: `@font-face` khai
latin-ext → vietnamese → latin (`xepMatFont`) để chữ Việt lấy hết từ tệp
vietnamese — 9 tệp → 6 mỗi trang, Lighthouse điện thoại 88 → 93, ảnh chụp y hệt.
**Trình dựng web** ở `domain/dung-web/`: danh mục khối → hợp đồng kiến trúc →
hệ thiết kế → chữ → `dung-cay-tep.ts` sinh dự án Next.js → `lib/zip.ts` →
tuyến `/api/v1/projects/[id]/dung-web` (+ `/github` để đẩy; token ở
`/api/v1/github/token`). Bốn kịch bản chứng minh: `npm run dung-web:thu`
(hợp đồng mẫu → build + xem trước, `--xem`; `--cloudflare` dựng đúng cây sẽ
đẩy lên GitHub rồi chạy `opennextjs-cloudflare build`),
`npm run dung-web:tu-job` (CSDL → .zip → giải nén → build) và
`npm run dung-web:bam-thu -- <địa chỉ> <co-ga|khong-ga>` (bấm thử web mẫu đang
chạy: chặn mọi yêu cầu ra ngoài, đọc `dataLayer`, kiểm ô số điện thoại). Xem trước trong
app: `POST /api/v1/projects/[id]/dung-web/xem-truoc`; dọn tiến trình mồ côi:
`npx tsx scripts/xem-truoc-tat.ts`. Ảnh web khách lấy từ thư mục Drive của dự
án (tối đa 8 tấm) — không sinh ảnh AI
(`RIS_VIET_HO` — "AI viết hộ" cạnh mọi ô nhập, lịch sử quay về, 75a715e). Sheets (khách liên
hệ) đã lập bảng, có dấu vết từng lượt nhận + nút gửi thử; Drive (ảnh dự án) đã
nối, đọc cả thư mục con. Ảnh Drive → bài đăng **chưa làm**. **Lịch đăng bài tự
động đã dựng** (e479319): thẻ trên trang dự án, tick `/api/v1/lich-dang/[id]/
tick` bằng mã Bearer, VPS crontab mỗi 10 phút — chờ chủ dự án điền thẻ + dán
crontab (mục 15). Đã nối Git với Vercel nên push là tự dựng lại.
⚠️ **Migration Neon `0004` vẫn chưa rõ** — nhưng giờ có cách tự kiểm:
`MIGRATOR_DATABASE_URL=<url Neon> npm run kiem:neon`. Kịch bản chỉ đọc.

## Ba việc đang chờ, không ai làm được thay

1. **Mục 0 của `VIEC-CAN-LAM.md`, bước 6–7** — chạy lại `./trien-khai.sh` trên
   VPS (lấy compose đã sửa), thử form, đọc dòng "Lượt gần nhất" trên thẻ. Bước
   1–5 và 8 đã xong.
1b. **Mục 15** — lượt đầu 12/09: kẹt bước 5 (hàm bị ngắt) → "Gõ tiếp ngay" →
   chạy tới bước 8 → **website từ chối bài** (luật cấm). Đã sửa: luật đi
   trước khi viết + tự viết lại một lần. **Crontab VPS vẫn chưa có** ("no
   crontab for root") — thẻ giờ đưa một lệnh dán là xong. Nếu kẹt bước giữa
   chừng lặp lại, cần log Vercel quanh giờ kẹt.
2. **Dữ liệu chủ đầu tư** — chín trang phân khu dừng ở ~490 từ vì kho chỉ có ba
   gạch đầu dòng mỗi khu. Chờ mặt bằng chính thức.
3. **Chứng chỉ hành nghề + tên sàn** — Luật KDBĐS 2023 Điều 61 bỏ quyền hành nghề
   độc lập của cá nhân môi giới từ 01/8/2024. Nêu lên trang thì vừa đúng luật vừa
   là tín hiệu tin cậy mà 10/10 đối thủ không có.

---

## Bài học vòng 15: "khách thấy Đã nhận" không chứng minh gì

Màn cảm ơn hiện y hệt dù khách vào bảng hay rơi về tệp. Nguyên nhân thật nằm ở
chỗ không ai nhìn: `docker-compose.yml` chỉ chuyển vào hộp chứa những biến được
liệt kê, và biến mới bị quên. Giờ có phép kiểm `kiem-bien-moi-truong` (đỏ đúng
biến đó trên compose cũ). **Thêm biến môi trường mới vào mã = thêm vào compose.**

## Hai bài học vòng 8 đáng nhớ hơn cả mã đã viết

**Gõ cửa trang thật trước khi giao việc cho ai.** Chính tệp bàn giao này từng ghi
"redeploy VPS" là việc gấp nhất — trong khi bản mới đã lên trang từ trước. Ngày
09/09 tôi đã đính chính một báo cáo mắc đúng lỗi đó. Trạng thái viết trên giấy
hỏng nhanh hơn người ta tưởng.

**Thử cả thứ mình KHÔNG định làm.** Tuyến IndexNow bản đầu chạy đúng cả hai ca tôi
nghĩ ra, rồi âm thầm thay mất trang 404 của cả site cho mọi địa chỉ gõ sai. Chỉ lộ
ra khi gõ thử một địa chỉ không tồn tại — việc chẳng liên quan gì tới IndexNow.
