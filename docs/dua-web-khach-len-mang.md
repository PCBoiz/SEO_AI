# Đưa website vừa dựng lên mạng

*12/09/2026 — vòng 26, **sửa lại ở vòng 31** (điều khoản Vercel). Viết cho
người **không phải lập trình viên**: sau khi bấm "Tải mã nguồn (.zip)" trong
thẻ "Website dựng sẵn" thì làm gì tiếp.*

> ⚠️ **Phần tôi chưa tự kiểm được.** Các cách dưới đây đều cần một tài khoản
> hoặc một máy chủ — tôi không có tài khoản của chị nên **chưa chạy thử từ đầu
> tới cuối**. Các bước viết theo tài liệu công khai của từng bên; chỗ nào lệch,
> chụp màn hình gửi tôi sửa lại.

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

## ⚠️ ĐÍNH CHÍNH (vòng 31, 12/09): bản MIỄN PHÍ của Vercel KHÔNG dùng cho web khách được

Bản đầu của tài liệu này bảo chị đưa web khách lên **Vercel bản Hobby (miễn
phí)**. Tra lại điều khoản: **Hobby chỉ cho dùng phi thương mại**. Vercel định
nghĩa "thương mại" rất rộng — trang quảng cáo một sản phẩm hay dịch vụ là
thương mại, kể cả khi nó chưa thu một đồng nào, và **được trả tiền để dựng hay
để chạy trang cũng tính**. Website dựng cho khách rơi đúng vào đó.

Nghĩa là bản miễn phí chỉ hợp cho **trang thử của chính chị**. Web khách thì
chọn một trong ba cách dưới đây.

## Cách 1 — VPS đang chạy halongxanh360 *(rẻ nhất, chị đã trả tiền rồi)*

Máy chủ đó đã có Docker và đã quen Next.js; thêm một website nữa không tốn
thêm đồng nào ngoài chút đĩa và RAM. Cần **người kỹ thuật làm một lần (~30
phút mỗi site)**: dựng `Dockerfile` giống kho halongxanh360, thêm một khối vào
`docker-compose.yml` với cổng khác, trỏ tên miền mới vào cùng máy chủ (Caddy
đã có sẵn ở đó lo chứng chỉ HTTPS).

Đáng làm khi: nhiều website khách, muốn gom một chỗ, không muốn phụ thuộc bên
thứ ba và không muốn trả phí tháng.

## Cách 2 — Cloudflare Pages *(miễn phí, và CHO PHÉP dùng thương mại)*

Bản miễn phí của Cloudflare **không cấm dùng thương mại** — khác hẳn Vercel
Hobby. Băng thông không giới hạn; giới hạn nằm ở 500 lượt dựng/tháng và hạn
mức Workers (100.000 lượt gọi/ngày) cho phần chạy động.

⚠️ **Tôi chưa chạy thử đường này.** Next.js trên Cloudflare cần bộ chuyển
`@opennextjs/cloudflare` (bản 1.0 ra tháng 2/2026) — thêm một gói và một tệp
cấu hình vào dự án. Nếu chị chọn hướng này, nói tôi: tôi sẽ thêm sẵn cấu hình
đó vào website sinh ra **và dựng thử một lần cho chắc** trước khi ghi vào tài
liệu.

## Cách 3 — Vercel bản Pro *(20 USD/tháng, gọn nhất về vận hành)*

Cùng đường đi như dưới đây nhưng tài khoản phải là **Pro** thì mới được phép
chạy trang thương mại. Một tài khoản Pro chạy được nhiều website khách.

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

## Cách 4 — giao nguyên tệp .zip cho khách

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
| Nơi chạy | **0đ** nếu để trên VPS đang có; **0đ** nếu Cloudflare Pages (cho phép thương mại); **20 USD/tháng** nếu Vercel Pro. Vercel Hobby **không được phép** cho web khách |
| Tên miền | Tuỳ nhà cung cấp, thường 200.000–400.000đ/năm |
| Ảnh | 0đ — lấy từ thư mục Drive của chị, không mua ảnh kho, không sinh ảnh AI |

---

## Nguồn đã tra (vòng 31, 12/09/2026)

- Điều khoản bản Hobby của Vercel: <https://vercel.com/docs/plans/hobby>
- Bản miễn phí Cloudflare (cho phép dùng thương mại): <https://www.cloudflare.com/plans/free/>
- Bộ chuyển Next.js cho Cloudflare: <https://opennext.js.org/cloudflare>

Tôi đọc điều khoản qua tài liệu công khai của hai bên, **chưa** dựng thử một
site khách trên Cloudflare. Chỗ nào tôi chưa tự chạy thì trong tài liệu này
đều có ghi.
