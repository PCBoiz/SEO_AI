# Báo cáo công việc phiên 15–17/09/2026

*Viết cho chủ dự án. Mọi con số trong đây đều do tôi đo được, không có số nào
ước lượng. Chỗ nào chưa kiểm được, tôi ghi rõ là chưa kiểm được.*

---

## 1. Một trang tóm tắt

Phiên này làm bảy vòng ở Antigravity và hai vòng ở website halongxanh360.vn.

**Bốn thứ mới:**

| Việc | Ở đâu | Trạng thái |
|---|---|---|
| Màn **Trò chuyện** — hỏi AI bằng lời thường ngay trong Antigravity | Antigravity | Đã lên Vercel. **Chờ chị chạy migration** (A8) mới dùng được |
| **Nhịp gõ lịch đăng bài từ cron của Vercel** — bỏ được việc dán crontab lên VPS | Antigravity | Đã lên Vercel. **Chờ chị đặt một biến** (A2) mới chạy |
| `/tin-tuc` không còn bắt khách nhìn màn trắng khi máy chủ vừa khởi động lại | halongxanh | Đã đẩy lên GitHub. **Chờ chị deploy** (A1) |
| Màn Trò chuyện **nói ra lượng dùng** của từng lượt (token, thời gian, model) | Antigravity | Đã lên Vercel. Dùng được ngay sau A8 |

**Một phát hiện quan trọng:** đo trang thật ngày 16/09, **mục tin tức chưa có
một bài nào**, sitemap 0 địa chỉ bài. Lịch viết bài chị lập từ 12/09 **chưa
chạy lần nào**, vì nó cần một "nhịp gõ" định kỳ mà nhịp đó chưa từng có. Đây là
lý do tôi làm phần cron — xem mục 4.

**Một kết quả "không làm gì" nhưng đáng tiền:** tôi thử ba hướng tăng tốc trang
liên hệ và trang dự án, đo kỹ, và **loại cả ba** vì không hướng nào có lợi thật.
Chi tiết ở mục 6 — gồm cả chuyện tôi suýt giữ lại một thay đổi vô ích vì tin vào
một lần đo may mắn.

---

## 2. Việc của chị — xếp theo mức chặn

| # | Việc | Mất | Chặn cái gì |
|---|---|---|---|
| **A2** | Vercel → dự án Antigravity → Settings → Environment Variables → thêm `CRON_SECRET` (chuỗi ngẫu nhiên ≥ 16 ký tự) → **Redeploy** | 3 phút | **Toàn bộ việc viết bài tự động.** Chưa làm thì website mãi không có bài |
| **A1** | VPS: `ssh root@103.7.40.145` → `cd /opt/halongxanh` → `./trien-khai.sh` | 3 phút | Ba đợt sửa website chưa lên trang thật |
| **A8** | Trong thư mục Antigravity: `npm run db:neon:migrate` | 1 phút | Màn Trò chuyện |
| **C2** | Gửi "khoá duyệt bài" cho khách **một lần qua kênh riêng** | 1 tin | Bài viết xong vẫn không lên trang nếu không ai duyệt |
| A3 | Thu hồi khoá OpenAI `sk-proj-77fD…` đã lộ | 1 phút | An toàn — ai đọc được cũng tiêu tiền của chị |
| A5 | Vercel → Deployments: bản mới nhất có chữ **Ready** không | 1 phút | — |

Ba việc A2 + A8 + C2 cộng lại chưa tới 5 phút, và chúng mở khoá cho **cả đường
ống nội dung** lẫn **màn Trò chuyện**. Hướng dẫn từng bước nằm trong
`VIEC-CAN-LAM.md` (mục 24 cho A2, mục 23 cho A8).

---

## 3. Màn Trò chuyện (vòng 81–82)

### Làm gì

Mở `/tro-chuyen` trong Antigravity là hỏi AI bằng lời thường: lên ý tưởng
website, viết nội dung, góp ý SEO. Có danh sách các cuộc trò chuyện, gắn được
cuộc vào một dự án để trợ lý biết tên và giọng văn của dự án đó, ba gợi ý mở đầu
theo đúng ngành bất động sản.

### Điều phải nói trước

**Gói Claude Pro 22 đô của chị không chạy được Antigravity.** Pro là quyền dùng
ứng dụng Claude trên web, không kèm khoá lập trình; điều khoản của Anthropic cấm
đem tài khoản ứng dụng sang phần mềm khác. Nên màn này chạy bằng **khoá AI chị
đã tự lưu trong Antigravity**, ưu tiên rẻ trước: DeepSeek → Claude → OpenAI →
Gemini. Mỗi tin nhắn là một lượt gọi tính vào tài khoản của chủ khoá.

### Hai chỗ dễ hỏng, xử trước khi chị gặp

1. **Gọi AI hỏng thì mất chữ đã gõ.** Tin của chị được lưu **trước** khi gọi AI.
   Hỏng thì màn hiện lỗi kèm nút *Gửi lại*, bấm lại không nhân đôi tin.
2. **Khoảng giữa lúc mã lên Vercel và lúc chị chạy migration.** Bảng chưa có mà
   vào trang sẽ là màn lỗi trắng. Giờ nó hiện đúng một dòng nhắc phải làm gì.

### Một lỗi thật tôi tự tìm ra ở vòng sau

Sau một lượt AI hỏng, tin của chị *đã* nằm trong cơ sở dữ liệu nhưng trên màn nó
mới là bản tạm. Nếu chị không bấm *Gửi lại* mà gõ tin mới và lượt đó chạy được,
**tin cũ biến mất khỏi màn** (dữ liệu vẫn còn, tải lại trang là hiện). Đã sửa.

### Chỗ đáng nói hơn cả cái lỗi

Phép thử tôi viết ở vòng trước **tự dối mình**: nó tìm chữ của tin nhắn trên
trang, mà tiêu đề cuộc trò chuyện lại lấy từ chính tin đầu — nên phép thử vẫn
xanh kể cả khi bong bóng tin đã biến mất. Từ đó tôi đặt ra luật cho chính mình:
**muốn tin một phép thử thì gỡ bản sửa ra, chạy lại, phải thấy nó đỏ.** Luật này
đã áp dụng cho mọi phép thử viết sau đó.

---

## 4. Nhịp gõ lịch đăng bài từ cron Vercel (vòng 85–86)

### Vì sao phải làm

Đo trang thật 16/09:

| Đo gì | Kết quả |
|---|---|
| Mục tin tức có bài nào không | **0 bài**, hiện ô "Chưa có bài viết nào" |
| Sitemap có địa chỉ bài nào không | **0 trên tổng 31 địa chỉ** |
| Tốc độ trang | Tốt: 0,1–0,35 giây |
| Bản đang chạy | Bản 13/09 **đã deploy** (đo qua độ dài mô tả SEO: 143/154/152 ký tự) |

Chuỗi đáng lẽ phải chạy: **nhịp gõ định kỳ → máy viết bài → đẩy sang website →
khách duyệt → lên trang.** Nó nghẽn ngay mắt xích đầu: nhịp gõ phải đến từ một
dòng lệnh dán trên VPS, và dòng đó chưa được dán. Bốn ngày không có gì chạy.

### Cách gỡ

Antigravity chạy trên Vercel, mà Vercel có sẵn cơ chế hẹn giờ. Tôi kiểm mã và
thấy: **xong mỗi bước, máy chủ tự gọi bước kế** — nên **một nhịp mỗi ngày là đủ**
để đi hết 9 bước của một bài. Vậy là không cần VPS nữa.

Tôi đã đọc tài liệu Vercel thay vì đoán. Hai giới hạn thật:

- Gói **Hobby chỉ cho chạy 1 lần/ngày**, và có thể trễ tới 59 phút. Gói Pro thì
  mỗi phút. Hiện tôi đặt chạy **19:00 giờ Việt Nam**.
- ⚠️ **Giờ cron phải sau "giờ bắt đầu viết"** trong thẻ lịch của chị. Thẻ đang
  khuyên 6:00 nên ổn. Nếu chị đặt giờ viết là 20:00 thì cron 19:00 tới sớm hơn,
  hôm đó không có bài.

### Điều quan trọng về tiền

**Chưa đặt biến `CRON_SECRET` thì cron có gọi cũng bị từ chối.** Nghĩa là mã đã
lên Vercel rồi nhưng **chưa tiêu một đồng nào**, và việc bật hay không là quyết
định của chị. Tôi cũng làm để nhịp từ cron được tính là "máy chủ đã gõ" — nếu
không, trang Bắt đầu sẽ gõ chồng thêm một nhịp nữa và **tiêu tiền AI hai lần**.

### Đã kiểm tới đâu

Trên Vercel (bản đang chạy):

| Ca | Đo được |
|---|---|
| Gọi không kèm mã | **503** kèm đúng câu hướng dẫn phải làm gì |
| Gọi kèm mã bịa | **503** — chưa đặt biến thì không hé lộ gì |

Ở máy, dựng bản thật rồi đặt biến thử (cơ sở dữ liệu thử không có lịch nào nên
**không tốn lượt AI nào**):

| Ca | Kỳ vọng | Đo được |
|---|---|---|
| Thiếu mã | 401 | 401 |
| Sai mã | 401 | 401 |
| Đúng mã | 200, không gõ dự án nào | 200, `soDuAn: 0` |
| Gọi bằng phương thức khác | từ chối | 405 |

**Chưa kiểm được:** một lượt chạy thật với lịch thật — phải chờ chị bật. Sau khi
bật, chị không cần đợi tới hôm sau: Vercel → Settings → Cron Jobs → bấm **Run**,
rồi xem thẻ Lịch đăng có ghi "(cron Vercel)" không.

---

## 5. Website halongxanh360.vn (vòng 24)

### `/tin-tuc` không còn màn trắng khi bộ đệm lạnh

| Đo trên điện thoại 4G yếu | Trước | Sau |
|---|---|---|
| Bao lâu thì thấy chữ đầu tiên | **14,0 giây** | **1,6 giây** |
| Bố cục có bị xê dịch không | 0 | 0 |

Cách làm: tiêu đề và mô tả gửi đi ngay, danh sách bài chảy về sau.

**Nói cho đúng mức:** trên trang thật, kịch bản deploy đã tự mở `/tin-tuc` ngay
sau khi bật, nên khách đầu tiên **sau mỗi lần deploy** vốn không phải chờ. Chỗ
bản sửa này thực sự cứu là khi máy chủ tự khởi động lại mà không qua deploy.

Tôi **không** chuyển sang cách còn nhanh hơn (dựng sẵn trang), vì nó bắt bước
dựng phải gọi được cơ sở dữ liệu — mà bản dựng chạy trong Docker trên VPS thì
chưa chắc có, và hỏng bước dựng là hỏng cả lần deploy.

### Trang chủ bớt một ảnh tải thừa

Đo thấy **ba ảnh cỡ lớn cùng được tải trước** (~450 KB) trong khi màn hình điện
thoại chỉ dùng một. Nguyên nhân: màn mở đầu dựng một ảnh ở máy chủ rồi trình
duyệt bốc ngẫu nhiên lại một ảnh khác, cả hai đều được ưu tiên tải. Đã sửa: ảnh
do trang chọn sẵn lúc dựng, mỗi đợt deploy vẫn ra một cảnh khác.

**Tổng dung lượng trang chủ: 1.271 KB → 1.159 KB.**

### Màn mở đầu chạy bằng CSS

Hai chặng đầu (ảnh lùi, chữ trồi) không còn phải đợi JavaScript tải xong.
**Nói thẳng: việc này không làm trang chủ hiện nhanh hơn** (3.420 → 3.444 ms,
nằm trong sai số). Lý do đo được: trang chủ rất dài (216 KB HTML), điện thoại
mất gần 3 giây chỉ để dựng trang. Tôi vẫn giữ thay đổi vì trên máy nhanh hiệu
ứng không còn phải chờ, nhưng không tính nó là một cải thiện tốc độ.

Cách thông thường để trị trang dài (`content-visibility`) tôi **cố ý không
dùng**: trang dùng thư viện hiệu ứng cuộn khắp nơi, và cách đó làm lệch mốc kích
hoạt của chúng. Không kiểm được hết từng hiệu ứng thì không làm.

---

## 6. Ba hướng tăng tốc đã thử và **loại** (vòng 25)

Trang `/lien-he` — nơi khách để lại số điện thoại — luôn chậm bất thường trong
mọi lần đo. Tôi đào ba hướng:

| Hướng | Kết luận | Bằng chứng |
|---|---|---|
| Hiệu ứng "hiện dần" chặn trang | **Sai** | Tắt hẳn JavaScript, trang cũng không hiện nhanh hơn |
| Lighthouse báo 88–90 % thời gian là "chờ vẽ" | **Không đúng với người dùng thật** | Đo trên trình duyệt thật ở tốc độ điện thoại chậm: nội dung lớn nhất hiện **cùng lúc** với chữ đầu tiên |
| Đổi cách ưu tiên tải ảnh theo khuyến nghị mới của Next 16 | **Không có lợi** | 4 lượt đo mỗi bên: trung vị 79 điểm (cũ) so với 76,5 (mới) |

Cả ba đều được trả lại nguyên trạng. Điều đáng giá nhất rút ra:

> **Một lượt đo Lighthouse không kết luận được gì.** Cùng một bản dựng, lúc ra
> 82 điểm, lúc ra 78. Nếu tin lượt đầu, tôi đã giữ lại một thay đổi vô ích và
> báo với chị là "đã tối ưu".

Từ đó mọi so sánh phải ≥ 4 lượt mỗi bên, lấy trung vị, đo cùng điều kiện máy.

---

## 7. Antigravity nhẹ đi 65 KB mỗi lần mở (vòng 83)

Đo thấy trang **Bắt đầu** gửi xuống trình duyệt một gói 285 KB mà các trang khác
không có. Giả thuyết đầu của tôi **sai** (tôi tưởng là bộ lời nhắc của 24
module). Tìm trong gói thì ra: đó là **thư viện kiểm tra dữ liệu**, bị kéo theo
chỉ vì một client component cần đúng một bảng câu chữ nằm chung tệp với nó.

Đã tách phần dùng chung ra tệp riêng. Kết quả đo trên điện thoại, cache trống:

| Trang | JS tải trước | JS tải sau |
|---|---|---|
| Bắt đầu | 311 KB | **246 KB** |

Thời gian hiện trang giảm 100 ms nhưng **nằm trong sai số** — các trang tôi
không đụng vào cũng dao động cỡ đó. Cái chắc chắn là bớt byte phải tải và phân
tích, rõ nhất trên máy yếu và mạng tính tiền theo dung lượng.

Hai trang còn dùng thư viện đó thật (biểu mẫu tạo dự án, trang sitemap nâng cao)
thì giữ nguyên.

---

## 8. Trò chuyện nói ra lượng dùng của từng lượt (vòng 87)

### Vấn đề

Màn Trò chuyện chạy bằng khoá AI của chính chị, mỗi tin nhắn là một lượt gọi
tính tiền — **mà màn hình không nói dùng bao nhiêu.** Số liệu vốn đã được lưu từ
lúc dựng màn (token vào, token ra, thời gian, model), chỉ chưa bao giờ đưa ra.

### Đã làm

Dưới mỗi câu trả lời của trợ lý giờ có một dòng nhỏ, ví dụ:

> DeepSeek · deepseek-chat · 1,3k token (vào 900 · ra 350) · 4,3 giây

Và ở đầu khung trò chuyện có câu tổng:

> Cuộc này đã dùng 1,3k token (vào 900 · ra 350) qua 1 lượt hỏi.

Đây cũng chính là số chị cần để **định giá gói tháng** — câu hỏi đang treo. Muốn
biết một cuộc trò chuyện đáng bao nhiêu thì phải biết nó dùng bao nhiêu.

### Hai điều tôi cố ý KHÔNG làm

1. **Không quy ra tiền.** Mỗi nhà cung cấp một bảng giá, giá đổi theo thời gian,
   và token vào với token ra khác đơn giá. Một con số tiền đoán bừa còn tệ hơn
   không hiện gì, vì chị sẽ tin nó khi tính giá.
2. **Không hiện "0 token"** khi nhà cung cấp không trả về số. Thiếu thì để trống.

### Một lỗi tôi tự bắt được trước khi nó ra tới màn

Hàm kiểm "có số không" viết là *khác null*. Nhưng dữ liệu về từ máy chủ có thể
**thiếu hẳn trường** — và *thiếu hẳn* thì vẫn "khác null", nên màn sẽ hiện
"0 token (vào 0 · ra 0)": đúng cái lời nói dối tôi vừa tuyên bố sẽ tránh, ở đúng
chỗ chị dựa vào để quyết định giá. Đã sửa và thêm hai phép thử cho trường hợp đó.

Cũng trong vòng này, một phép thử của tôi đỏ — và **sai là ở kỳ vọng tôi viết,
không phải ở mã**: 900 + 350 = 1.250 token làm tròn ra **1,3k** chứ không phải
1,2k. Tôi sửa kỳ vọng, không sửa mã cho vừa kỳ vọng.

## 9. Rà chất lượng giao diện theo hai bộ luật ngoài (vòng 88 · vòng 26)

Chị bảo nghiên cứu hai kho kỹ năng rồi cải tiến. Tôi đọc **luật gốc** trong hai
kho đó, không đọc bản tóm tắt, rồi đối chiếu từng luật với mã của mình.

- **emilkowalski/skills** — của tác giả thư viện Sonner, từng làm ở Vercel và
  Linear. Nó mã hoá "gu" về chuyển động: đường cong nào cho việc gì, dài bao
  nhiêu, được phép chuyển động thuộc tính nào.
- **cathrynlavery/diagram-design** — luật vẽ sơ đồ: xoá bớt là nước đi tốt nhất,
  tối đa 9 khối, một màu nhấn, nét mảnh, không đổ bóng, và bắt buộc có mô tả cho
  người dùng trình đọc màn hình.

### Ba lỗi thật trong Antigravity, đã sửa

| Lỗi | Vì sao đáng sửa |
|---|---|
| Mọi **nút** trong app dùng `transition: all` | Trình duyệt phải theo dõi mọi thuộc tính, dễ sinh chuyển động không ai đặt. Giờ nêu đúng sáu thứ nút thật sự đổi |
| **Thanh tiến độ** chạy bằng cách đổi chiều rộng | Đổi chiều rộng bắt trình duyệt tính lại bố cục mỗi khung hình. Giờ chạy trên GPU; rút 500 → 250ms |
| Chế độ **giảm chuyển động** tắt luôn vòng xoay "đang tải" | Người bật chế độ đó nhìn vòng xoay **đứng im** thì không biết máy còn chạy hay đã treo. Giờ nó quay chậm lại thay vì tắt |

### Hai lỗi thật ở website, đã sửa

Màn mở đầu dùng đường cong `ease-in` — loại khởi đầu chậm, trì hoãn đúng lúc mắt
người xem đang chờ màn kéo lên. Đổi sang đường cong đúng chuẩn, **giữ nguyên
1,15 giây** vì thời lượng đó là chị chốt. Và một chỗ nữa dùng `transition: all`.

Tôi đã chụp lại dải ảnh màn mở đầu sau khi đổi: vẫn qua đủ các chặng, ảnh vẫn
lao xuyên và trang thật hiện dần phía sau — đúng ý đồ cũ.

### Hai thứ tôi nghi là lỗi nhưng KHÔNG phải

Đây là phần tôi muốn chị để ý, vì "sửa nhầm thứ vốn đã đúng" cũng là một kiểu hỏng:

1. Luật đòi mọi hiệu ứng `hover` phải chặn trên màn cảm ứng. Kiểm ra: **Tailwind
   bản 4 đã tự làm việc đó**, cả hai dự án đều dùng bản 4. Không sửa.
2. Luật đòi sơ đồ phải có mô tả cho trình đọc màn hình. Sơ đồ kết nối trên
   website đang bị ẩn khỏi trình đọc — nhưng **đúng**, vì ngay dưới nó đã có một
   danh sách chữ mang đúng những con số ấy, hiện ở mọi khổ màn hình. Sửa vào là
   bắt người khiếm thị nghe hai lần. Không sửa.

### Sơ đồ đường ống đăng bài

Dựng theo đúng luật của kho diagram-design, để chị nhìn một cái là thấy đang tắc
ở đâu — mở bằng trình duyệt: `docs/so-do-duong-ong.html`, kèm ảnh
`docs/so-do-duong-ong.png` (dán được vào Zalo).

Kịch bản kết xuất ảnh **tự chặn**: thiếu mô tả cho trình đọc màn hình, hoặc quá
9 khối, là nó báo lỗi và không xuất ảnh.

## 10. Những chỗ tôi làm sai trong phiên này

Ghi lại đủ, vì chị cần biết tôi sai ở đâu để biết tin tôi tới đâu.

| Sai gì | Hậu quả | Đã xử |
|---|---|---|
| Chạy cổng kiểm qua ống dẫn (`\| tail`) | Vỏ báo "thành công" trong khi 2 phép thử đang đỏ | Từ giờ ghi log ra tệp rồi mới xét mã thoát |
| Truyền nhầm tham số cho công cụ in PDF | **Ghi đè PDF lên tệp bàn giao** | Khôi phục từ git, gõ lại bốn sửa đổi |
| Phép thử tự dối mình (mục 3) | Suýt tin một phép thử vô dụng | Đặt luật "gỡ bản sửa ra, phải thấy đỏ" |
| Tin một lượt đo Lighthouse (mục 6) | Suýt giữ một thay đổi vô ích | Đo ≥ 4 lượt, lấy trung vị |
| Chờ máy chủ bằng cách hỏi "cổng có trả lời không" | **Đo nhầm sang trang của một dự án khác** đang chiếm cổng 3100 | Giờ kiểm đúng chữ của đúng ứng dụng |
| Lẫn giữa hai chỉ số FCP và LCP | Suýt kết luận sai về hiệu ứng | Đo lại tách bạch |
| Tìm `250ms` trong CSS đã dựng để kiểm một lớp CSS | Ra 0 kết quả, suýt kết luận lớp đó hỏng | Kiểm chính phép đo bằng một lớp chắc chắn đúng → cũng 0. Hoá ra công cụ ghi `.25s`, không phải `250ms`. Lớp vẫn chạy tốt |

---

## 11. Trạng thái kiểm tra

**Antigravity** — kiểm kiểu 0 lỗi · lint 0 · **532 phép thử đạt / 532** (71 tệp)
· dựng bản thật 0 lỗi. Ở vòng cuối, **e2e 15/15 chạy trọn một lượt, không phải
chắp hai lượt** — lần đầu trong phiên.

Phép thử giao diện (e2e): **15/15 đạt, nhưng qua hai lượt chứ không phải một
lượt trọn**. Máy chủ thử nghiệm chết giữa chừng (một lần log ghi rõ là máy hết bộ
nhớ); chạy lại phần còn lại thì xanh. Không phải lỗi mã — nhưng tôi ghi đúng như
vậy chứ không ghi "15/15" trơn.

Một chi tiết đáng nói về thói quen đọc kết quả: ở lượt chạy đủ của vòng 87, phép
thử màn Trò chuyện **chưa hề chạy** (máy chủ đã chết trước khi tới nó). Nếu tôi
chỉ nhìn "7 phép đạt" rồi kết luận, thì phần mới thêm coi như chưa được kiểm mà
vẫn được báo là xong.

**halongxanh360.vn** — kiểm kiểu 0 · lint 0 · dựng 0 · **20/20 phép kiểm nội bộ
đạt**.

**Đã đẩy lên GitHub:** Antigravity `c1ec6c9`, `0e21b67`, `d99c763`, `c7c430f`,
`8939336`, `2ba6fd9` và vòng 87; halongxanh `de7d124`, `5877b94`.

---

## 12. Chưa làm, và vì sao

| Việc | Vì sao chưa |
|---|---|
| Trợ lý tự chạy việc từ khung chat (dựng web, đăng bài) | Cần màn xác nhận trước khi nó tiêu tiền; làm sau khi khung chat chạy ổn |
| Trả lời nhỏ giọt từng chữ trong chat | Chưa làm; hiện đợi cả câu rồi mới hiện |
| Giá gói tháng và hạn mức | Chờ chị quyết giá. Từ vòng 87 đã có số token thật của từng lượt để làm căn cứ |
| Hiện chi phí bằng TIỀN trong màn Trò chuyện | Cố ý chưa làm: phải có bảng giá thật của từng nhà cung cấp, không đoán |
| Chạy thử cron với lịch thật | Chờ chị đặt biến (A2) |
| Trang sitemap nâng cao còn mang thư viện nặng | Trang ít dùng; phải chuyển bước kiểm dữ liệu sang máy chủ mới bỏ được |
| Trang chủ halongxanh hiện chậm trên điện thoại | Chỉ nhanh lên được nếu rút ngắn trang — đó là quyết định thiết kế, cần chị chọn |
