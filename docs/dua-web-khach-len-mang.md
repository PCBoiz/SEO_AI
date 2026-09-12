# Đưa website vừa dựng lên mạng

*12/09/2026 — vòng 26, sửa ở vòng 31 (điều khoản Vercel), **thêm Cách 0 ở
vòng 46 (13/09)**. Viết cho người **không phải lập trình viên**.*

## Cách 0 — KHÔNG CẦN MÁY: bấm "Đẩy lên GitHub", Cloudflare tự dựng *(khuyên dùng)*

Từ vòng 46, trong thẻ **"Website dựng sẵn"** có khung *"Đưa lên mạng không cần
máy"*. Antigravity đẩy mã nguồn lên một kho GitHub **riêng tư** của chị;
Cloudflare nối với kho đó sẽ tự cài, dựng và đưa lên mạng mỗi khi có bản mới.
Không giải nén, không gõ lệnh, làm được từ điện thoại.

**Một lần duy nhất (~10 phút):**

1. Có tài khoản GitHub (miễn phí). Vào *Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token*: chọn
   "All repositories", quyền **Contents: Read and write** và **Administration:
   Read and write** (để tạo kho). Hạn dùng chọn 1 năm. Sao chép token.
2. Dán token vào ô trong thẻ "Website dựng sẵn" → **Lưu token** (máy kiểm với
   GitHub ngay; token mã hoá, không hiện lại).
3. Có tài khoản Cloudflare (miễn phí, cho phép thương mại).

**Mỗi website:**

1. Điền số điện thoại → **Đẩy lên GitHub**. Máy tạo kho `web-<tên>` và đẩy
   toàn bộ mã.
2. Lần đầu: dash.cloudflare.com → *Workers & Pages → Create → Workers → Import
   a repository* → chọn kho vừa tạo → Build command `npm run dung-cloudflare`,
   Deploy command `npm run day-cloudflare` → *Save and Deploy*. Vài phút sau
   có địa chỉ `*.workers.dev`; gắn tên miền ở *Settings → Domains & Routes*.
   Biến môi trường (`LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_TOKEN`,
   `NEXT_PUBLIC_DIA_CHI`, `NEXT_PUBLIC_GA_ID`) đặt ở *Settings → Variables and
   Secrets*.
3. Từ đó: sửa chữ (chạy lại bước *Viết chữ*) → **Đẩy bản mới lên GitHub** →
   Cloudflare tự dựng lại. Không phải làm gì thêm.

**Tôi đã kiểm được gì:** cây tệp đúng như sẽ đẩy lên (cấu hình ở gốc, hai gói
Cloudflare đóng cứng phiên bản) dựng được thật ở máy — `tsc`, `next build`,
`opennextjs-cloudflare build` đều đạt; và trọn chuỗi gọi GitHub (tạo kho →
blob → cây → commit → nhánh) chạy đúng thứ tự trên GitHub giả trong phép thử.
**Chưa kiểm được:** lần đẩy thật lên GitHub của chị và lần dựng thật trên
Cloudflare — vì cần tài khoản của chị. Lần đầu chị làm, có gì lệch chụp màn
hình gửi tôi.

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
dùng **Cách 0** ở trên (không cần máy), hoặc một trong các cách dưới đây khi có
người kỹ thuật.

## Cách 1 — VPS đang chạy halongxanh360 *(rẻ nhất, chị đã trả tiền rồi)*

Máy chủ đó đã có Docker và đã quen Next.js; thêm một website nữa không tốn
thêm đồng nào ngoài chút đĩa và RAM. Cần **người kỹ thuật làm một lần (~30
phút mỗi site)**: dựng `Dockerfile` giống kho halongxanh360, thêm một khối vào
`docker-compose.yml` với cổng khác, trỏ tên miền mới vào cùng máy chủ (Caddy
đã có sẵn ở đó lo chứng chỉ HTTPS).

Đáng làm khi: nhiều website khách, muốn gom một chỗ, không muốn phụ thuộc bên
thứ ba và không muốn trả phí tháng.

## Cách 2 — Cloudflare bằng tay từ máy tính *(cùng nơi chạy với Cách 0, nhưng gõ lệnh)*

Bản miễn phí của Cloudflare **không cấm dùng thương mại** — khác hẳn Vercel
Hobby. Băng thông không giới hạn; giới hạn nằm ở 500 lượt dựng/tháng và hạn
mức Workers (100.000 lượt gọi/ngày) cho phần chạy động.

**Đã chạy thử (vòng 32, 12/09):** website sinh ra dựng được thành worker
Cloudflare (`opennextjs-cloudflare build`) và chạy thử ở máy bằng `wrangler
dev` — trang chủ, trang con, ảnh và tuyến nhận khách đều trả lời. Tệp cấu hình
đã nằm sẵn trong tệp nén ở `trien-khai/cloudflare/`, kèm `HUONG-DAN.md` ghi
đúng thứ tự lệnh. Bước cuối `wrangler deploy` cần tài khoản Cloudflare của chị
— **chỗ đó tôi chưa chạy**.

Tóm tắt (chi tiết trong `HUONG-DAN.md` của tệp nén):

```bash
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
cp trien-khai/cloudflare/wrangler.jsonc .
cp trien-khai/cloudflare/open-next.config.ts .
npx opennextjs-cloudflare build
npx wrangler login       # một lần
npx opennextjs-cloudflare deploy
```

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

## Sau khi lên mạng — bốn việc nên làm ngay

1. **Số điện thoại**: bấm thử nút gọi trên điện thoại thật. Sai số là mất khách
   mà không ai báo. Sai thì sửa **một chỗ**: `src/lib/thong-tin.ts` (tên, số,
   Zalo, tên miền) rồi đưa lên lại — mọi nút gọi, chân trang, thẻ chia sẻ đổi
   theo.
2. **Gửi thử biểu mẫu** một lần, rồi kiểm bảng tính/nhật ký xem có tới không.
3. **Dán thử link vào Zalo**: ô xem trước phải hiện tên, câu mô tả và tấm ảnh
   đầu (website đã có thẻ Open Graph). Không hiện ảnh nghĩa là
   `NEXT_PUBLIC_DIA_CHI` chưa đúng tên miền.
4. **Khai báo với Google**: vào Google Search Console → thêm tên miền → dán
   `https://<tên-miền>/sitemap.xml`. Website dựng sẵn đã có sitemap và robots.

Muốn **đếm người vào trang**: tạo một thuộc tính Google Analytics, lấy mã
`G-…`, đặt biến `NEXT_PUBLIC_GA_ID` ở nơi chạy rồi deploy lại. Không đặt thì
trang không nhúng gì của Google.

## Chi phí một website

| Khoản | Ước tính |
|---|---|
| AI (4 bước: ý định, kiến trúc, thiết kế, viết chữ) | 4 lượt gọi model bằng **khoá của chị** — với DeepSeek thường dưới 2.000đ/website |
| Nơi chạy | **0đ** nếu Cloudflare (Cách 0 hoặc 2 — cho phép thương mại); **0đ** nếu để trên VPS đang có; **20 USD/tháng** nếu Vercel Pro. Vercel Hobby **không được phép** cho web khách |
| Tên miền | Tuỳ nhà cung cấp, thường 200.000–400.000đ/năm |
| Ảnh | 0đ — lấy từ thư mục Drive của chị, không mua ảnh kho, không sinh ảnh AI |

---

## Nguồn đã tra (vòng 31, 12/09/2026)

- Điều khoản bản Hobby của Vercel: <https://vercel.com/docs/plans/hobby>
- Bản miễn phí Cloudflare (cho phép dùng thương mại): <https://www.cloudflare.com/plans/free/>
- Bộ chuyển Next.js cho Cloudflare: <https://opennext.js.org/cloudflare>
- Cloudflare Workers Builds (tự dựng từ kho GitHub; nối kho chỉ làm được trên
  bảng điều khiển): <https://developers.cloudflare.com/workers/ci-cd/builds/>

Tôi đọc điều khoản qua tài liệu công khai của hai bên. Đường Cloudflare đã
dựng thử và chạy thử **ở máy** (build + `wrangler dev`); bước đưa lên mạng
thật cần tài khoản của chị nên chưa chạy. Chỗ nào tôi chưa tự chạy thì trong
tài liệu này đều có ghi.
