# Đưa website vừa dựng lên mạng

*12/09/2026 — vòng 26. Viết cho người **không phải lập trình viên**: sau khi bấm
"Tải mã nguồn (.zip)" trong thẻ "Website dựng sẵn" thì làm gì tiếp.*

> ⚠️ **Phần tôi chưa tự kiểm được.** Ba cách dưới đây đều cần một tài khoản
> (Vercel/GitHub) hoặc một máy chủ — tôi không có tài khoản của chị nên **chưa
> chạy thử từ đầu tới cuối**. Các bước viết theo cách các dịch vụ đó đang hoạt
> động; chỗ nào lệch, chụp màn hình gửi tôi sửa lại tài liệu.

## Trước hết: xem thử trên máy (không cần tài khoản nào)

Giải nén tệp `.zip`, mở thư mục đó bằng Terminal / PowerShell rồi gõ:

```bash
npm install      # lần đầu, khoảng 1 phút
npm run dev
```

Mở `http://localhost:3000`. Sửa chữ thì sửa trong `src/components/khoi/*.tsx`,
lưu là trang tự cập nhật.

*(Nếu Antigravity đang chạy trên máy chị thì không cần bước này — bấm
**Xem thử trên máy** trong thẻ "Website dựng sẵn" là xong.)*

## Cách 1 — Vercel (đề xuất: nhanh nhất, có bản miễn phí)

Vercel là nơi chính Antigravity đang chạy, và website dựng ra là Next.js nên
hợp nhất với nó.

```bash
npm install -g vercel   # một lần cho cả máy
vercel login            # mở trình duyệt, đăng nhập bằng email/GitHub
vercel                  # trong thư mục website; Enter hết các câu hỏi
vercel --prod           # đưa lên bản chính thức
```

Xong, Vercel in ra một địa chỉ dạng `ten-website.vercel.app`. Gắn tên miền
riêng: vào vercel.com → dự án → **Settings → Domains** → nhập tên miền → làm
theo hướng dẫn trỏ DNS ở nhà cung cấp tên miền.

**Biến môi trường** (để khách để lại số chảy về bảng tính): Settings →
Environment Variables → thêm `LEAD_WEBHOOK_URL` (và `LEAD_WEBHOOK_TOKEN` nếu
nơi nhận đòi) → **Redeploy**. Chưa đặt thì số khách chỉ nằm trong nhật ký máy
chủ của Vercel, không mất nhưng phải vào đó mới xem được.

## Cách 2 — VPS đang chạy halongxanh360

Máy chủ đó đã có Docker và đã quen với Next.js. Cách gọn nhất là chép thư mục
lên rồi chạy như một dịch vụ riêng, cổng khác. Việc này **cần người kỹ thuật**
một lần (~30 phút): dựng `Dockerfile` giống kho halongxanh360, thêm một khối
vào `docker-compose.yml`, và trỏ tên miền mới vào cùng máy chủ.

Đáng làm khi: nhiều website khách, muốn gom một chỗ, không muốn phụ thuộc bên
thứ ba. Không đáng khi mới có một hai trang — cách 1 nhanh hơn nhiều.

## Cách 3 — giao nguyên tệp .zip cho khách

Nếu khách có sẵn người kỹ thuật: gửi thẳng tệp nén. Trong đó có `README.md` ghi
đúng hai lệnh chạy và danh sách dữ liệu thật còn thiếu. Không có gì khoá vào
Antigravity — mã nguồn là Next.js tiêu chuẩn, họ sửa và đưa lên đâu cũng được.

## Sau khi lên mạng — ba việc nên làm ngay

1. **Số điện thoại**: bấm thử nút gọi trên điện thoại thật. Sai số là mất khách
   mà không ai báo.
2. **Gửi thử biểu mẫu** một lần, rồi kiểm bảng tính/nhật ký xem có tới không.
3. **Khai báo với Google**: vào Google Search Console → thêm tên miền → dán
   `https://<tên-miền>/sitemap.xml`. Website dựng sẵn đã có sitemap và robots.

## Chi phí một website

| Khoản | Ước tính |
|---|---|
| AI (4 bước: ý định, kiến trúc, thiết kế, viết chữ) | 4 lượt gọi model bằng **khoá của chị** — với DeepSeek thường dưới 2.000đ/website |
| Vercel | Bản Hobby miễn phí đủ cho trang giới thiệu; tên miền riêng vẫn dùng được |
| Tên miền | Tuỳ nhà cung cấp, thường 200.000–400.000đ/năm |
| Ảnh | 0đ — lấy từ thư mục Drive của chị, không mua ảnh kho, không sinh ảnh AI |
