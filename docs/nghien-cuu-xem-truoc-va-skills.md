# Xem trước trực tiếp, tải zip, và bộ skills bổ trợ thiết kế

*Lập 09/09/2026. Nghiên cứu sâu theo yêu cầu chủ dự án: cách MiniMax và các trình
dựng khác cho xem trước ngay trên web; cách tải mã về dạng zip; và gắn những
skills/repos nào để bổ trợ việc thiết kế, dựng khung, làm bản mẫu.*

*Đọc cùng `nghien-cuu-dung-website.md` (kiến trúc) và
`nghien-cuu-luu-tru-va-xem-truoc.md` (hạ tầng, chi phí).*

---

## Ba quyết định chủ dự án đã chốt (09/09)

1. **Công cụ nội bộ** — chỉ 2 người dùng. Bỏ hẳn gói tháng, hạn mức, đa người thuê.
2. **Chạy được cả hai nơi** — trên Vercel và trên máy.
3. **Trang sinh ra dùng Next.js + Tailwind** như halongxanh360.

Quyết định 1 cắt bỏ rất nhiều việc. Quyết định 2 và 3 lại tạo ra đúng một bài toán
khó, và nó là trọng tâm tài liệu này.

---

## Kết luận đặt trước

**1 · "Localhost" mà chủ dự án thấy ở các trang kia là một máy chủ dev chạy thật —
chỉ là chạy ở chỗ khác.** Không có phép màu nào. Có ba cách làm ra cảm giác đó, và
hai trong ba không dùng được ở đây.

**2 · Next.js + Tailwind làm việc xem trước khó hẳn lên, và điều này phải nói
thẳng.** Nếu chọn HTML thuần thì xem trước là chuyện tầm thường — ghi tệp, mở ra,
xong. Next.js cần `npm install` rồi `next build` hoặc `next dev`, mà **Vercel không
chạy được cả hai**: hệ thống tệp chỉ đọc trừ `/tmp` 500 MB, hàm tối đa 60 giây trên
gói Hobby. Đây là ràng buộc cứng, đã xác minh.

**3 · Nên có hai chế độ, không phải một.** Chạy trên máy thì đẻ tiến trình
`next dev` thật — localhost thật, sửa là thấy ngay, không tốn đồng nào. Chạy trên
Vercel thì mượn sandbox. Cùng một giao diện trong mã, hai bản hiện thực.

**4 · Nguồn bổ trợ thiết kế tốt nhất không nằm trong 11 nguồn — nó là chính kho
halongxanh360.** Ở đó có 40 component đã chạy thật trên production, viết bằng tiếng
Việt, đúng ngành bất động sản, đã qua kiểm duyệt của chủ dự án. Không thư viện
chung nào bằng được cho đúng tệp khách này.

---

## 1 · Các trình dựng web làm thế nào — ba họ

### 1.1 · MiniMax

Tra ngày 09/09/2026. MiniMax có **hai sản phẩm khác nhau**, và chúng giải bài toán
xem trước theo hai cách:

| | MiniMax Agent (web) | MiniMax Code (ứng dụng máy tính) |
|---|---|---|
| Xem trước | *"built-in browser for page and HTML preview, inspection, and debugging"* | *"local project context, file changes, terminal sessions, and browser previews"* |
| Chạy ở đâu | Máy chủ của họ | **Máy người dùng** |
| Có localhost thật | Không — trình duyệt nhúng trỏ tới máy chủ họ | **Có** |

Cái chủ dự án thấy có localhost gần như chắc chắn là **bản ứng dụng máy tính** —
nó chạy ngay trên máy nên có terminal thật, tiến trình thật, cổng thật.

MiniMax cũng nói họ dùng nhiều tác tử chuyên biệt phối hợp — một cho phần nhìn, một
cho phần hành vi. Trùng đúng kiến trúc đã đề xuất ở `nghien-cuu-dung-website.md`.

### 1.2 · Ba họ, và cái nào dùng được

| Họ | Ví dụ | Cách chạy | Dùng được cho Antigravity? |
|---|---|---|---|
| **A. Chạy trong trình duyệt** | bolt.new (StackBlitz WebContainer) | Node chạy ngay trong tab trình duyệt | **Không** — cần giấy phép thương mại, giá phải hỏi riêng |
| **B. Sandbox trên mây** | Lovable, Replit, MiniMax Agent | Mỗi phiên một máy ảo chạy dev server, đưa ra qua URL | **Được** — Vercel Sandbox / E2B / Daytona |
| **C. Chạy trên máy người dùng** | MiniMax Code, Cursor | Tiến trình con ngay trên máy | **Được, và tốt nhất** khi Antigravity chạy trên máy |

Họ A loại vì giấy phép. Còn lại B và C — và may là chủ dự án đã chốt Antigravity
chạy cả hai nơi, nên **dùng cả B lẫn C, mỗi cái cho một nơi**.

---

## 2 · Hai chế độ xem trước

### 2.1 · Ràng buộc đã xác minh

**Vercel không dựng được Next.js bên trong hàm.** Tra tài liệu Vercel ngày
09/09/2026:

- Hệ thống tệp **chỉ đọc**, trừ `/tmp` — tối đa **500 MB**.
- Hàm chạy tối đa **60 giây** trên Hobby (300 giây với fluid compute).

Một lần `npm install` cho dự án Next.js đã ngốn phần lớn 500 MB và thường lâu hơn
60 giây. Cộng thêm `next build` nữa thì không có cửa. **Không phải tối ưu được —
phải đi đường khác.**

### 2.2 · Chế độ A — chạy trên máy: đẻ tiến trình thật

Khi Antigravity chạy bằng `npm run dev` trên máy chủ dự án, nó là tiến trình Node
đầy đủ quyền. Ghi cây tệp ra thư mục tạm, chạy `next dev` làm tiến trình con, lấy
cổng nó cấp, nhúng vào iframe.

Được:
- **Localhost thật** — đúng cái chủ dự án thấy ở MiniMax Code.
- **Sửa là thấy ngay** — HMR của Next.js lo, không phải build lại.
- **Không tốn đồng nào.**
- Gỡ lỗi được bằng chính DevTools của trình duyệt.

Mất: chỉ chạy khi Antigravity chạy trên máy. Và phải quản tiến trình con cho tử tế
— giết khi đóng dự án, chặn chạy quá nhiều cùng lúc, thu cổng về.

### 2.3 · Chế độ B — chạy trên Vercel: mượn sandbox

| | Vercel Sandbox | E2B | Daytona |
|---|---|---|---|
| Miễn phí | Hobby: **5 giờ CPU/tháng**, 5.000 lượt tạo, 10 sandbox đồng thời | **$100 tín dụng một lần** | **$200 tín dụng** |
| Khởi động | — | ~150 ms (Firecracker microVM) | dưới 90 ms (Docker) |
| Chạy `npm run dev`? | **Có** — tài liệu có ví dụ đúng lệnh này | Có | Có |
| Thời hạn phiên | Mặc định 5 phút, gia hạn được; dừng rồi chạy lại thì reset | Pro: 24 giờ | — |
| Giá vượt mức | Tính vào cùng bể tín dụng $20 của Pro | $0,0504/vCPU-giờ | $0,0504/vCPU-giờ |

**Chọn Vercel Sandbox**, vì ba lý do theo thứ tự quan trọng:

1. **Cùng nhà.** Antigravity đã ở trên Vercel; không thêm tài khoản, không thêm
   khoá, không thêm hoá đơn.
2. **5 giờ CPU/tháng là đủ cho 2 người.** Mỗi phiên xem trước 5 phút → khoảng 60
   phiên/tháng miễn phí. Hai người dùng khó chạm trần.
3. Nếu chạm trần thật, E2B với $100 tín dụng là đường lui sẵn có — ở mức
   $0,05/vCPU-giờ thì $100 là khoảng **2.000 giờ**.

### 2.4 · Một giao diện, hai bản hiện thực

Đừng viết hai nhánh `if` rải khắp mã. Khai một giao diện, chọn bản hiện thực lúc
chạy:

```ts
export interface MoiTruongDung {
  /** Ghi cây tệp, cài phụ thuộc, chạy dev server. Trả URL xem được. */
  moXemTruoc(tep: CayTep): Promise<{ url: string; dong: () => Promise<void> }>;
  /** Chạy tsc + next build. Trả lỗi nguyên văn nếu hỏng. */
  kiemChung(tep: CayTep): Promise<{ dat: boolean; loi?: string }>;
}
```

- `MoiTruongMay` — tiến trình con, dùng khi `process.env.VERCEL` không có.
- `MoiTruongSandbox` — Vercel Sandbox, dùng khi có.

Bước kiểm chứng ở `nghien-cuu-dung-website.md` mục 4 dùng đúng giao diện này. Nghĩa
là **xem trước và kiểm chứng chung một hạ tầng** — không dựng hai đường.

### 2.5 · Mẹo cắt thời gian chờ: cài phụ thuộc trước

`npm install` là phần lâu nhất, và nó **giống nhau ở mọi dự án** vì mọi trang sinh
ra đều dùng cùng bộ Next.js + Tailwind. Nên đóng sẵn một ảnh sandbox đã có
`node_modules`, mỗi dự án chỉ ghi đè phần `src/`.

Rút thời gian mở xem trước từ hàng phút xuống vài giây, và cắt luôn phần lớn thời
gian CPU tính tiền.

---

## 3 · Tải mã về dạng zip — dễ, nhưng có một bẫy

Nén cây tệp thành zip là việc tầm thường. Cái bẫy nằm ở chỗ khác: **zip mã nguồn
Next.js mở ra thì không chạy được.** Người nhận phải cài Node, chạy `npm install`,
rồi `npm run dev`. Khách môi giới bất động sản sẽ không làm chuyện đó.

**Nên có hai nút, không phải một:**

| Nút | Bên trong | Người nhận làm gì |
|---|---|---|
| **Tải mã nguồn** | `src/`, `package.json`, cấu hình | Cần biết chạy npm. Dành cho người muốn tự sửa hoặc thuê thợ. |
| **Tải bản chạy được** | Kết quả `next build` với `output: export` — HTML + CSS + JS tĩnh | **Bấm đúp là mở.** Đưa lên hosting nào cũng chạy. |

### 3.1 · Bản tĩnh mất gì

Tra tài liệu Next.js: `output: export` **không chạy được API Routes**, và tuyến
động cần khai trước bằng `generateStaticParams`.

Với một trang giới thiệu nhiều mục thì gần như không mất gì — **trừ đúng một thứ:
form liên hệ cần chỗ để gửi về.**

Ba cách, xếp theo mức nên dùng:

1. **Gửi về chính Antigravity** — một điểm cuối nhận form, gom về một chỗ, người
   dùng xem trong Antigravity. Hợp nhất với sản phẩm, và không thêm tài khoản nào.
2. Dịch vụ nhận form bên ngoài (Formspree, Web3Forms…) — nhanh, nhưng thêm một
   tài khoản và một chỗ dữ liệu khách nằm ngoài tầm.
3. Chỉ để nút Zalo và số điện thoại, bỏ form. Nghe thô nhưng với khách Việt Nam thì
   **Zalo có khi còn ra kết quả tốt hơn form** — halongxanh360 đang làm đúng vậy.

---

## 4 · Bộ skills và repos bổ trợ thiết kế

Đây là câu hỏi thứ hai của chủ dự án, và có một nguyên lý xuyên suốt đáng nói trước
khi liệt kê.

### 4.1 · Nguyên lý: cho model TRA kho thật, đừng để nó NHỚ

Tài liệu shadcn nói thẳng vấn đề, và nó là đúng căn bệnh kho này đã chữa cho phần
nội dung:

> *Most AI UI generators rely on training data and often produce incorrect props or
> structure. MCP uses a live component registry, so the generated UI is based on
> real components, not approximations. The LLM doesn't need to guess or hallucinate
> component APIs.*

Mô hình nhớ sai tên prop của một component cũng y hệt việc nó nhớ sai năm hiện tại
— **cùng một bệnh, cùng một thuốc: đưa sự thật vào chứ đừng hỏi trí nhớ.** Kho này
đã giải bài đó cho ngày tháng bằng `dongHomNay()`. Với giao diện thì thuốc là một
kho component tra được.

### 4.2 · Bảng: dùng gì cho việc gì

| Việc cần | Nguồn | Vì sao chọn | Giá |
|---|---|---|---|
| **API component đúng, không bịa** | **shadcn MCP** (`ui.shadcn.com/docs/mcp`) | Kho sống, tra được theo tên và chức năng, nhiều registry | **Miễn phí**, registry mặc định không cần khoá |
| **Khối landing dựng sẵn** (hero, bảng giá, FAQ, chân trang) | **HyperUI** — 500+ khối, Tailwind v4, **giấy phép MIT** | Dán thẳng, không thêm phụ thuộc, không ràng buộc giấy phép | Miễn phí |
| Khối bổ sung | Preline (300+), Flowbite (400+ mục), OpenTailwind (1.761 khối + 1.920 mẫu) | Nhiều lựa chọn hơn khi HyperUI thiếu | Miễn phí |
| **Hệ màu, cặp font, anti-pattern** | **ui-ux-pro-max-skill** (nguồn #8 chủ dự án gửi) | 192 bảng màu, 74 cặp font, và **checklist trước khi giao**: tương phản, responsive, focus state, `prefers-reduced-motion` | Miễn phí |
| **Vai trò tác tử** | agency-agents (nguồn #7) | 230+ vai dạng Markdown — **chỉ lấy 5–6 vai**, đừng nhập cả bộ | Miễn phí |
| **Kiểm chứng trực quan** | chrome-devtools-mcp (nguồn #9) | Mở trang, chụp ảnh, đọc lỗi console, chạy Lighthouse | Miễn phí |
| **Định dạng đóng gói hướng dẫn** | Chuẩn **Agent Skills / SKILL.md** | Xem 4.3 | Miễn phí |
| **Khung sườn thật, đúng ngành** | **Chính kho halongxanh360** | Xem 4.4 | Đã có |
| Đọc thiết kế Figma của khách | Figma MCP | Chỉ khi khách đã có Figma sẵn. Chiều đọc miễn phí; chiều ghi còn beta và sẽ tính phí | Miễn phí (chiều đọc) |
| Thư viện UI trả phí | horizonx (nguồn #5) $24,99–99,99/tháng | **Chưa cần** — HyperUI và Preline miễn phí đã đủ | Trả phí |

### 4.3 · SKILL.md — định dạng đáng theo

Chuẩn mở từ 18/12/2025, OpenAI và Microsoft đã theo. Điểm đáng giá nhất là **tiết
lộ dần** (progressive disclosure):

- Lúc khởi động chỉ nạp `name` + `description` của mọi skill — khoảng **80 token
  mỗi skill**.
- Khi thấy skill nào liên quan mới nạp trọn phần thân.
- `scripts/`, `references/`, `assets/` chỉ nạp khi phần thân nhắc tới.

Quy cách: frontmatter chỉ bắt buộc `name` (≤64 ký tự) và `description` (≤1024 ký
tự), thân Markdown nên dưới 500 dòng.

**Vì sao điều này quan trọng cho Antigravity:** hệ module hiện nhét mọi hướng dẫn
thẳng vào lời nhắc. Với hai chục skill thiết kế, cách cũ là nhét cả hai chục vào
mọi lượt gọi. Theo chuẩn SKILL.md thì hai chục skill tốn khoảng **1.600 token** ở
trạng thái chờ, và chỉ skill được chọn mới bung ra. Đây là đòn bẩy giảm token trực
tiếp — mà token là 98% chi phí.

### 4.4 · ⚠️ Nguồn tốt nhất không nằm trong 11 nguồn

Kho `D:\vinhomes_ha_long_xanh` có **40 component đã chạy thật trên production**:

- 28 component trang: `hero-anh`, `bang-hang`, `cau-hoi-thuong-gap`, `gia-thuc-tra`,
  `danh-sach-san-pham`, `doi-ngu-tu-van`, `so-do-ket-noi`, `khoi-chot`,
  `dang-ky-form`, `site-header`, `site-footer`…
- 12 component nền: `khung`, `reveal`, `bang-truot`, `marquee`, `project-image`,
  `smooth-scroll`…

Chúng hơn hẳn mọi thư viện chung ở bốn điểm:

1. **Đúng ngành.** Bảng hàng, quỹ căn, giá thực trả, tiến độ — không thư viện Tây
   nào có những khối này.
2. **Đúng tiếng.** Nhãn, cách xưng hô, cách viết số đã tiếng Việt sẵn.
3. **Đã qua kiểm duyệt của chủ dự án** — kể cả những thứ chủ dự án đã bác bỏ, và
   những thứ đó ghi trong chú thích mã nên tác tử đọc được.
4. **Đã chạy thật** — không phải mẫu trình diễn.

**Đề xuất: trích kho này thành khuôn mẫu đầu tiên**, và để tác tử sinh trang mới
bằng cách chọn-và-ghép từ 40 component đó trước, chỉ viết mới khi không có sẵn.

Cái được lớn nhất không phải tiết kiệm thời gian, mà là **giảm rủi ro**: ghép
component đã chạy thì gần như chắc chắn build được. Viết mới thì mỗi lần là một
lần rủi ro.

---

## 5 · Gộp lại — luồng đầy đủ

```
Người dùng mô tả
      │
      ├─ 1. Ý định         → intent.md
      ├─ 2. Kiến trúc      → danh sách trang + bảng hợp đồng
      ├─ 3. Hệ thiết kế    → token màu/font          [ui-ux-pro-max]
      ├─ 4. Chọn & ghép    → từ 40 component halongxanh360 + HyperUI
      │                                              [shadcn MCP khi cần mới]
      ├─ 5. Sinh phần còn thiếu (mỗi tệp một lượt gọi)
      │
      ├─ 6. KIỂM CHỨNG     → tsc + next build          [MoiTruongDung]
      │        │              chụp ảnh + đọc console   [chrome-devtools-mcp]
      │        └─ hỏng → quay lại 5 kèm lỗi nguyên văn (trần 3 lần)
      │
      ├─ 7. XEM TRƯỚC      → dev server thật           [MoiTruongDung]
      │        └─ người dùng bấm vào chỗ cần sửa → quay lại 5
      │
      └─ 8. Giao           → zip mã nguồn · zip bản tĩnh · (tuỳ chọn: đẩy lên Git)
```

Bước 6 và 7 dùng chung `MoiTruongDung`. Bước 4 đặt **trước** bước 5 là cố ý: ghép
trước, viết sau, vì ghép an toàn hơn viết.

---

## 6 · Sáu chỗ phải cẩn thận

| Chỗ | Rủi ro | Cách xử |
|---|---|---|
| **Gọi shadcn MCP từ ứng dụng tự viết** | Tài liệu chỉ hướng dẫn cho Claude Code/Cursor/VS Code/Codex. Antigravity phải tự làm MCP client | Có làm được (chuẩn mở), nhưng là việc thật. **Bản đầu cứ nhúng sẵn danh mục component vào lời nhắc**, thêm MCP sau |
| **Giấy phép từng thư viện** | Dán mã người khác vào trang bán cho khách | HyperUI **MIT** — an toàn. Các thư viện khác phải đọc từng cái. Ghi nguồn từng khối vào chú thích mã |
| **Tiến trình con không được dọn** | Chạy vài chục dự án là máy đầy cổng và đầy RAM | Trần số dev server đồng thời; tự giết sau 30 phút không dùng |
| **`npm install` trong sandbox lâu** | Mỗi lần xem trước chờ vài phút thì không ai dùng | Ảnh sandbox đóng sẵn `node_modules` — xem 2.5 |
| **Skill phình ra** | Hai chục skill thành hai trăm, quay lại đúng bài toán nhồi ngữ cảnh | Giữ đúng bộ đang dùng. `description` phải viết chuẩn — đó là thứ duy nhất model đọc để chọn |
| **Bản tĩnh mất form liên hệ** | Trang giao cho khách có form không gửi đi đâu | Quyết trước một trong ba cách ở mục 3.1 |

---

## 7 · Việc cần chủ dự án quyết

1. **Trích halongxanh360 thành khuôn mẫu — làm hay không?** Đây là đòn bẩy lớn
   nhất trong cả tài liệu, nhưng nó gắn trình dựng vào đúng ngành bất động sản.
   Nếu chị muốn công cụ dựng được mọi loại trang thì phải cân lại.
2. **Form liên hệ ở bản tĩnh gửi về đâu?** Ba lựa chọn ở mục 3.1. Đề xuất: gửi về
   chính Antigravity.
3. **Bắt đầu từ đâu?** Đề xuất thứ tự:
   `MoiTruongDung` (chạy trên máy trước) → kiểm chứng → xem trước → chọn-và-ghép
   → sinh phần thiếu → zip.
   Lý do: bản chạy-trên-máy không tốn gì và làm nhanh nhất, nên nó là đường ngắn
   nhất tới thứ bấm được để xem có đúng ý không.
