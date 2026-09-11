# Tự động đăng bài theo hẹn giờ — và tạo website: đang ở đâu, làm gì trước

*Nghiên cứu 12/09/2026. Mọi con số đo trên mã nguồn hai kho, hoặc trích tài liệu
gốc (Vercel, Google) — nguồn ở cuối. Hạn chủ dự án đặt: Chủ nhật 13/09.*

---

## Kết luận đặt trước

1. **Hẹn giờ đã có một nửa, và nửa đó đang chạy.** Module đăng lên halongxanh360
   có ô **"Ngày đăng"**; website chỉ hiện bài khi tới ngày. Đẩy sẵn một loạt bài
   ngày mai, ngày kia là được ngay hôm nay.
2. **Nửa còn thiếu là "tự chạy".** Luồng viết bài hiện chạy **trong tab trình
   duyệt** — đóng tab là dừng. Muốn bài tự ra theo lịch thì máy chủ phải tự chạy
   luồng, và phải có thứ gì đó **gõ nhịp** cho nó.
3. **Thứ gõ nhịp nên là VPS chị đang có.** Vercel gói miễn phí chỉ cho hẹn
   **mỗi ngày một lần, lệch tới 59 phút**, và mỗi lượt chạy tối đa **300 giây** —
   không đủ cho một luồng viết bài chạy liền. VPS chạy 24/7, gõ mỗi 10 phút,
   không tốn thêm đồng nào.
4. **Giữ bước duyệt tay.** Bài tự sinh tự vào **hàng chờ duyệt** của website; chị
   duyệt trên điện thoại một phút. Tự đăng thẳng không qua ai là đúng thứ Google
   gọi là *scaled content abuse* nếu làm nhiều — và với bất động sản, một câu
   sai về giá hay pháp lý là rủi ro thật.
5. **Trình dựng website không kịp Chủ nhật, và không nên cố.** Nghiên cứu xong
   từ 09/09, phần rủi ro nhất đã chạy thật trên máy, nhưng luồng sáu bước sinh
   website chưa dựng. Đề xuất làm sau khi hẹn giờ chạy ổn.

---

## 1 · Đã có gì — đo trên mã, không đoán

| Mảnh | Tình trạng | Ở đâu |
|---|---|---|
| Hẹn **ngày** đăng | ✅ Có. Ô "Ngày đăng" trong module đăng halongxanh360; website lọc `ngayDang ≤ hôm nay` cả ở danh sách lẫn trang bài | `vinhomes-publish.ts:78`, `tin-tuc.ts` |
| Chạy **từng module** phía máy chủ | ✅ Có. Mỗi job chạy trong một lượt 300 giây riêng (`after()` trong route tạo job) | `api/v1/modules/[moduleKey]/jobs/route.ts` |
| Nối đầu ra giữa các bước | ✅ Có. Engine **tự nạp** đầu ra thành công mới nhất của các module khác cùng dự án | `module-engine.server.ts` |
| Luồng dựng sẵn | ✅ Năm luồng. Luồng **"Chuỗi bài viết → đẩy thẳng sang site"** đã nối sẵn bước đăng: 8 bước viết + 1 bước đăng, bài vào hàng chờ duyệt | `registry.ts:108` |
| Cổng duyệt bài trên website | ✅ Có, kèm bộ quét câu rủi ro (`quetBai`) | `/duyet-bai` |
| Báo Bing khi bài lên | ✅ Có (IndexNow) — **đã sửa 12/09** chỗ báo sớm bài hẹn ngày | `duyet-bai.ts` |
| Chạy **cả luồng** không cần trình duyệt | ❌ Chưa. Người sắp thứ tự các bước là `pipeline-runner.tsx` — một component chạy trong tab | `pipeline-runner.tsx:419` |
| Lịch (ngày nào, giờ nào, chủ đề gì) | ❌ Chưa có chỗ lưu | — |
| Hẹn theo **giờ** | ❌ Chỉ theo ngày (`YYYY-MM-DD`) | ingest website |
| Ảnh đi kèm bài | ❌ Cổng nhận bài chưa nhận ảnh | `api/ingest` |

**Tức là luồng đã đi trọn từ từ khóa tới hàng chờ duyệt — chỉ thiếu việc nó
chạy trong tab.** Phần phải chuyển từ trình duyệt lên máy chủ nhỏ hơn tưởng: hàm dựng đầu vào
cho mỗi bước chỉ ~15 dòng (`buildInput`, `pipeline-runner.tsx:333`) — gom giá trị
form + dự án + nhà cung cấp AI. Mọi thứ nặng (gọi AI, nối đầu ra, ghi job) đã ở
máy chủ.

### Một lỗi thật tìm ra trong lúc đo — đã sửa

Duyệt một bài hẹn ngày mai → trang bài trả **404** cho tới đúng ngày (cố ý). Nhưng
website **báo IndexNow ngay lúc duyệt**: Bing ghé, gặp 404, rồi tới ngày bài hiện
ra thì không ai báo lại. Với hẹn giờ, chuyện này thành hằng ngày. Đã sửa nửa đầu
(duyệt bài tương lai thì chưa báo); nửa sau — báo khi tới ngày — cần đúng nhịp gõ
hằng ngày mà kế hoạch dưới đây dựng.

---

## 2 · Ràng buộc đo được

| | Gói miễn phí (Hobby) | Gói Pro ($20/tháng) | Nguồn |
|---|---|---|---|
| Hẹn giờ (cron) | **Mỗi ngày một lần**, lệch **±59 phút** | Mỗi phút, đúng phút | Vercel — Cron usage & pricing |
| Một lượt chạy tối đa | **300 giây** | 800 giây | Vercel — Function duration |
| Một bước module | tới 120 giây mỗi lượt gọi AI, có thể gọi lại một lần | | `module-engine.server.ts` |

**Hệ quả:** luồng bài viết 8–9 bước **không chạy liền trong một lượt** ở gói miễn
phí. Phải chạy **từng bước một**, mỗi bước một lượt, và có thứ gõ nhịp để đi tiếp.

---

## 3 · Thiết kế đề xuất — "máy chạy theo lịch" từng bước

```
VPS crontab (mỗi 10 phút)  ──►  POST /api/v1/lich/tick  (Antigravity, có khoá bí mật)
                                   │
                                   ├─ Có dự án tới giờ đăng mà chưa có lượt chạy?
                                   │     → rút một chủ đề khỏi hàng đợi, tạo job BƯỚC 1
                                   │
                                   ├─ Có lượt đang chạy mà bước hiện tại đã xong?
                                   │     → tạo job BƯỚC KẾ (đầu vào dựng phía máy chủ)
                                   │
                                   └─ Bước cuối = đăng lên website → bài vào HÀNG CHỜ DUYỆT
                                                                    với ngày đăng đã hẹn
```

- **Mỗi lần gõ chỉ đi một bước** → không bao giờ chạm trần 300 giây.
- Bước xong có thể tự gõ tiếp ngay (`after()` gọi lại chính nó) để một bài xong
  trong vài phút thay vì vài chục phút; nhịp 10 phút của VPS là **lưới an toàn**
  cho lượt bị đứt.
- **Lưu lịch không cần migration:** bảng `project_integrations` (loại mới
  `lich_dang`) — enum chỉ ở tầng TypeScript. Quan trọng vì migration Neon `0004`
  còn chưa xác nhận đã áp.
- Vercel cron hằng ngày giữ vai **dự phòng** nếu VPS tắt.

### Chủ đề lấy từ đâu — ba lựa chọn

| Nguồn | Được | Mất |
|---|---|---|
| **Danh sách chị nhập** | Kiểm soát hoàn toàn | Phải nghĩ sẵn chủ đề |
| **Truy vấn Search Console** vị trí 11–30 | Viết đúng thứ Google đã coi trang mình liên quan — dễ lên trang 1 nhất | Trang mới chưa có dữ liệu (số 0 tới ~13/09) |
| **Cả hai** (danh sách trước, hết thì lấy GSC) | Không bao giờ cạn | Phức tạp hơn một chút |

### Việc KHÔNG nên làm

- **Tự đăng thẳng không duyệt.** Google, chính sách spam: *"Using generative AI
  tools … to generate many pages without adding value for users"* là scaled
  content abuse. Và cổng `quetBai` của website sinh ra để chặn đúng loại câu
  "chiết khấu bí mật", "cam kết lợi nhuận".
- **Nhiều bài mỗi ngày.** Trang mới, 31 địa chỉ, 16 đã vào chỉ mục. Một bài tốt
  mỗi 2–3 ngày có giá trị hơn năm bài mỏng mỗi ngày.
- **Hẹn theo giờ chính xác** ở giai đoạn này. Website hiện chỉ hẹn theo ngày;
  thêm giờ cần sửa ingest + cách lọc. Lợi ích nhỏ so với rủi ro trước Chủ nhật.

### Chi phí

Mỗi bài = một luồng 8 lượt gọi AI (mỗi lượt có thể gọi lại một lần nếu sai định
dạng), bằng **API key của chị**. Bảng mô hình trong app xếp DeepSeek V4 Flash,
Gemini Flash, GPT-5 Nano, Claude Haiku cùng hạng giá thấp nhất. Tần suất do chị
đặt; tôi không bật lịch nào khi chưa có lệnh.

---

## 4 · Tạo website — trạng thái

| | |
|---|---|
| Nghiên cứu | ✅ Xong 09/09 — ba tài liệu `docs/nghien-cuu-dung-website.md`, `…-luu-tru-va-xem-truoc.md`, `…-xem-truoc-va-skills.md` |
| Quyết định đã chốt | Công cụ nội bộ 2 người · chạy được trên Vercel và trên máy · trang sinh ra dùng Next.js + Tailwind như halongxanh360 |
| Phần rủi ro nhất | ✅ Chạy thật trên máy (09/09): cài 8 phút lần đầu, build 7–11 giây, dev server 3 giây |
| Khuôn mẫu | ✅ 40 component đã chạy trên halongxanh360 (28 trang + 12 nền) |
| Luồng sáu bước (ý định → kiến trúc → thiết kế → sinh tệp → **kiểm chứng bằng build thật** → giao) | ❌ Chưa dựng |

**Vì sao không kịp Chủ nhật:** bước "kiểm chứng" là thứ phân biệt bản dùng được
với bản trình diễn, và nó cần một máy có ổ đĩa để chạy `next build` — Vercel không
dựng được một trang Next.js khác bên trong một lượt 300 giây. Nghĩa là phải có
một "máy dựng" (chính VPS, hoặc máy chị), và đó là việc nhiều ngày chứ không phải
nhiều giờ. Làm vội thì ra cỗ máy sinh mã hỏng nhanh hơn — đúng điều tài liệu 09/09
cảnh báo.

---

## 5 · Lịch đề xuất

| Khi | Việc | Ai |
|---|---|---|
| **Thứ Bảy 12/09** | Dựng "máy chạy theo lịch" (lưu lịch, tick, dựng đầu vào phía máy chủ, trang cài lịch trong dự án) + nửa sau của sửa IndexNow | Tôi |
| Thứ Bảy tối | Dán một dòng crontab vào VPS (tôi đưa sẵn) | Chị, 1 phút |
| **Chủ nhật 13/09** | Chạy thật một lượt theo lịch → bài vào hàng chờ → chị duyệt | Cả hai |
| Sau Chủ nhật | Ảnh Drive đi kèm bài · trình dựng website | Tôi |

---

## Nguồn

- Vercel — *Usage & Pricing for Cron Jobs* (vercel.com/docs/cron-jobs/usage-and-pricing): Hobby một lần/ngày, lệch ±59 phút; Pro mỗi phút.
- Vercel — *Configuring Maximum Duration* (vercel.com/docs/functions/configuring-functions/duration): Hobby tối đa 300s; Pro 800s.
- Google — *Spam policies for Google web search*, mục Scaled content abuse (developers.google.com/search/docs/essentials/spam-policies).
- Mã nguồn: `vinhomes-publish.ts`, `pipeline-runner.tsx`, `module-engine.server.ts`, `api/v1/modules/[moduleKey]/jobs/route.ts`, `registry.ts` (Antigravity); `tin-tuc.ts`, `duyet-bai.ts`, `api/ingest/route.ts` (halongxanh360).
