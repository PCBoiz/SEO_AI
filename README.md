# Antigravity OS

Antigravity OS là workspace Next.js quản lý dự án SEO, automation và các nội dung đầu ra. Local/test dùng SQLite, `MockAutomationProvider` và `LocalStorageProvider`. Bản staging đã có adapter Neon PostgreSQL và Vercel Blob; pilot Make đầu tiên vẫn là Module 1 — Sitemap.

Mặc định ứng dụng vẫn chạy hoàn toàn local, AI ở chế độ mock và không gọi Make, Neon, Google, model API hoặc WordPress thật.

## Cài đặt local

Yêu cầu:

- Node.js 20.9 trở lên
- npm
- Google Chrome để chạy Playwright E2E

```powershell
npm install
Copy-Item .env.example .env
```

Tạo hai secret local độc lập:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Dùng giá trị đầu cho `VAULT_ENCRYPTION_KEY`, giá trị sau cho `AUTH_SESSION_SECRET`. Giữ `SITEMAP_PILOT_MODE=mock` và không điền secret dịch vụ ngoài nếu chỉ thử local.

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Seed có tính idempotent, tạo tài khoản owner/editor/viewer, registry automation, dự án mẫu, kho tri thức/prompt mẫu và quy trình chỉ đọc. Mật khẩu local được ghi vào file đã ignore `.data/seed-credentials.json`, không in ra terminal.

Sau khi đăng nhập, mở `/automations/sitemap` để chạy thử Module 1 bằng mock hoặc `/ai` để thử registry bốn provider bằng mock. Input, trạng thái và output được lưu trong SQLite; không có yêu cầu bên ngoài.

## OAuth và AI provider

`.env.example` có placeholder cho Google OAuth, Make OAuth và bốn AI provider. Không điền secret vào file được commit hoặc gửi qua chat. OAuth login thường chỉ chấp nhận tài khoản đã liên kết. Riêng staging có bootstrap một lần cho đúng email Google đã seed và allowlist bằng `OAUTH_BOOTSTRAP_EMAIL`; email phải được Google xác minh và không tạo tài khoản ngoài allowlist.

AI mặc định dùng `AI_EXECUTION_MODE=mock`. Khi chuyển sang `live`, mỗi provider chỉ khả dụng nếu có key server-side tương ứng và mỗi request UI phải xác nhận khả năng phát sinh chi phí. Hệ thống không tự retry, không fallback sang model khác và không fallback từ live về mock.

Hướng dẫn cấu hình, redirect URI, thứ tự canary và blocker nằm tại [docs/integration/oauth-ai-live-readiness.md](docs/integration/oauth-ai-live-readiness.md).

## Bridge Neon cho Module 1

PostgreSQL có schema/migration riêng, không dùng chung migration SQLite:

```powershell
npm run db:bridge:generate
$env:BRIDGE_DATABASE_URL='<NEON_MIGRATOR_URL>'
npm run db:bridge:migrate
```

Không chạy lệnh migrate Neon trước khi có database thử nghiệm và quyền owner/migrator phù hợp. Hướng dẫn đổi Make scenario, phân quyền database, hợp đồng JSON và checklist kích hoạt nằm tại [docs/integration/module1-neon-pilot.md](docs/integration/module1-neon-pilot.md).

## Quality gates

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

E2E tái tạo `.data/e2e.db` và `.data/e2e-credentials.json`; không ghi dữ liệu thử vào `local.db`.

## Biên an toàn

- Mọi dữ liệu được giới hạn theo workspace và kiểm tra quyền ở server.
- Thông tin đăng nhập WordPress được mã hóa AES-256-GCM và không trả về browser.
- URL webhook, chuỗi kết nối Neon, OAuth client secret và AI key chỉ nằm trong environment server-side.
- Webhook Module 1 chỉ nhận định danh job, không nhận secret DB hoặc toàn bộ site input.
- Khóa idempotency chặn cùng job bị dispatch hai lần.
- Chế độ `neon_make` fail-closed nếu thiếu cấu hình; không tự động giả vờ thành công bằng mock.
- Token OAuth dịch vụ và kết quả AI test được mã hóa bằng Vault; prompt test chỉ lưu SHA-256.
- Chưa có live callback, JobCoordinator, kết nối Sheet, WordPress production hoặc deploy production.

Xem [docs/implementation-status.md](docs/implementation-status.md) để biết trạng thái, bằng chứng, assumption và blocker hiện tại.

## Vercel staging

Project `antigravity-seo-automation` và Blob store riêng tư tại Singapore đã được tạo nhưng chưa deploy khi thiếu email/secret/Neon runtime URL. Checklist owner-assisted và biên kích hoạt nằm tại [docs/deployment/vercel-staging.md](docs/deployment/vercel-staging.md).
