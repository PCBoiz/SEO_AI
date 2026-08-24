# Thử nghiệm đăng bài tự động sang Vinhomes Hạ Long Xanh

Đường đi đầy đủ: **bạn gõ chủ đề → AI viết bài → tự đăng lên website**.

Ba việc dưới đây **bạn phải tự làm** — môi trường của tôi bị chặn không chạy
được lệnh migration và không đặt được biến môi trường trên Vercel.

Tổng thời gian: khoảng **25 phút**.

---

## Sơ đồ những gì sắp nối

```
   Antigravity (máy bạn)                 Vercel                Neon
  ┌──────────────────────┐        ┌──────────────────┐   ┌─────────────┐
  │ Bắt đầu → gõ chủ đề  │        │                  │   │             │
  │        ↓             │        │  trang           │   │  bảng       │
  │ AI viết 4 bước       │        │  ha_long_xanh    │──▶│  bai_viet   │
  │        ↓             │ HTTPS  │                  │   │             │
  │ Module đăng bài      │───────▶│  /api/ingest     │   │  trạng thái │
  └──────────────────────┘        └────────┬─────────┘   │  = "chờ"    │
         cần khoá AI                       │             └─────────────┘
           (việc 3)                        ▼
                                  ┌──────────────────┐
                                  │  /duyet-bai      │  ← BẠN đọc và bấm duyệt
                                  └────────┬─────────┘
                                           ▼
                                  ┌──────────────────┐
                                  │  /tin-tuc        │  ← lúc này khách mới thấy
                                  └──────────────────┘
```

> ## ⚠️ BÀI KHÔNG TỰ LÊN TRANG
>
> Đây là điều quan trọng nhất trong cả tài liệu, và nó mới được thêm vào.
>
> AI viết xong, module đẩy sang site, site nhận và báo thành công — nhưng bài
> **nằm trong hàng chờ**, chưa ai thấy. Bạn phải mở `/duyet-bai`, đọc lại, rồi
> bấm **Duyệt và đăng**.
>
> **Vì sao bắt thêm một bước thủ công.** Cả website này dựng trên đúng một lời
> hứa: không đăng con số chưa kiểm. Bảng giá ghi rõ nguồn, khoảng cách ghi rõ
> là đường chim bay, chính sách chỉ nói cấu trúc chứ không nói phần trăm.
>
> Một mô hình ngôn ngữ viết rất trôi chảy về "giá từ 5 tỷ" hay "chiết khấu 9%"
> mà không hề biết mình đang đoán. Bài đó sẽ nằm cạnh những bảng số có nguồn và
> mượn đúng cái uy tín mà chúng phải rất khó mới có được. Nếu một khách mua nhà
> tin vào một con số bịa, thì thứ mất đi không phải một bài viết — mà là lý do
> cả trang này tồn tại.
>
> Duyệt một bài mất vài phút. Gỡ hậu quả của một bài bịa giá thì không có giá.
>
> **Khi duyệt, đọc kỹ đúng bốn thứ:** con số tiền · phần trăm · mốc thời gian ·
> khoảng cách. Đó là bốn chỗ mô hình bịa tự tin nhất.

---

# Việc 1 — Dựng Neon Postgres

Không có bước này thì bài đăng xong sẽ **biến mất ở lần deploy kế tiếp**, vì
Vercel không cho ghi file.

### 1.1 Tạo database

1. Vào <https://neon.tech> → đăng nhập
2. **New Project**
3. Tên: `halongxanh`
4. Khu vực: **AWS ap-southeast-1 (Singapore)** — gần Việt Nam nhất
5. **Create**

### 1.2 Lấy chuỗi kết nối

Bấm **Connection string** → chọn dạng có chữ **Pooled connection** → sao chép.

Trông như thế này (của bạn sẽ khác):

```
postgresql://ten:matkhau@ep-abc-123-pooler.ap-southeast-1.aws.neon.tech/halongxanh?sslmode=require
```

> 🔒 **Giữ kỹ chuỗi này.** Ai có nó là đọc và sửa được toàn bộ bài viết. Đừng
> dán vào chat, tin nhắn hay ảnh chụp màn hình.

### 1.3 Tạo bảng — chạy một lần duy nhất

Mở **Terminal** trong VS Code, gõ từng dòng:

```
cd D:\vinhomes_ha_long_xanh
```
```
$env:DATABASE_URL="dán-chuỗi-vừa-copy-vào-đây"
```
```
npm run db:migrate
```

Thấy `migrations applied successfully` là xong.

> ⚠️ **Chạy lại bước này sau đợt cập nhật mới nhất.** Bảng `bai_viet` vừa có
> thêm hai cột `trang_thai` và `duyet_luc` cho hàng rào duyệt bài (migration
> `0003`). Không chạy lại thì cổng nhận bài sẽ lỗi khi ghi.

> ⚠️ Dòng thứ hai dùng cú pháp PowerShell (`$env:`). Đừng dùng `export` —
> đó là cú pháp Linux, Windows không hiểu.

---

# Việc 2 — Đặt 2 biến trên Vercel

### 2.1 Sinh token

Token là mật khẩu để Antigravity được phép đăng bài. Trong Terminal:

```
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"
```

Chép chuỗi hiện ra. **Giữ lại** — việc 2.3 cần dán nó lần nữa.

### 2.2 Thêm vào Vercel

<https://vercel.com/dashboard> → dự án `vinhomes-ha-long-xanh` →
**Settings** → **Environment Variables** → **Add**.

Thêm **hai** biến, cả hai đều chọn môi trường **Production**:

| Name | Value |
|---|---|
| `DATABASE_URL` | chuỗi Neon ở việc 1.2 |
| `INGEST_TOKEN` | token vừa sinh ở 2.1 |

Xong bấm **Redeploy** ở tab **Deployments** — biến mới chỉ có hiệu lực sau khi
triển khai lại.

### 2.3 Cho Antigravity biết đích đến

Mở file `D:\Dự án cô Giang\.env.local`, thêm hai dòng vào cuối:

```
# Đặt đúng địa chỉ site đang chạy. Khi đã gắn tên miền thật thì đổi thành
# https://halongxanh360.vn
VINHOMES_SITE_URL=https://vinhomeshalongxanh-five.vercel.app
VINHOMES_INGEST_TOKEN=dán-đúng-token-ở-bước-2.1
```

> ❗ **Token hai bên phải TRÙNG KHỚP TỪNG KÝ TỰ.** Lệch một ký tự là lỗi 401.
> Đây là lỗi hay gặp nhất — chép dán, đừng gõ tay.

Rồi khởi động lại Antigravity (Ctrl+C rồi `npm run dev`).

---

# Việc 3 — Thêm khoá AI

Không có khoá thì module viết bài dừng ngay với thông báo
`Chưa có API key deepseek`.

1. Vào <https://platform.deepseek.com> → **API keys** → **Create new API key**
2. Chép khoá (dạng `sk-…`) — **chỉ hiện đúng một lần**
3. Mở Antigravity → **Cài đặt** → **API Keys** (hoặc `/ai-keys`)
4. Chọn **DeepSeek**, dán khoá, bấm **Verify**
5. Phải thấy trạng thái chuyển sang **active**

> 🔒 Khoá được mã hoá AES-256-GCM trước khi lưu. Nhưng vẫn đừng dán nó vào chat
> hay ảnh chụp màn hình — mã hoá chỉ bảo vệ được khi khoá còn nằm trong hệ thống.

---

# Chạy thử

## Cách 1 — Thử nhanh chỉ khâu đăng bài (không tốn tiền AI)

Kiểm chặng Antigravity → website mà không gọi model. Chạy trước để chắc chắn
việc 1 và 2 đã đúng:

```
cd D:\Dự án cô Giang
```
```
npm run kiem:dang-bai
```

Phải thấy **13/13 mục đạt**. Nếu trượt, xem bảng sự cố cuối trang.

## Cách 2 — Thử toàn tuyến qua giao diện

1. Mở <http://localhost:3005/bat-dau>
2. Ô **"Bài này viết về gì?"** — gõ ví dụ:
   `tiến độ thi công phân khu Vịnh Thiên Đường tháng 8`
3. Bấm **Bắt đầu viết**
4. Xem 4 bước lần lượt chuyển sang dấu tích — mất **2–4 phút**
5. Xong bấm **Đăng lên website**
6. Mở `<địa-chỉ-site>/duyet-bai` — **dán `INGEST_TOKEN`** vào ô khoá ở đầu trang
7. Đọc lại bài, rồi bấm **Duyệt và đăng**
8. Lúc này mở `<địa-chỉ-site>/tin-tuc` — bài mới có ở đó

> Chưa duyệt mà mở `/tin-tuc` thì **không thấy gì cả**. Đó là đúng, không phải
> hỏng.

---

# Kiểm lại sau khi chạy

- [ ] Bài **chưa** hiện ở `/tin-tuc` khi chưa duyệt
- [ ] Bài có trong hàng chờ ở `/duyet-bai`
- [ ] Duyệt xong thì bài hiện ở `/tin-tuc`
- [ ] Bấm vào bài, mở được trang chi tiết
- [ ] Nội dung có đủ: mở đầu, thân bài, mục **Câu hỏi thường gặp**
- [ ] Chạy lại cùng chủ đề → **sửa bài cũ**, không tạo bài trùng
- [ ] Dán link bài lên Zalo → hiện ảnh và tiêu đề, không phải ô trắng

---

# Khi có sự cố

| Thông báo | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Chưa có API key deepseek` | Chưa làm việc 3 | Thêm khoá và bấm Verify |
| `Site từ chối (HTTP 401)` | Token hai bên lệch nhau | So lại `INGEST_TOKEN` (Vercel) và `VINHOMES_INGEST_TOKEN` (`.env.local`) |
| `Site chưa cấu hình INGEST_TOKEN` (503) | Chưa đặt biến trên Vercel, hoặc đặt rồi mà chưa Redeploy | Làm lại việc 2.2, nhớ bấm Redeploy |
| `VINHOMES_SITE_URL chưa được cấu hình` | Chưa làm việc 2.3 | Thêm vào `.env.local` rồi khởi động lại Antigravity |
| `Site chuyển hướng sang địa chỉ khác` | Địa chỉ sai, thường do thiếu `https://` hoặc thừa dấu `/` cuối | Sửa `VINHOMES_SITE_URL` |
| `slug phải là chữ thường…` (422) | Chủ đề không có chữ latin nào | Đặt chủ đề có chữ thường |
| Bài đăng xong nhưng `/tin-tuc` trống | Thiếu `DATABASE_URL` trên Vercel | Xem nhật ký Vercel, tìm dòng `CẢNH BÁO: thiếu DATABASE_URL` |
| Bài đăng xong rồi biến mất | Chưa làm việc 1 | Dựng Neon rồi đăng lại |
| Báo "ĐANG CHỜ DUYỆT" mà `/tin-tuc` trống | **Đúng như thiết kế** | Vào `/duyet-bai`, dán khoá, bấm Duyệt |
| `/duyet-bai` báo "Khoá không đúng" | Dán nhầm hoặc thừa dấu cách | Chép lại đúng `INGEST_TOKEN` trên Vercel |
| `/duyet-bai` trống trong khi vừa đẩy bài | Site chạy bản cũ chưa có hàng rào | Triển khai lại site |
| Sửa bài đã đăng rồi nó biến mất khỏi trang | **Đúng như thiết kế** — sửa là phải duyệt lại | Vào `/duyet-bai` duyệt lại |

---

# Những gì tôi đã kiểm sẵn

Chạy trước khi bàn giao, để bạn không phải dò lại từ đầu:

| Mặt kiểm | Kết quả |
|---|---|
| Hợp đồng dữ liệu hai đầu (14 tình huống, đường thật) | **14/14 đạt** |
| Hàng rào duyệt bài: chưa duyệt thì `/tin-tuc` không thấy, mở thẳng bài ra 404 | chặn đúng |
| Đường ghi file khi chưa có DATABASE_URL cũng bị hàng rào chặn | đã vá — xem dưới |
| Bộ kiểm thử tự động | **173/173 đạt**, 31 file |
| lint · typecheck · build | xanh |
| Tình huống hỏng: sai token, trang tắt, trùng bài, ngày sai, chưa cấu hình | chặn đúng, báo lỗi nói được phải sửa ở đâu |
| Bí mật rò ra nhật ký hoặc phản hồi | **tìm ra 1 lỗ hổng — đã vá** |

**Lỗ hổng thứ hai đã vá (đợt này):** hàng rào duyệt bài ban đầu chỉ chặn ở
đường cơ sở dữ liệu. Khi chưa cấu hình `DATABASE_URL`, site ghi bài xuống file
tạm — và đường đó **không có hàng rào**, nên bài lên thẳng trang. Nghĩa là hàng
rào chỉ hoạt động khi cấu hình đã đúng, tức là đúng lúc ít cần nhất. Đã vá:
bản ghi file cũng mang trạng thái chờ, và hàm đọc lọc theo trạng thái đó.

**Lỗ hổng đã vá (đợt trước):** bộ che bí mật chỉ che khoá AI (`sk-…`, `AIza…`), không che
chuỗi kết nối cơ sở dữ liệu. Mà chính bộ che này dựng thông báo lỗi hiển thị
trên giao diện — nghĩa là một lỗi kết nối Postgres sẽ in **nguyên mật khẩu
database** lên màn hình. Đã thêm mẫu che cho chuỗi kết nối và token `Bearer`,
vẫn giữ lại tên máy chủ để còn gỡ lỗi được.
