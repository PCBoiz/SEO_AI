# Kế hoạch Antigravity OS (cập nhật 2026-07-25)

> Quyết định của owner (2026-07-25): **hoàn thiện chức năng + tích hợp WordPress
> và các ứng dụng khác TRƯỚC, cải thiện Frontend/UI-UX SAU CÙNG.** Mọi đợt làm
> việc phải theo đúng thứ tự dưới đây.

## Giai đoạn 1 — Hoàn thiện không gian làm việc module (đang làm)

- [x] 9 module app-native (BYOK, 4 provider, SEO + GEO) chạy đơn lẻ.
- [x] Lưu toàn bộ lịch sử run vào Neon theo dự án (`module_jobs`).
- [x] Nối luồng tự động server-side (upstream context, không cần dán tay).
- [x] Preset khi reload + bối cảnh chung cấp dự án (điền 1 lần).
- [x] Pipeline chạy-chung trên trang **Quy trình** với sơ đồ trạng thái live;
      trang **Tự động hóa** giữ vai trò chạy từng bước.
- [x] Lịch sử & ghim: xem lại các lần chạy, "Nạp input" (preset) và "Dùng kết
      quả này" (ghim bản chính thức — nối luồng/preset dùng bản ghim thay vì bản
      mới nhất).
- [ ] Owner test toàn bộ (từng module + cả luồng) bằng DeepSeek.

## Giai đoạn 2 — Tích hợp xuất bản đa nền tảng (TRƯỚC khi làm UI/UX)

Owner đã chốt (2026-07-25): làm cả 4 nhóm; WordPress draft-first; credentials
theo dự án mã hoá vault.

- [x] **Module #12 · Đăng WordPress**: ghép bài từ đầu ra module 7/8/10/11
      (markdown → HTML, nhúng FAQ + JSON-LD), đăng qua REST API + Application
      Password của dự án (giải mã vault server-side). Mặc định BẢN NHÁP.
- [x] **Module #13 · GEO Files**: llms.txt (AI, chuẩn llmstxt.org) +
      sitemap.xml (dựng máy móc từ nhãn sitemap, slug không dấu).
- [x] Nối #12 vào cuối pipeline (checkbox "đăng WordPress bản nháp sau khi
      xong" ở trang Quy trình).
- [x] **#13 nâng cấp "GEO trọn gói"** (2026-07-25): thêm robots.txt cho phép
      AI crawler (GPTBot, PerplexityBot, ClaudeBot, Google-Extended…) + hướng
      dẫn triển khai từng bước cho người không rành kỹ thuật + checklist
      Google Search Console. Auto-deploy file lên WordPress: làm khi WP test
      được (mục dưới).
- [x] **Module #14 Facebook Page / #15 Zalo OA / #16 Google Business** —
      build sẵn (AI viết caption từ bài đã tạo, tự lấy link WP từ #12, token
      dán theo dự án qua card "Kết nối nền tảng", mã hoá vault). **Owner test
      khi có token**: FB cần Meta App + Page Access Token (quyền
      pages_manage_posts); Zalo cần OA Access Token; GBP cần Account/Location
      ID + OAuth token (hết hạn ~1h — dán lại khi đăng).
- [ ] Auto-deploy llms.txt/robots.txt/sitemap.xml lên WordPress (plugin cầu
      nối) — sau khi owner test được WordPress.
- [x] **Audit backend toàn diện** → `docs/audit-2026-07-25.md` (sweeper job
      kẹt, ZodError→400, route matrix, secret review). Gap còn lại ghi trong
      audit: rate limiting, dọn seed (Giai đoạn 3), Zalo/GBP cần chạy thật
      lần đầu.

## Giai đoạn 3 — Frontend / UI-UX (SAU CÙNG, theo chỉ đạo owner)

Ghi chú trực tiếp từ owner (2026-07-25): **nghiên cứu cực kỳ chuyên sâu giao
diện, bố cục, màu sắc, UI/UX, visualizations TRƯỚC khi bắt tay vào code** —
vừa chuyên nghiệp vừa sáng tạo, đẹp, dễ hiểu, dễ hình dung cho người mới.

> **Owner DUYỆT hướng thiết kế (2026-07-25)** qua mockup + `docs/design-spec-phase3.md`
> → chốt "code luôn". Đang thi công theo build order trong spec §6: token/aurora
> + theme → app shell 4 bước → mission-control → visualizations → GSC → dọn dẹp.

- [x] **Nghiên cứu design** (deliverable duyệt trước khi code). Xong + owner duyệt.
- [x] **Design system**: token quang phổ SEO↔GEO + aurora canvas + glass +
      theme sáng/tối (no-flash) — `globals.css`, `aurora-background`, `theme-toggle`.
- [x] **Sắp xếp lại sidebar/IA**: sidebar hành trình **4 bước** (Thiết lập →
      Tạo nội dung → Xuất bản → Theo dõi) + thẻ "Bắt đầu từ đâu?".
- [x] **Gỡ trang thừa**: Đối chiếu Blueprint + Không gian AI (route + nav +
      breadcrumb + 2 e2e test tương ứng đã gỡ).
- [x] **Tổng quan mission-control**: KPI kính + hoạt động gần đây + pipeline
      mini + GEO card — **dữ liệu THẬT** (primitive `listRecentByWorkspace`),
      bỏ toàn bộ seed giả.
- [x] **Visualizations**: Sitemap #1 = **sơ đồ radial** (Module 1 xuất JSON
      `structure`); Quy trình = **flow graph ngang** (glass/spectrum + shimmer
      truyền dữ liệu); kết quả module = **mini-viz** (chips/code/rich); AreaChart.
- [x] **Phân tích**: analytics nội bộ THẬT (hoạt động 14 ngày + AreaChart) +
      khung GSC (KPI clicks/vị trí, top pages, GEO citations) với trạng thái
      "chưa kết nối" trung thực + hướng dẫn setup. **Live GSC sync còn treo**:
      cần owner tạo OAuth client Google Cloud + set env (harness chặn assistant
      set env) → build phần token exchange/API khi owner cấp credential.
- [ ] **Còn treo (technical, làm sau — không phá backend đang chạy):** hợp nhất
      Module 1 vào engine chung + runner chung; rate limiting; dọn seed còn lại
      (Kho tri thức/knowledge vẫn mẫu); i18n nhất quán; wire nút "Kết nối GSC"
      khi có credential.

## Giai đoạn 4 — Mở rộng năng lực (sau UI/UX; owner chốt 2026-07-25)

Owner duyệt đưa **toàn bộ** vào roadmap; **ưu tiên bắt đầu bằng VIDEO** (làm
pha 1 trước rồi pha 2). Phân tầng theo mức phù hợp với lõi SEO+GEO và engine
app-native hiện có (đánh giá 2026-07-25).

### Ưu tiên · Tự động tạo video (2 pha)

- [x] **Pha 1 · Module #17 "Tạo video từ bài viết" (thuần AI, trên engine):**
      sinh kịch bản phân cảnh (kèm shot-list) + lời thoại voiceover + phụ đề
      `.srt` + `VideoObject` JSON-LD; tiêu thụ nội dung bài viết (#7/#8/#10);
      chạy đơn lẻ + **đã nối cuối pipeline**. Gates xanh (test 127/127).
      Category "Video" mới. Owner test bằng DeepSeek trên staging (sau redeploy).
- [ ] **Pha 2 · Render MP4 thật:** nối API bên thứ 3 **BYOK** — Creatomate /
      Shotstack / JSON2Video (template), HeyGen / Synthesia (avatar), Veo /
      Runway / Kling (AI-gen) + TTS tiếng Việt (Google / ElevenLabs / FPT.AI /
      Zalo / Viettel). Xuất MP4 + đẩy kèm bài đã đăng.

### Tier A — Đúng lõi, tái dùng engine (đang làm 2026-07-25)

- [x] **#18 Tái chế nội dung đa định dạng:** 1 module → 4 định dạng (thread
      X/Threads, carousel LinkedIn/IG kèm gợi ý hình, tóm tắt newsletter, caption
      Facebook). Tiêu thụ #7/#8/#10; standalone + chain-ready (KHÔNG nhồi vào
      pipeline mặc định để khỏi tốn token mỗi lần chạy cả luồng).
- [x] **#19 A/B variant** tiêu đề (#7) / mở bài (#8): 6 tiêu đề + 3 mở bài để
      chọn. (Tự đổi theo CTR: chờ vòng traffic GSC — làm sau.)
- [x] **AI insights (dữ liệu nội bộ):** card "Nhận định AI" trên trang Phân tích
      → gom module_jobs → gọi model BYOK → khuyến nghị. Route
      `/api/v1/analytics/insights`. Mở rộng sang GSC khi kết nối.
- [ ] **Gợi ý chủ đề theo trend (A-4 — TẠM DỪNG):** owner chốt API bên thứ 3
      BYOK nhưng chưa chọn SerpApi vs DataForSEO + cần cấp key để test. Owner tạm
      dừng để test các phần đã xong trước.

### Tier B — Hợp nhưng cần hạ tầng mới (làm chọn lọc)

- [ ] Render video MP4 (chính là Pha 2 video ở trên).
- [ ] **Lên lịch đăng "giờ vàng"** (smart scheduling) — cần hàng đợi/scheduler;
      app đang cố tình né cron (lazy sweeper) → sẽ cân nhắc queue nhẹ.
- [ ] **Newsletter/email tự động** — cần tích hợp email mới.
- [ ] **Báo cáo đa kênh hợp nhất** — mở rộng trang Phân tích (GSC → +GA4 +social).

### Tier C — Sản phẩm KHÁC, coi là SKU/giai đoạn riêng

Đưa vào roadmap theo yêu cầu owner nhưng **KHÔNG nhồi vào bản SEO+GEO hiện tại**
kẻo loãng định vị:

- [ ] **C-Social:** social listening / sentiment / trợ lý trả lời comment / thu
      lead từ comment. Cần quyền đọc inbox/comment FB/Zalo (Meta/Zalo review
      gắt), streaming realtime, kiểm duyệt — pivot lớn.
- [ ] **C-Sales:** CRM sync (HubSpot/Salesforce/Bitrix24) + lead scoring +
      nurturing workflow + sales enablement + social selling. Là marketing-
      automation/CRM — cần model dữ liệu lead + chuỗi email/nhắn tin riêng.
- [ ] ⚠️ Cào lead từ nhóm FB/LinkedIn: rủi ro vi phạm ToS + ban tài khoản —
      cân nhắc pháp lý trước khi làm.

## Ghi chú kỹ thuật đang treo

- Migration Neon owner cần áp theo thứ tự: `0003_eminent_blonde_phantom.sql`
  (module_jobs — đã áp), `0004_unique_sleeper.sql` (pinned_at — **chưa áp**).
- Module 1 vẫn chạy đường bridge riêng (đã kiểm chứng); sẽ hợp nhất vào engine
  chung ở Giai đoạn 3 hoặc khi cần đưa vào pipeline.
- **Mock đã gỡ HOÀN TOÀN (2026-07-25):** registry/preview backend + schema-preview
  UI + MockAutomationProvider + MakeAutomationProvider + pipeline-preview subsystem
  + `SITEMAP_PILOT_MODE=mock`. Module 1 **luôn app-native BYOK**; env khoan dung
  (thiếu `BRIDGE_DATABASE_URL` → trang báo rõ + disable, không crash). Seed chỉ còn
  tài khoản/dự án/knowledge. Đường app_native thật của Module 1 giữ nguyên.
- Hardening còn lại: job timeout/retry sweeper, dọn seed knowledge còn mẫu,
  rate limiting, hợp nhất Module 1 vào engine chung.
