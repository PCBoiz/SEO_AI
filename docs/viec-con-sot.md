# Việc còn sót — rà lại toàn bộ, 12/09/2026 (cập nhật 13/09, vòng 63)

*Rà từ: `VIEC-CAN-LAM.md` (18 mục), `NHAT-KY.md` hai kho (20 vòng), `BAN-GIAO-PHIEN.md`,
`KE-HOACH-LEN-TIM-KIEM.md` (10 việc), ba tài liệu nghiên cứu, và những câu "chưa
làm" tôi tự ghi trong mã. Mỗi dòng ghi rõ ai làm và vì sao còn.*

---

## A · Chị làm — không ai làm thay được (thứ tự này)

| # | Việc | Mất | Vì sao còn |
|---|---|---|---|
| A1 | **`./trien-khai.sh` trên VPS** | 3 phút | Từ 12/09 tới nay **8 đợt sửa chưa lên trang**: ba ảnh AI trên trang chủ đã thay (7905425), màn duyệt nói thật khi DB hỏng, **cổng nhận ảnh kèm bài** (53b0e90), màn duyệt nói "khoá duyệt bài" (9ba235f), kiểm hành vi khi DB hỏng (e94446e), **Lighthouse accessibility 94→100** (1a4095b). Chưa deploy thì lịch đăng vẫn gửi ảnh sang, nhưng cổng cũ **bỏ qua trường lạ**: bài vào, ảnh rơi mất. |
| A2 | **Crontab VPS** (mục 15, bước 2) | 1 phút | `crontab -l` = "no crontab for root". Không có nó, lượt đêm bị ngắt là đứng im tới khi chị bấm tay. Bấm "Tạo mã mới" → chép lệnh → dán → Enter → ra `1`. |
| A3 | Thử form liên hệ một lần (mục 0, bước 7) | 1 phút | Đường hộp chứa → bảng đã xanh trên `trien-khai.sh`, nhưng chưa thấy một dòng khách thật nào trong bảng. |
| A4 | Thu hồi khoá OpenAI đã lộ (mục 1) | 2 phút | Vẫn còn hiệu lực. |
| A5 | `MIGRATOR_DATABASE_URL=<url> npm run kiem:neon` (mục 3) + dọn khoá trùng `.env.local` (mục 4) | 5 phút | Migration `0004` chưa xác nhận; mọi tính năng mới tôi cố ý dựng **không cần migration** vì thế — nhưng đó là né, không phải giải. |

## B · Đợi thứ từ bên ngoài — không phải kỹ thuật

| # | Việc | Nguồn | Mở khoá gì |
|---|---|---|---|
| B1 | 10 câu hỏi gửi chủ đầu tư (mục 5) | Chị ↔ CĐT | 9 trang phân khu đang ~490 từ vì chỉ có 3 gạch đầu dòng mỗi khu |
| B2 | Media kit ảnh thật (mục 6) | CĐT | Ảnh rạp xiếc thật, ảnh công trường có mốc thời gian (KH-7) |
| B3 | Số chứng chỉ hành nghề + tên sàn (mục 10) | Chị | Tín hiệu tin cậy 10/10 đối thủ không có; vào schema `RealEstateAgent` |
| B4 | Google Business Profile (mục 9, HD riêng) | Chị | Sau khi có B3 (lập dưới pháp nhân sàn) |
| B5 | Zalo OA (mục 8, hoãn) · đăng sàn (KH-6) · video (KH-8) · báo chí (KH-9) | Chị | Kênh chốt / lấy khách — ngoài phạm vi mã |
| B6 | CSV Keyword Planner (mục 11, đã bớt gấp) | Chị | Search Console đã thay được phần lớn |

## C · Tôi làm được — chờ chị xếp thứ tự

| # | Việc | Cỡ | Vì sao còn / đáng làm không |
|---|---|---|---|
| C1 | ~~IndexNow nửa sau~~ | — | **Xong 12/09** (`c63aaee` + `77250c0`): lịch đăng tự gõ `/api/bao-bai-toi-ngay` của website mỗi ngày một lần; không cần crontab thêm. |
| C2 | ~~Ảnh bìa ở `/tin-tuc`~~ | — | **Xong 12/09**: bài nổi bật có ảnh kèm thì hiện; danh sách dưới giữ chữ. |
| C3 | Gắn ảnh cho **bài đã đăng trước 12/09** | nhỏ | Gửi lại bài = bài rút về hàng chờ duyệt (luật của website). Làm theo lô khi chị muốn, mỗi bài chị duyệt lại một lần. |
| C4 | ~~Chọn ảnh chạy tay~~ | — | **Xong 12/09**: hiện ở /automations ("Chọn ảnh kèm bài từ Drive"). |
| C5 | "AI viết hộ" ở form sửa dự án (tên, ngành, giọng) | nhỏ | Giá trị thấp; ba chỗ chính đã có. Lưu ý mới 13/09: ô **sự thật** (giá, giờ, điện thoại) cố ý KHÔNG có viết hộ — máy viết hộ sự thật là máy bịa số. |
| C6 | Vercel Cron **hằng ngày** làm lưới dự phòng thứ hai cho lịch | vừa | Cần chị đặt `CRON_SECRET` trên Vercel; Hobby chỉ 1 lần/ngày lệch ±59 phút. VPS crontab (A2) vẫn là chính. |
| C7 | Đọc log Vercel từ máy này (`vercel login`) | 1 lần | Lượt 02:30 chết ở bước 5 chưa rõ vì sao. Có log thì lần sau tôi tự chẩn được, không phải nhờ chị chụp. |
| C8 | Rà soát "chữ thừa / giọng máy" toàn bộ trang | vừa | Đang **chờ lệnh** theo ghi chú 10/09 — không tự làm. |
| C9 | 9 trang phân khu dày lên | vừa | Chặn bởi B1. |
| C10 | Trình dựng website | lớn | **Trọn đường, 12–13/09**: #24–27, 27 khuôn khối (mọi khuôn đã qua `next build` thật), sinh mã Next.js, .zip + xem thử trong app, ảnh từ Drive (chọn được ảnh mở đầu), tự soát 11 luật, Lighthouse 100/100/100, **Đẩy lên GitHub → Cloudflare tự dựng** (vòng 46; lần đẩy thật chờ token của chị — mục 19). Chữ nhớ kiến trúc (vòng 59), bộ khối suy từ ngành (vòng 55), lượt chạy sống qua tải lại (vòng 61). Còn: **tin tức cho web khách** (mục 21). |
| C11 | ~~Phép kiểm màn duyệt mới là kiểm tĩnh~~ | — | **Xong 12/09** (`e94446e`): `kiem-hang-cho-that.ts` trỏ `DATABASE_URL` vào cổng chết rồi gọi thật `docBaiChoDuyetThat()`. |

## D · Đã xong hôm nay, kể để khỏi làm lại

Lịch đăng mỗi ngày một bài (VPS gõ nhịp, rào 250 s, Gõ tiếp ngay, luật viết đi
trước, bị từ chối thì viết lại) · AI viết hộ mọi ô nhập có lịch sử · ô nhập tự
cao · bảng khách: nguyên nhân thật (compose thiếu token) + kiểm tự động sau deploy
· ba ảnh AI trên trang chủ thay bằng ảnh thật, ảnh rạp xiếc gỡ, câu dẫn đếm số tự
đọc mảng · màn duyệt nói thật khi DB hỏng · **ảnh kèm bài từ Drive**: website
nhận 2 ảnh (bìa + trong bài), Antigravity chọn bằng AI từ danh sách, alt lấy từ
`danh-sach-anh.csv`, thu cỡ web, không ảnh hợp thì như cũ.

C1, C2, C4 đã xong cùng ngày; C10 tầng 1 xong (vòng 23). Rà UX cho người không
rành: `docs/ra-soat-luong-tu-dong-cho-nguoi-khong-ranh.md` — sáu chỗ vấp đã
sửa, còn lại là quyết định (phiên đăng nhập riêng cho màn duyệt?). Còn lại
theo thứ tự tôi đề xuất: **C10 tầng 2** (cần mục 19) → **C3** (cần chị chọn lô
bài cũ) → **C6** (cần `CRON_SECRET`) → **C7** (`vercel login` một lần); C8 chờ
lệnh riêng.
