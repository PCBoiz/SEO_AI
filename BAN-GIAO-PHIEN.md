# Bàn giao phiên — đọc tệp này đầu tiên khi mở phiên mới

*Cập nhật 10/09/2026. Viết để một phiên mới bắt kịp trong 5 phút mà không phải
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
| `D:\Dự án cô Giang\VIEC-CAN-LAM.md` (+ `.pdf`) | **Chỗ duy nhất** ghi việc cần chủ dự án. 14 mục, xếp theo mức chặn |
| `D:\vinhomes_ha_long_xanh\KE-HOACH-LEN-TIM-KIEM.md` (+ `.pdf`) | Kế hoạch SEO/GEO dựa trên bằng chứng có số. Kèm danh sách việc **không** nên làm |
| `D:\vinhomes_ha_long_xanh\CAU-HOI-CHU-DAU-TU-09-09-2026.pdf` | 10 câu hỏi mang đi gặp chủ đầu tư |
| `D:\Dự án cô Giang\docs\nghien-cuu-*.md` | Ba tài liệu nghiên cứu trình dựng website |

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

## Lệnh hay dùng

```
# Deploy halongxanh360 lên VPS (IP tra từ DNS 11/09; trien-khai.sh tự git pull)
ssh root@103.7.40.145
cd /opt/halongxanh && ./trien-khai.sh

# halongxanh360
npm run kiem            # tự tìm và chạy MỌI phép kiểm (hiện 10/10)
npm run build
node scripts/thu-nho-anh.mjs --rong=1200 <ảnh>   # soi ảnh bằng mắt

# Antigravity
npm test                # 199/199
npm run lint            # 0 cảnh báo
npm run bao-cao         # sinh BAO-CAO-TRANG-THAI.md bằng số đo thật
npm run md-sang-pdf <vào.md> <ra.pdf>
npm run thu-xem-truoc   # thử vòng lặp dựng web trên máy
npm run kiem:neon       # đối chiếu schema với Neon + đếm khoá trùng .env.local
                        # (chỉ đọc; cần MIGRATOR_DATABASE_URL để chạm được Neon)
```

⚠️ **Đừng chép số từ báo cáo cũ.** Chạy `npm run bao-cao` để có số mới — nó đếm
lại từ mã nguồn và gõ cửa trang thật. Ngày 09/09 một bản báo cáo viết tay đã sai
bốn chỗ, ba chỗ bảo chủ dự án đi làm lại việc đã xong.

---

## Trạng thái ngay lúc bàn giao

*Cập nhật sau vòng 10 (11/09).*

**halongxanh360.vn** — đã lập chỉ mục trên Google, đã nộp vào Bing Webmaster.
`llms.txt`, `robots.txt`, `sitemap.xml` đều chạy thật. **12/12 phép kiểm đạt**,
lint sạch, build sạch.
⚠️ **Có commit chưa deploy** — quan trọng nhất là **bản sửa tên site** (vòng 10:
trang tự xưng là dự án của Vinhomes ở cả bốn chỗ Google đọc tên site, nên tra
"halongxanh360" không ra) và **tệp khoá IndexNow**. Xem mục 2 và 7b của
`VIEC-CAN-LAM.md`.

**Antigravity OS** — **228/228 test**, lint sạch, 19 module. Đã nối Git với Vercel
nên push là tự dựng lại.
⚠️ **Migration Neon `0004` vẫn chưa rõ** — nhưng giờ có cách tự kiểm:
`MIGRATOR_DATABASE_URL=<url Neon> npm run kiem:neon`. Kịch bản chỉ đọc.

## Ba việc đang chờ, không ai làm được thay

1. **Deploy VPS** — để tệp khoá IndexNow sống. Sau khi deploy, mở
   `https://halongxanh360.vn/a89f551822f0aacd4133bb9aa6412a61.txt`, phải hiện đúng
   chuỗi đó và không gì khác.
2. **Dữ liệu chủ đầu tư** — chín trang phân khu dừng ở ~490 từ vì kho chỉ có ba
   gạch đầu dòng mỗi khu. Chờ mặt bằng chính thức.
3. **Chứng chỉ hành nghề + tên sàn** — Luật KDBĐS 2023 Điều 61 bỏ quyền hành nghề
   độc lập của cá nhân môi giới từ 01/8/2024. Nêu lên trang thì vừa đúng luật vừa
   là tín hiệu tin cậy mà 10/10 đối thủ không có.

---

## Hai bài học vòng 8 đáng nhớ hơn cả mã đã viết

**Gõ cửa trang thật trước khi giao việc cho ai.** Chính tệp bàn giao này từng ghi
"redeploy VPS" là việc gấp nhất — trong khi bản mới đã lên trang từ trước. Ngày
09/09 tôi đã đính chính một báo cáo mắc đúng lỗi đó. Trạng thái viết trên giấy
hỏng nhanh hơn người ta tưởng.

**Thử cả thứ mình KHÔNG định làm.** Tuyến IndexNow bản đầu chạy đúng cả hai ca tôi
nghĩ ra, rồi âm thầm thay mất trang 404 của cả site cho mọi địa chỉ gõ sai. Chỉ lộ
ra khi gõ thử một địa chỉ không tồn tại — việc chẳng liên quan gì tới IndexNow.
