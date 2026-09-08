# Lưu trữ, xem trước, và chi phí thật của trình dựng website

*Lập 09/09/2026. Trả lời ba câu chủ dự án đặt ra: kho chứa mã có phình to không;
người dùng nhìn thấy trang đang dựng bằng cách nào để yêu cầu sửa; và tiền.*

*Đọc cùng `nghien-cuu-dung-website.md` (kiến trúc) — tài liệu này lo phần hạ tầng.*

---

## Kết luận đặt trước

**1 · Lo lắng về kho chứa là lo nhầm chỗ.** Đo thật trên halongxanh360.vn: toàn bộ
mã nguồn của một trang web hoàn chỉnh là **810 KB**. Một nghìn dự án là 0,81 GB,
tức **0,28 USD/tháng** trên Neon. Không đáng để thiết kế quanh nó.

Thứ nặng không phải mã, mà là **ảnh — 26 MB, gấp 32 lần mã**. Đó mới là thứ cần
kho riêng, và nó cần kho riêng vì lý do khác: Postgres là chỗ tệ để chứa nhị phân.

**2 · Figma MCP là công cụ sai cho việc này.** Nó đọc thiết kế Figma *vào* mã, và
từ 02/2026 đẩy được mã *ra* Figma thành frame sửa được. Cả hai chiều đều là
thiết kế ↔ mã. Không chiều nào là "người dùng xem trang vừa dựng".

Việc xem trước phải tự làm, và cách đúng là **một Worker + một bucket R2 phục vụ
tệp tĩnh**, không phải mỗi người một project hosting. Lý do: Cloudflare Pages chặn
cứng **100 project mỗi tài khoản** và không tăng — trăm người dùng là đầy. Nhưng
trang tĩnh thì không cần project hosting riêng, và một Worker phục vụ được không
giới hạn trang. Xem mục 2.5.

**3 · Tiền token nuốt hết mọi khoản khác.** Ước tính ở mục 4: tiền model chiếm
**trên 98%** tổng chi phí biến đổi. Lưu trữ và hosting là số lẻ. Nên tối ưu phải
nhắm vào token, không nhắm vào kho.

**4 · Git không cần thiết cho việc lưu, nhưng nên có vì lý do khác.** Vì mã nhẹ,
Antigravity giữ được thoải mái. Git thành **tuỳ chọn** cho người muốn sở hữu mã —
không phải điều kiện bắt buộc. Điều này quan trọng: phần lớn khách môi giới bất
động sản không có tài khoản GitHub, và bắt họ tạo là dựng lại đúng rào cản vừa gỡ.

---

## 1 · Kho chứa — đo thật, không ước

### 1.1 · Số đo

Đo trên `D:\vinhomes_ha_long_xanh` ngày 09/09/2026 — một trang thật, 16 tuyến,
đang chạy production:

| Thành phần | Dung lượng | Ghi chú |
|---|---|---|
| Mã nguồn (100 tệp `.ts`/`.tsx`/`.css`) | **810 KB** | Đây là thứ tác tử sinh ra |
| `src/` kể cả tệp sinh tự động | 1,9 MB | Gồm `quy-can.generated.json` 616 căn |
| `public/` — ảnh | **26 MB** | Gấp 32 lần mã |
| Cả kho trừ `node_modules`/`.next`/`.git` | 244 MB | Gồm cả ảnh gốc nội bộ |

Mã là văn bản, nén được khoảng 4 lần → **~200 KB mỗi dự án sau nén**.

### 1.2 · Quy ra tiền

Neon tính **0,35 USD/GB-tháng** (đã giảm 80% sau khi Databricks mua lại năm 2025).

| Số dự án | Mã thô | Tiền/tháng |
|---|---|---|
| 100 | 81 MB | 0,03 USD |
| 1.000 | 810 MB | **0,28 USD** |
| 10.000 | 8,1 GB | 2,84 USD |

Mười nghìn dự án tốn chưa tới 3 USD một tháng. **Đây không phải vấn đề.**

Ảnh thì khác: 26 MB × 1.000 dự án = 26 GB = 9,10 USD/tháng — và Postgres vốn
không phải chỗ để chứa nhị phân (nó làm phình WAL, làm chậm sao lưu, và mỗi lần
đọc đều đi qua compute).

### 1.3 · Cái gì nằm ở đâu

| Loại | Chỗ chứa | Vì sao |
|---|---|---|
| Mã nguồn, `intent.md`, hợp đồng, hệ thiết kế | **Neon** (text) | Nhẹ, cần truy vấn, cần gắn với job |
| Ảnh người dùng tải lên, ảnh sinh ra | **Kho đối tượng** (Cloudflare R2) | Nặng, nhị phân, R2 **không tính phí băng thông ra** |
| Bản dựng đã triển khai | **Cloudflare Pages** | Xem mục 2 |
| Lịch sử phiên bản | **Git** nếu người dùng nối, nếu không thì chỉ giữ N bản gần nhất | Xem 1.4 |

### 1.4 · Đừng giữ mọi phiên bản trong cơ sở dữ liệu

Đây là chỗ kho **thật sự** phình to, và nó phình vì lý do khác chứ không phải vì
mã nặng. Một phiên trò chuyện dựng web có thể sinh 30–50 lượt sửa. Giữ trọn cây
tệp mỗi lượt là nhân dung lượng lên 50 lần.

Ba cách, xếp theo mức nên dùng:

1. **Chỉ giữ bản hiện tại + 10 bản gần nhất.** Đơn giản nhất, đủ dùng, và giới hạn
   trần cứng.
2. **Nối Git thì đẩy mỗi bản thành một commit** — lịch sử thành việc của Git, kho
   chỉ giữ bản hiện tại.
3. Lưu delta thay vì toàn bộ. Rẻ nhất nhưng phức tạp nhất; **chưa cần**.

---

## 2 · Người dùng nhìn thấy trang bằng cách nào

Đây là câu khó nhất trong ba câu, và là câu tôi chưa nghĩ tới ở bản nghiên cứu
trước.

### 2.1 · Figma MCP không giải quyết việc này

Tra ngày 09/09/2026. Máy chủ MCP chính thức của Figma có 14 công cụ (tính tới
02/2026), làm hai việc:

- **Đọc**: rút design token, component, layout, cây layer từ tệp Figma *vào* ngữ
  cảnh của mô hình. Miễn phí, đã phát hành rộng rãi.
- **Ghi** (từ 02/2026, còn beta): đẩy giao diện do mã sinh ra *lên* Figma thành
  frame sửa được. Figma đã nói sẽ **chuyển thành tính năng tính phí theo mức dùng**.

Cả hai chiều đều là **thiết kế ↔ mã**. Không chiều nào là "người dùng mở trang vừa
dựng ra xem". Dùng Figma cho việc này là bắt người dùng mở Figma — thêm một tài
khoản, thêm một giao diện, và họ vẫn không thấy trang thật chạy.

**Figma MCP có chỗ dùng, nhưng ở đầu vào**: nếu khách đã có thiết kế Figma sẵn thì
đọc token từ đó thay vì tự chọn màu. Đó là tính năng về sau, không phải bây giờ.

### 2.2 · Bốn cách xem trước, so thật

| Cách | Chạy được Next.js? | Chi phí | Rủi ro |
|---|---|---|---|
| **A. Triển khai lên Cloudflare Pages** | Có (bản tĩnh) | Gói free: **không giới hạn site**, không giới hạn băng thông | Hạn mức build — xem 2.4 |
| B. Sandpack (CodeSandbox) nhúng trong trang | Không — chỉ đóng gói JS phía client | Miễn phí, mã nguồn mở | Không chạy được app Next.js thật; chỉ hợp component lẻ |
| C. WebContainer (cách của bolt.new) | Có, chạy Node trong trình duyệt | **Cần giấy phép thương mại** cho dùng vì lợi nhuận — báo giá riêng, không công khai | Chi phí không lường trước được; phụ thuộc một nhà cung cấp |
| D. Chỉ chụp ảnh màn hình | Không | Gần như bằng 0 | Người dùng không bấm được, không cuộn, không xem mobile |

**Chọn A.** Lý do quyết định không phải giá mà là **tính thật**: người dùng xem
đúng trang sẽ chạy, trên đúng hạ tầng sẽ chạy, mở được trên điện thoại của họ, gửi
link cho người khác xem được. Ba cách kia đều là bản mô phỏng.

Ghi chú về C: nguồn tra ghi rõ *"Licensing is required for production usage of the
API in a commercial, for-profit setting"*, và giá phải hỏi riêng. Với một sản phẩm
đang tìm mô hình giá, một khoản chi phí không biết trước là rủi ro thật.

### 2.3 · Nhưng "xem được" chưa đủ — người dùng phải chỉ được chỗ cần sửa

Đây là phần phải tự làm, và nó không khó.

Trang xem trước nằm khác tên miền với Antigravity, nên **không chèn được mã vào
iframe từ bên ngoài**. Cách đi vòng: **bản dựng xem trước tự mang theo một đoạn mã
nhỏ**, chỉ có ở bản xem trước, không có ở bản giao cho người dùng.

Đoạn đó làm đúng ba việc:

1. Bấm vào phần tử nào thì tô viền phần tử đó.
2. Gửi về trang cha (qua `postMessage`) **đường dẫn phần tử + chữ đang hiển thị**.
3. Antigravity nhận được, hiện ô "sửa chỗ này thành…" ngay cạnh, và **đưa thẳng
   đường dẫn phần tử đó vào lượt trò chuyện tiếp theo**.

Cái được: mô hình không phải đoán người dùng đang nói tới đoạn nào. Thay vì *"đổi
cái tiêu đề màu xanh ở giữa trang"* — một câu mà mô hình phải mò — nó nhận được
đúng tệp, đúng dòng, đúng phần tử. Điều đó **cắt thẳng số token mỗi lượt sửa**,
tức là cắt đúng khoản chi phí lớn nhất (mục 4).

Đây là thứ đáng tự làm, và là thứ Figma không làm được.

### 2.4 · ĐÃ XÁC MINH: hạn mức Cloudflare Pages, và một chặn cứng lớn hơn

Tra thẳng tài liệu Cloudflare ngày 09/09/2026. Con số build là **lượt**, không phải
phút:

| | Free | Pro | Business |
|---|---|---|---|
| Lượt build/tháng | 500 | 5.000 | 20.000 |

Nhưng khi tra ra được con số đó thì lòi ra một giới hạn **quan trọng hơn hẳn**:

> **Giới hạn 100 project mỗi tài khoản** — và tài liệu ghi rõ giới hạn này *"không
> thường xuyên được tăng"*.

Một trăm người dùng, mỗi người một trang, là **đầy tài khoản**. Đây là chặn cứng
cho mô hình "Antigravity triển khai hộ", và nó không gỡ được bằng cách trả thêm
tiền — Pro và Business chỉ nâng số lượt build, không nâng số project.

(Các giới hạn khác đều thoải mái: 20.000 tệp mỗi site, mỗi tệp tối đa 25 MiB, build
timeout 20 phút.)

### 2.5 · Lời giải: trang tĩnh KHÔNG cần mỗi người một project hosting

Đây là chỗ nhìn lại bài toán thì nó tự nhỏ đi.

Cloudflare Pages là sản phẩm để **build và chạy** một dự án. Nhưng Antigravity đã
tự build rồi — bước 5 trong pipeline chạy `next build` để kiểm chứng. Thứ còn lại
sau bước đó chỉ là **một đống tệp tĩnh**. Và phục vụ tệp tĩnh thì không cần một
project hosting cho mỗi người.

**Một Worker + một bucket R2 phục vụ được không giới hạn trang:**

```
xem-truoc.antigravity.app/<ma-du-an>/…
        │
        └── Worker đọc <ma-du-an> → trả tệp từ R2 tại prefix đó
```

| | Cloudflare Pages mỗi người một project | Một Worker + R2 |
|---|---|---|
| Trần số trang | **100** | Không có |
| Lượt build | 500/tháng (dùng chung) | Không dùng — Antigravity tự build |
| Băng thông ra | Miễn phí | **R2 không tính phí ra** |
| Chi phí nền | 0 → 5 → 20 USD | Workers 5 USD/tháng + R2 theo dung lượng |
| Tên miền riêng cho người dùng | Được, nhưng tính vào 100 | Được, trỏ về cùng Worker |

Cách này còn có một cái lợi không ngờ: **xem trước và xuất bản dùng chung một cơ
chế**. Không phải dựng hai đường. Khác nhau chỉ là một cờ trong bản dựng — bản xem
trước mang theo đoạn mã chỉ-chỗ ở mục 2.3, bản xuất bản thì không.

**Khi nào cần Workers for Platforms (25 USD/tháng):** chỉ khi trang của người dùng
phải **chạy mã phía máy chủ** — có API route, có kết nối cơ sở dữ liệu. Với phạm
vi bản đầu mà chủ dự án đã chốt (trang tĩnh nhiều mục), **chưa cần**. Ghi lại đây
để khi nào mở rộng sang ứng dụng có CSDL thì biết đường đi tiếp.

---

## 3 · Git — nên có, nhưng không phải điều kiện bắt buộc

Chủ dự án đề xuất *"1 dự án = 1 git repo, kết nối thẳng vào user git của tôi"*.
Đúng hướng, nhưng **lý do đằng sau nó không còn đứng vững sau khi đo**: mã chỉ 810
KB, nên Git không giải quyết vấn đề lưu trữ — vì không có vấn đề lưu trữ.

Git vẫn nên có, vì ba lý do khác:

1. **Người dùng sở hữu mã của họ.** Đây là điểm bán hàng thật, và là thứ phân biệt
   với các nền tảng nhốt người dùng.
2. **Lịch sử phiên bản miễn phí** — giải quyết mục 1.4 mà không phải viết gì.
3. **Triển khai tự chạy** — Cloudflare Pages và Vercel đều bắt được push.

### 3.1 · GitHub App, không phải OAuth App

| | OAuth App | GitHub App |
|---|---|---|
| Hạn mức | 2.000 lượt xin token/giờ | Token cài đặt **giãn theo số kho và số người dùng** |
| Quyền | Theo scope, thường rộng | Theo từng kho, người dùng chọn kho nào |
| Người dùng cảm nhận | "Ứng dụng này xin quyền vào toàn bộ GitHub của tôi" | "Cho ứng dụng này vào đúng kho này" |

Chọn **GitHub App**. Quyền hẹp hơn nên người dùng dễ đồng ý hơn, và hạn mức giãn
theo quy mô thay vì trần cứng.

### 3.2 · ⚠️ Nhưng phần lớn khách của chủ dự án KHÔNG có GitHub

Đây là điều phải nói thẳng. Khách môi giới bất động sản Việt Nam phần lớn chưa
từng dùng GitHub. Bắt họ tạo tài khoản, xác minh email, cài app, chọn kho — là
dựng lại đúng cái rào cản kỹ thuật vừa gỡ ở phần khoá API.

**Nên mặc định là KHÔNG cần Git:**

| Người dùng | Mặc định | Tuỳ chọn |
|---|---|---|
| Không có GitHub (đa số) | Antigravity giữ mã, triển khai hộ, tải về được tệp nén | — |
| Có GitHub (số ít, rành kỹ thuật) | Vẫn như trên | Nối kho để sở hữu mã và có lịch sử |

Vì mã nhẹ, cột "mặc định" không tốn gì đáng kể. Git thành **phần thưởng cho người
muốn**, không phải **thuế cho tất cả**.

---

## 4 · Chi phí — bảng đầy đủ

### 4.1 · Mỗi dự án

| Khoản | Ước tính | Nguồn |
|---|---|---|
| Token model | **1–2 USD** | Tính ở `nghien-cuu-dung-website.md` mục 6.3 |
| Lưu mã trên Neon | 0,0003 USD/tháng | 810 KB × 0,35 USD/GB |
| Hosting | **~0 USD** | Một Worker phục vụ mọi trang; nền 5 USD/tháng chia đều |
| Băng thông | **0 USD** | R2 không tính phí băng thông ra |
| Ảnh trên R2 | tuỳ, ~0,01 USD/tháng cho 26 MB | R2 không tính phí ra |

**Token chiếm trên 98%.** Mọi khoản khác cộng lại chưa tới 1 cent.

### 4.2 · Ở quy mô 100 người dùng, mỗi người 3 trang/tháng

| Khoản | Tháng |
|---|---|
| Token (300 trang × 1,5 USD) | **450 USD** |
| Neon lưu mã (243 MB) | 0,09 USD |
| Cloudflare Workers (nền, phục vụ mọi trang) | 5 USD |
| R2 ảnh (~8 GB) | ~0,12 USD |
| **Tổng** | **~455 USD** |

Doanh thu cần để hoà vốn: **4,55 USD/người/tháng** ≈ 115.000 đồng. Một gói
250.000–300.000 đồng/tháng có biên gấp đôi tới gấp ba.

⚠️ Đây là **ước tính từ bảng giá công bố**, không phải số đo. Phép tính ghi ra để
chỉnh lại khi có số thật từ lượt chạy đầu tiên.

### 4.3 · Ba đòn bẩy giảm chi phí, xếp theo hiệu quả

1. **Prompt caching** cho phần ngữ cảnh lặp lại giữa các lượt sửa. Đọc cache rẻ hơn
   nhiều so với gửi lại. Đây là đòn bẩy lớn nhất vì phần lặp lại rất lớn.
2. **Chỉ đúng phần tử cần sửa** (mục 2.3). Sửa một nút thì gửi một tệp, không gửi
   cả dự án.
3. **Chia bậc model** — Haiku cho bước rẻ (đặt tên tệp, sinh nội dung mẫu), Sonnet
   cho bước khó (kiến trúc, sửa lỗi build).

---

## 5 · Trường hợp biên phải tính trước

| Tình huống | Hậu quả nếu không xử | Cách xử |
|---|---|---|
| Người dùng bỏ dở giữa chừng | Mã mồ côi tích tụ | Xoá dự án chưa hoàn thành sau 30 ngày, báo trước 7 ngày |
| Build hỏng lặp đi lặp lại | Tốn token mà không ra kết quả | **Trần 3 lần thử**, hỏng thì dừng và báo người dùng, không thử tiếp |
| Một người dựng hàng trăm trang | Hoá đơn token bất ngờ | **Hạn mức cứng theo gói** — hết là dừng, không phải cảnh báo |
| Người dùng tải ảnh 50 MB lên | Phình kho đối tượng | Trần dung lượng mỗi tệp + mỗi dự án; nén ảnh khi nhận |
| Trang sinh ra chứa nội dung vi phạm | Chịu trách nhiệm liên đới | Hàng rào nội dung đã có (`cong-chan`) phải chạy cả trên trang sinh ra |
| Cloudflare khoá tài khoản | Mất toàn bộ trang của mọi người dùng | Giữ bản mã trong Neon — dựng lại được ở chỗ khác trong vài giờ vì mã chỉ 810 KB/dự án |
| Người dùng muốn tên miền riêng | — | Trỏ DNS về cùng Worker; Worker đọc hostname để biết trả trang nào |
| Trang có API route / cần CSDL | Worker + R2 chỉ phục vụ tệp tĩnh | Ngoài phạm vi bản đầu. Khi cần: Workers for Platforms 25 USD/tháng |
| Người dùng huỷ gói | Trang của họ còn chạy hay tắt? | **Phải quyết trước khi bán gói đầu tiên** — xem mục 6 |

---

## 6 · Việc còn phải quyết

1. **Người dùng huỷ gói thì trang của họ ra sao?** Tắt ngay, giữ 30 ngày, hay giữ
   mãi ở chế độ chỉ đọc? Câu này ảnh hưởng tới cả niềm tin lẫn chi phí, và phải
   trả lời **trước khi bán gói đầu tiên** chứ không phải khi có người huỷ.
2. **Giá gói tháng.** Mốc hoà vốn tính được: ~115.000 đồng/người/tháng ở mức 3
   trang/tháng.
3. **Thứ tự làm.** Đề xuất: đo + hạn mức → xem trước → pipeline sinh mã → Git.
   Lý do: hai cái đầu chặn việc mở bán; cái thứ ba là phần lõi; cái cuối là tuỳ chọn.
