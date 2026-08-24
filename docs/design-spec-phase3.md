# Design Spec — Giai đoạn 3 (Frontend / UI-UX)

> Trạng thái: **BẢN DUYỆT** — chờ owner gật đầu hướng thẩm mỹ qua mockup HTML
> trước khi code. Mockup: xem Artifact "Antigravity OS — Hướng thiết kế Giai
> đoạn 3" (link gửi trong chat). Quy trình do owner chốt: nghiên cứu nguồn →
> tham khảo component (uiverse.io, shadcn/ui) → **spec + mockup** → duyệt → code.

## 0. Nghiên cứu tham khảo (nguồn 2026)

- **Dark glassmorphism trên nền gradient** là chuẩn SaaS/analytics 2026, hợp
  fintech/dashboard vì hiển thị lớp nổi mà không mất ngữ cảnh nền —
  [Medium: Dark Glassmorphism 2026](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f),
  [Tenet UI/UX trends](https://www.wearetenet.com/blog/ui-ux-design-trends),
  [Muzli dashboards 2026](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/).
- Cảnh báo cần tránh: "mọi SaaS dashboard giống nhau — pastel gradient, Inter,
  pill toggle, illustration vô nghĩa"; xu hướng thắng là **AI-native dashboard
  tóm tắt & ưu tiên** thay vì bắt user tự dựng chart —
  [925studios](https://www.925studios.co/blog/saas-dashboard-design-examples-2026).
- Glass cần **scrim layer** (lớp gradient mờ bên trong panel) để chữ đọc rõ;
  `backdrop-filter` nặng trên máy yếu → có fallback nền đặc.
- SEO dashboard trực quan hóa: organic traffic, thứ hạng từ khóa, sức khỏe site
  — [Whatagraph SEO dashboards](https://whatagraph.com/blog/articles/seo-dashboard-examples).
- Component nguồn để tái sử dụng: **shadcn/ui** (ui.shadcn.com — Radix +
  Tailwind, hợp Next của dự án), hiệu ứng kính/nút đẹp từ **uiverse.io**.

## 1. Bản sắc thị giác

**Concept: "Mission control cho nội dung bay lên top".** Neo vào chính cái tên
*Antigravity* — nội dung của khách "bay lên" đầu Google và câu trả lời AI. Nền
deep-space, aurora gradient trôi nhẹ phía sau các panel kính lơ lửng; dữ liệu
đọc như bảng điều khiển (instrument readout).

### Màu (token)
| Vai trò | Tối (mặc định) | Sáng |
|---|---|---|
| Ground | `#08080f` → `#0c0d17` | `#eef0fb` → `#e4e7f7` |
| Kính (glass) | `rgba(22,24,42,.55)` + blur | `rgba(255,255,255,.62)` + blur |
| Chữ | `#ecedf7` / phụ `#b6b8d6` / mờ `#7e809e` | `#191a2c` / `#43465f` / `#6f7290` |
| Viền | `rgba(150,156,210,.16)` | `rgba(60,66,130,.14)` |

**Quang phổ SEO↔GEO (bản sắc chính, dùng làm gradient chủ đạo):**
`#4fe3c1` (aqua-mint = SEO "lift") → `#35c4f0` (cyan) → `#9b8cff` (violet =
GEO) → `#e07ad6` (magenta). Aurora nền dùng đúng 4 màu này. **Boldness dồn vào
1 chỗ** (aurora + 1 số liệu hero); mọi thứ khác giữ yên tĩnh.

**Semantic (tách khỏi accent):** ok `#48d69a`, warn `#f6b64a`, bad `#fa6b7f`.

Neutral lệch nhẹ về violet (không xám thuần) để "được chọn, không mặc định".

### Typography
- **UI + display:** system humanist sans (`-apple-system, "Segoe UI",
  system-ui`) — phủ tiếng Việt hoàn hảo (đủ dấu). Display: weight 700, tracking
  âm `-0.03em`, `text-wrap: balance`; từ khóa nhấn dùng gradient-clip.
- **Dữ liệu / nhãn / metric:** **monospace** (`ui-monospace, "Cascadia Code",
  "SF Mono"`) + `tabular-nums` — cảm giác "instrument/OS", đây là điểm khác
  biệt so với SaaS Inter đại trà.
- Eyebrow: monospace uppercase, letter-spacing `0.16em`.
- (Tùy chọn khi code thật: nhúng 1 display face có hỗ trợ tiếng Việt dạng
  @font-face data-URI nếu muốn cá tính hơn — cân nhắc dung lượng.)

### Chất liệu
Panel kính bo `18px`, viền sáng mảnh + scrim gradient trên đỉnh; đổ bóng sâu +
highlight inset. Aurora vẽ bằng canvas (blob radial trôi, `lighter` blend), tôn
trọng `prefers-reduced-motion`. Vi tương tác: node/panel "levitate" nhẹ khi
hover, số đếm count-up, dot chạy dọc đường nối pipeline.

## 2. Kiến trúc thông tin — Sidebar hành trình 4 bước

Sắp theo LUỒNG LÀM VIỆC THẬT (fix "người mới không biết bắt đầu từ đâu"):

1. **Thiết lập** — Tổng quan · Dự án · API Keys · Kết nối nền tảng
2. **Tạo nội dung** — Quy trình (chạy cả luồng) · Tự động hóa (16 module)
3. **Xuất bản** — WordPress · Mạng xã hội (FB/Zalo/GBP)
4. **Theo dõi** — Nội dung đầu ra · **Phân tích (GSC)** · Kho tri thức

+ Thẻ **"Bắt đầu từ đâu?"** cố định cuối sidebar → onboarding 4 bước cho người
mới. Mỗi nhóm có số thứ tự (chỉ dùng vì ĐÂY THỰC SỰ là chuỗi tuần tự).

**Gỡ bỏ** (owner xác nhận thừa): **Đối chiếu Blueprint**, **Không gian AI**.
**Giữ + nâng cấp:** Nội dung đầu ra, Kho tri thức, và **Phân tích → analytics
tích hợp kiểu Google Analytics** (xem §4).

## 3. Trực quan hóa (thay text bằng đồ thị — yêu cầu owner)

- **Sitemap (#1):** sơ đồ **radial/cây constellation** — node "HOME" lõi
  gradient, các nhánh nhãn tỏa ra, node con cấp 2. Thay khối text thuần.
- **Quy trình:** **flow graph ngang** — node kính đổi màu theo trạng thái live
  (chờ/đang chạy/xong/lỗi), đường nối gradient có dot chạy khi dữ liệu truyền.
- **Kết quả module:** ngoài text, thêm mini-viz phù hợp (ví dụ keyword theo
  nhóm dạng bảng/treemap; on-page dạng checklist trực quan).
- **KPI:** thẻ instrument có sparkline + delta màu semantic.

## 4. Phân tích tích hợp — Google Search Console (owner chọn)

Đúng nghề SEO/GEO: đo hiệu quả THỰC của chính nội dung app tạo ra.

- **Kết nối:** OAuth Google 1 lần (scope `webmasters.readonly`), token mã hoá
  vault theo dự án (như FB/Zalo). Chọn property khớp website dự án.
- **Hiển thị:** clicks / impressions / CTR / vị trí TB (30 ngày, area chart 2
  series), **top pages theo TỪNG BÀI đã đăng** kèm delta vị trí, top queries.
- **Nối GEO:** cạnh GSC là bảng "Được AI trích dẫn" (ChatGPT/Perplexity/AI
  Overviews) — KPI riêng của GEO.
- GA4 (traffic tổng thể) ghi roadmap làm sau nếu cần bức tranh đầy đủ.

## 5. Component map (khi code)

Dựa trên shadcn/ui đã hợp Next 16 của dự án + primitive hiện có
(`Card`, `Badge`, `Button`, `Input`, `RunPicker`): thêm token màu/kính mới vào
`globals.css`; wrapper `GlassCard`, `KpiStat`, `FlowGraph`, `RadialSitemap`,
`AreaChart`, `AuroraBackground`. Chart nhẹ tự vẽ (SVG/canvas) — không thêm thư
viện nặng, giữ CSP/self-contained.

## 6. Thứ tự thi công Giai đoạn 3 (sau khi duyệt mockup)

1. Token màu/kính + aurora + theme sáng/tối vào design system (`globals.css`).
2. App shell mới: sidebar 4 bước + topbar + onboarding.
3. Trang Tổng quan "mission control" (KPI + pipeline mini + sitemap viz + GSC).
4. Nâng từng trang: Quy trình (graph), runner (mini-viz), Sitemap (#1 radial).
5. Tích hợp GSC (OAuth + đồng bộ + trang Phân tích).
6. Gỡ trang thừa, dọn seed/demo, hợp nhất Module 1 vào engine chung, rate limit.

Mọi bước vẫn giữ kỷ luật gates (lint/typecheck/test/build xanh) như các đợt
trước; không phá chức năng backend đã chạy.
