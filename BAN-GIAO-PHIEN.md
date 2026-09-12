# Bàn giao phiên — đọc tệp này đầu tiên khi mở phiên mới

*Cập nhật 12/09/2026 (vòng 34). Viết để một phiên mới bắt kịp trong 5 phút mà không phải
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

*Cập nhật sau vòng 34 (12/09).*

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
cấm 10/09 vẫn chạy trên trang chủ thật — đã thay; ảnh rạp xiếc AI đã gỡ)**. Chưa
rõ VPS đang ở commit nào; `./trien-khai.sh` lấy hết.

**Antigravity OS** — **422/422 test** (+ e2e **12/12**, chạy riêng bằng
`npm run test:e2e`; `next build` xanh), lint sạch, 24 module hiện (gồm
`RIS_CHON_ANH` và bốn bước dựng web #24–27 `RIS_WEB_*`) + 1 ẩn (`RIS_VIET_HO`).
**Trình dựng web đã trọn đường ở máy**: 4 bước AI → thẻ "Website dựng sẵn" →
tải .zip (26+ tệp, ảnh thật từ Drive, `.env.example` điền sẵn nơi nhận khách)
hoặc **Xem thử trên máy** (`next dev` thật, có Tắt/Dựng lại; phiên ghi ra đĩa
để sống qua nạp lại mã). Tự soát 9 luật trước khi giao. Lighthouse điện thoại
100/100/100/100. Đường lên mạng miễn phí + được phép thương mại là
**Cloudflare** (đã chạy thử `wrangler dev`; deploy thật cần tài khoản) —
**Vercel Hobby cấm thương mại**, xem `docs/dua-web-khach-len-mang.md`. Bản
Next ghim trong web sinh ra là **16.3.5** (bộ chuyển Cloudflare đòi ≥16.3.3).
Lịch đăng có **lưới an toàn**: chưa dán crontab thì mở trang dự án cũng là một
nhịp gõ (`domain/lich-dang/luoi-an-toan.ts`). Còn chờ chủ dự án: mục 19 (máy
nào dựng), 20 (khoá duyệt), **21 (web khách có tin tức không — A/B/C)**. Chế độ Đơn giản: đăng nhập
→ `/bat-dau` có khối "Hôm nay máy đã làm gì" (`domain/lich-dang/tom-tat.ts`).
**Trình dựng web** ở `domain/dung-web/`: danh mục khối → hợp đồng kiến trúc →
hệ thiết kế → chữ → `dung-cay-tep.ts` sinh dự án Next.js → `lib/zip.ts` →
tuyến `/api/v1/projects/[id]/dung-web`. Hai kịch bản chứng minh:
`npm run dung-web:thu` (hợp đồng mẫu → build + xem trước, `--xem`) và
`npm run dung-web:tu-job` (CSDL → .zip → giải nén → build). Xem trước trong
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
