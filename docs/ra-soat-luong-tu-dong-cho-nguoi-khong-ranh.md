# Rà soát: luồng tự động có dễ hiểu với người không rành công nghệ không?

*12/09/2026 — vòng 23. Đi thử toàn bộ đường từ đăng nhập tới duyệt bài bằng
trình duyệt, ở chế độ **Đơn giản** (mặc định), cả máy bàn lẫn màn 390px. Kết
luận trước, bằng chứng sau, việc còn lại cuối.*

## Kết luận

**Trước vòng này: chưa.** Không phải vì thiếu tính năng, mà vì người dùng
Đơn giản **không có chỗ nào trả lời ba câu hỏi mỗi sáng** — "máy viết chưa?",
"có bài chờ tôi duyệt không?", "có khách mới không?" — trừ khi tự mò vào trang
dự án, cuộn qua biểu mẫu cấu hình, rồi đọc một thẻ nói bằng tiếng kỹ thuật
(*nhịp gõ, VPS, crontab, GSC*).

**Sau vòng này: dùng được** với đúng một điều kiện ngoài phần mềm — **khoá
duyệt bài** phải được đưa cho người duyệt một lần (mục "còn lại").

## Sáu chỗ vấp đã đo được — và đã sửa

| # | Vấp | Người dùng thấy gì | Sửa (commit `bf9e8b5`) |
|---|---|---|---|
| 1 | **Sau đăng nhập rơi vào "Mission control"** | Trang đầu tiên đầy chữ lạ: *SEO & GEO của workspace, JSON-LD, llms.txt, ICN*. Thanh bên Đơn giản có 4 mục — trang này **không** nằm trong đó, nên không có đường về. | `/dashboard` ở chế độ Đơn giản chuyển thẳng về **Bắt đầu**. Bản Nâng cao vẫn thấy dashboard. |
| 2 | **Không có "hôm nay"** | Trang Bắt đầu chỉ có "Viết một bài mới" + danh sách việc tay. Lịch tự động đang chạy hay không — không biết. | Khối **"Hôm nay máy đã làm gì"** trên Bắt đầu: mỗi website một dòng lịch (một câu + việc cần làm + nút *Mở trang duyệt bài*) và một dòng khách (lần nhận gần nhất + link bảng). Câu do `tomTatLich()` sinh — 12 ca kiểm. |
| 3 | **Menu điện thoại không biết chế độ** | Chuyển "bản dễ" trên máy tính, mở điện thoại: 11 mục gồm *WordPress, Phân tích, API Keys* và **không có Bắt đầu**. Chữ trang xuyên qua nền kính của menu. | Menu điện thoại 4 mục như thanh bên; nền đặc. |
| 4 | **Thẻ lịch nói tiếng máy** | *"Lưu & lấy dòng crontab"*, *"Nhịp gõ gần nhất"*, *"VPS chưa gõ lần nào"*, *"GSC"*, và câu "vào trang API Keys" **không có link** — trang đó không có trong thanh bên Đơn giản. | Nút *"Lưu lịch"*; *"Máy chủ kiểm lần gần nhất"*; cảnh báo VPS mở đầu bằng **"Việc kỹ thuật, làm một lần"** (người dùng biết đó không phải việc của mình); link tới Khoá AI; "từ Google". Một câu **"Hôm nay: …"** có màu ở đầu thẻ. |
| 5 | **Thẻ lịch nằm dưới biểu mẫu cấu hình** | Mở website → gặp Tên dự án, URL, Đối thủ, *"Cấu hình mẫu WordPress… Module 12"* trước; thứ cần xem ở dưới cùng. | Đơn giản: ba thẻ tự động hoá lên đầu; biểu mẫu gấp vào *"Thông tin website, giọng văn, đối thủ (ít khi cần sửa)"*. Breadcrumb hết in UUID. |
| 6 | **Màn duyệt trên website xin "INGEST_TOKEN"** | Ô nhập ghi *"Dán INGEST_TOKEN"* — không ai ngoài người viết mã biết đó là gì. | Placeholder *"Dán khoá duyệt bài vào đây"*; chú thích nói khoá do người kỹ thuật đưa một lần, cất ở ứng dụng ghi chú/mật khẩu; tên biến lùi xuống dòng "kỹ thuật". (Kho website, chưa deploy.) |

## Đường đi của người dùng Đơn giản — sau khi sửa

1. Đăng nhập → **Bắt đầu**. Khối *Hôm nay máy đã làm gì* nói ngay: *"Bài hôm
   nay «…» đã viết xong. Vào website duyệt để bài lên trang. → Mở trang duyệt
   bài"*.
2. Bấm → `/duyet-bai` của website → dán **khoá duyệt bài** → đọc → Duyệt.
3. Khách để lại số → dòng thứ hai của khối: *"lần gần nhất 08:41 — mở bảng
   khách"*.
4. Có gì lệch (đứng im, quá giờ, máy chủ chưa kiểm) → câu đỏ nói **làm gì**
   (*bấm Gõ tiếp ngay* / *việc kỹ thuật, người phụ trách làm*), không nói cơ
   chế.

## Còn lại — cố ý không làm ở vòng này

| Việc | Vì sao để lại |
|---|---|
| **Khoá duyệt bài phải dán lại mỗi lần mở trang** | Là quyết định bảo mật có lý do (khoá cho phép đăng lên trang thương mại; không cất trong trình duyệt). Muốn nhẹ hơn thì phải làm **phiên đăng nhập riêng cho màn duyệt** trên website — việc thật, cần chị chốt có muốn không. |
| **Bản Nâng cao vẫn đầy thuật ngữ** | Đúng ý đồ: bản đó cho người cần điều khiển đủ. Không sửa. |
| Tên trang `/outputs` là "Bài đã viết" nhưng bên trong vẫn gọi "job", "module" | Nhỏ; gộp vào đợt rà "chữ thừa" (C8, đang chờ lệnh). |
| "Đăng lên WordPress", "Cấu hình mẫu WordPress" vẫn hiện dù website này không dùng WordPress | Tính năng chung của Antigravity; giấu theo dự án là việc riêng, không gấp. |
