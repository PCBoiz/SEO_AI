# Production Readiness — Antigravity SEO Automation

Updated: 2026-07-22

## Kết luận hiện tại

Ứng dụng là **staging có dữ liệu thật**, chưa phải production. Ba lớp đang chạy thật là Vercel, Google OAuth và Neon PostgreSQL. Module 1 và Không gian AI có UI, validation, phân quyền, persistence và audit path, nhưng phần thực thi bên ngoài vẫn bị khóa ở mock để không gọi Make, model API, Google Sheets hoặc WordPress ngoài ý muốn.

## Ma trận khả năng

| Khu vực | Trạng thái có thể chứng minh | Thiếu trước production |
| --- | --- | --- |
| Web runtime | Vercel tại Singapore, health/readiness hoạt động | Custom domain, quy trình rollback và canary release |
| Đăng nhập | Google OAuth thật, owner bootstrap theo đúng email | OAuth consent/verification, account recovery, quản lý thành viên hoàn chỉnh |
| Dữ liệu ứng dụng | Neon lưu user, session, project, registry, pipeline preview, knowledge placeholder và audit | Backup/restore drill, retention và giám sát connection/runtime |
| File | Vercel Blob private adapter đã có | Chưa có upload/download UI, lifecycle và kiểm thử file thật |
| Module 1 | Form đầy đủ, RBAC, idempotency, job/result lưu Neon ở mock mode | Make role tối thiểu, `claim_sitemap_job_v2`, webhook production, canary và xử lý lỗi live |
| Không gian AI | Registry và adapter OpenAI/DeepSeek/Gemini/Claude; chỉ DeepSeek đang live-allowlisted, ba provider còn lại mock | Chạy một DeepSeek canary có xác nhận, thêm rate limit/budget và canary từng provider |
| Blueprint | 10 JSON đã reconciliation; mapping không đủ bằng chứng được đánh dấu blocker | Sheet export/manifest và xử lý các anomaly trước khi dùng mapping Sheet thật |
| Quy trình | Chỉ là pipeline preview, chưa có nút chạy | JobCoordinator, state transitions, retry/recovery và observability live |
| Nội dung đầu ra | Chưa có workspace đầu ra hoàn chỉnh | Artifact/version/export workflow và liên kết với job |
| Kho tri thức | Chỉ có record/prompt placeholder | Ingestion, chunking, embedding, retrieval, quyền truy cập và xóa dữ liệu |
| Analytics | Placeholder | Event model, metric definitions, aggregation và dashboard thật |
| WordPress/Facebook | Chỉ có credential placeholder được mã hóa | Provider adapter, preview/approval, idempotent publish và rollback |
| Vận hành | Pino, health/readiness, Sentry bootstrap | Sentry DSN, alerting, rate limiting, audit export, secret rotation drill |

## Thứ tự triển khai đề xuất

1. Ổn định staging: sửa lỗi runtime/UI, nhãn trạng thái trung thực và smoke test sau mỗi deploy.
2. Hoàn tất Module 1 live qua Neon + Make, chỉ chạy một canary không xuất bản và không đụng Google Sheets.
3. Nạp credit nhỏ, bật AI live theo từng provider; xác minh model, giới hạn chi phí và tắt ngay khi canary lỗi.
4. Xây JobCoordinator và luồng pipeline có thể quan sát/khôi phục.
5. Mở rộng lần lượt Output, Knowledge, Analytics và WordPress bằng vertical slice có quality gate riêng.

## Điều kiện mở khóa Module 1 live

- Có `BRIDGE_DATABASE_URL` của runtime role tối thiểu; không dùng owner/migrator URL.
- Make scenario dùng PostgreSQL để gọi `claim_sitemap_job_v2`, sau đó complete/fail đúng hợp đồng.
- `MAKE_WEBHOOK_RIS_SITEMAP` chỉ được đặt trong Vercel Production/Preview phù hợp và không xuất hiện ở client.
- Chạy canary với idempotency key cố định, xác nhận không claim hai lần, timeout/error được lưu và không có publish side effect.
- Chỉ đổi `SITEMAP_PILOT_MODE` từ `mock` sang `neon_make` sau khi owner duyệt checklist.

## Điều kiện mở khóa AI live

- Provider đã có billing/quota và API key server-only.
- Model ID được xác nhận bằng canary ở thời điểm bật; không suy ra từ tên tài liệu cũ.
- Có giới hạn request, output token và ngân sách; không tự retry hoặc fallback sang provider khác.
- Owner được báo trước từng canary có thể phát sinh chi phí.

## Blocker cần chủ dự án hỗ trợ sau này

- Quyền sửa Scenario Module 1 trong Make và thông tin connection PostgreSQL của role tối thiểu.
- Credit/quota cho từng AI provider muốn bật.
- Google Sheet export/manifest khi quyết định dùng lại các mapping Sheet trong blueprint.
- Tài khoản/website thử nghiệm riêng nếu bắt đầu WordPress hoặc Facebook publishing.
