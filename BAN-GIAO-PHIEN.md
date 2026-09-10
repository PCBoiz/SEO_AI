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
| `D:\Dự án cô Giang\VIEC-CAN-LAM.md` (+ `.pdf`) | **Chỗ duy nhất** ghi việc cần chủ dự án. 13 mục, xếp theo mức chặn |
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
```

⚠️ **Đừng chép số từ báo cáo cũ.** Chạy `npm run bao-cao` để có số mới — nó đếm
lại từ mã nguồn và gõ cửa trang thật. Ngày 09/09 một bản báo cáo viết tay đã sai
bốn chỗ, ba chỗ bảo chủ dự án đi làm lại việc đã xong.

---

## Trạng thái ngay lúc bàn giao

**halongxanh360.vn** — đã được Google lập chỉ mục. `llms.txt`, `robots.txt`,
`sitemap.xml` đều đang chạy thật (HTTP 200). 10/10 phép kiểm đạt.
⚠️ **Nhiều commit chưa deploy lên VPS** — xem mục 2 của `VIEC-CAN-LAM.md`.

**Antigravity OS** — 199/199 test, lint sạch, 19 module đăng ký. Đã nối Git với
Vercel (09/09) nên push là tự dựng lại.
⚠️ **Migration Neon `0004` có thể chưa áp** — nếu chưa thì cả engine module chết
trên Neon, không phải chỉ mất tính năng ghim. Xem mục 3.

---

## Ba việc đang chờ, không ai làm được thay

1. **Ảnh** — hai tấm nghi trùng cần mắt người (mục 12), và hai ảnh bị cách ly cần
   xác minh nguồn (mục 13). Phiên mới gửi ảnh được nên xử lý được ngay.
2. **Dữ liệu chủ đầu tư** — chín trang phân khu dừng ở ~490 từ vì kho chỉ có ba
   gạch đầu dòng mỗi khu. Chờ mặt bằng chính thức.
3. **Chứng chỉ hành nghề + tên sàn** — Luật KDBĐS 2023 Điều 61 bỏ quyền hành nghề
   độc lập của cá nhân môi giới từ 01/8/2024. Nêu lên trang thì vừa đúng luật vừa
   là tín hiệu tin cậy mà 10/10 đối thủ không có.
