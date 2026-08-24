# OAuth và AI — Live Readiness

Cập nhật: 2026-07-22 (Asia/Saigon)

## Trạng thái

Mã nguồn đã có nền tảng OAuth Google/Make và registry bốn AI provider. Mặc định vẫn là `AI_EXECUTION_MODE=mock` và `SITEMAP_PILOT_MODE=mock`. Chưa có OAuth authorization, API model call, Make webhook call hoặc Neon migration thật nào được thực hiện.

## Các luồng credential tách biệt

1. **Đăng nhập Antigravity:** Google hoặc Make OIDC. Người dùng phải đăng nhập local trước và liên kết tài khoản; hệ thống không tự cấp owner theo email.
2. **Google Drive/Sheets cho automation:** OAuth Google riêng, xin quyền tăng dần khi bấm kết nối. Access/refresh token được mã hóa AES-256-GCM trong SQLite bằng Vault.
3. **Quản lý Make API:** OAuth Make riêng. Client ID/secret và scope phải do Make cấp; không tự suy đoán scope.
4. **AI gọi trực tiếp từ Antigravity:** API key server-side cho OpenAI, DeepSeek, Gemini và Anthropic. Đây không phải OAuth người dùng.
5. **AI chạy bên trong scenario Module 1:** connection riêng do Make quản lý. Job chỉ mang `ai.provider` và `ai.model`, không mang secret.

## Redirect URI cần đăng ký chính xác

Local:

```text
http://localhost:3000/api/v1/oauth/google/callback
http://localhost:3000/api/v1/oauth/make/callback
```

Nếu chạy local bằng `127.0.0.1`, phải đổi `NEXT_PUBLIC_APP_URL` và đăng ký URI tương ứng; `localhost` và `127.0.0.1` không được coi là cùng redirect URI. Khi có domain HTTPS, đăng ký thêm hai callback trên domain đó.

## Cấu hình server cần điền sau

Không gửi secret qua chat. Điền trực tiếp vào file `.env` đã bị Git ignore:

```dotenv
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
MAKE_OAUTH_CLIENT_ID=...
MAKE_OAUTH_CLIENT_SECRET=...
MAKE_OAUTH_SCOPES=... # đúng scope được Make duyệt

OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
AI_EXECUTION_MODE=mock
```

Giữ `AI_EXECUTION_MODE=mock` cho đến lúc test từng key. Mỗi lần gọi live từ UI yêu cầu tick xác nhận chi phí; endpoint server cũng kiểm tra xác nhận này. Không có retry hoặc fallback model tự động, tránh nhân đôi chi phí và tránh che giấu lỗi provider.

## Cơ chế bảo vệ đã có

- OAuth authorization code dùng state, PKCE S256, nonce, cookie HttpOnly/SameSite=Lax có hạn 10 phút và ID token signature verification qua JWKS.
- Liên kết login khác với cấp quyền dịch vụ; email mới không tự động tạo user hoặc membership.
- Refresh token được mã hóa bằng Vault với workspace/user/provider làm authenticated context.
- AI provider chỉ có endpoint allowlist cố định; khóa API không được trả về browser hoặc ghi trong kết quả.
- AI test lưu SHA-256 của prompt, không lưu prompt rõ; kết quả được mã hóa và request có idempotency key theo workspace.
- Live AI yêu cầu xác nhận chi phí trên UI và server. Timeout tối đa 120 giây, output tối đa 4.096 token, mặc định 1.024 token.
- Không có fallback im lặng từ live sang mock.

## Thứ tự kích hoạt đề xuất

1. Đăng ký Google Web OAuth client với callback local; đăng nhập local owner và liên kết email Google mới.
2. Test Google OIDC login. Sau đó mới test consent Drive/Sheets nếu thực sự cần cho scenario khác; Module 1 Neon không cần Sheet.
3. Yêu cầu/đăng ký Make OAuth client, điền scope đã được Make duyệt và test link/connect. Nếu chưa được cấp OAuth client, webhook Module 1 vẫn có thể chạy độc lập; không thay OAuth bằng token đưa xuống browser.
4. Điền **một** AI key trước, bắt đầu DeepSeek để gần Blueprint Module 1 gốc nhất. Chuyển `AI_EXECUTION_MODE=live`, restart, chạy một prompt ngắn có xác nhận chi phí, rồi trả về mock.
5. Lặp lại độc lập cho OpenAI, Gemini và Claude. Chỉ sau khi mỗi adapter pass mới tạo connection tương ứng trong Make.
6. Apply toàn bộ `drizzle-bridge/` lên Neon branch thử nghiệm, tạo role app/Make tối thiểu, sửa Make Module 1 dùng `claim_sitemap_job_v2`.
7. Báo trước lần chạy end-to-end thật, sau đó mới bật `SITEMAP_PILOT_MODE=neon_make` và gửi đúng một job canary.

## Blocker còn lại trước test thật

- Email Google mới để liên kết, nhưng không cần gửi mật khẩu hoặc secret.
- Google OAuth client ID/secret đã tạo với redirect URI local.
- Make OAuth client ID/secret và danh sách scope đã được duyệt, hoặc xác nhận chưa có để hoãn riêng phần Make API OAuth.
- Neon migrator URL, pooled app URL và Make-role connection được đặt trực tiếp trong môi trường tương ứng.
- Webhook Module 1 và scenario đã được sửa theo hợp đồng claim v2.
- API key của provider sẽ test đầu tiên và xác nhận ngân sách cho đúng một request ngắn.

## Tài liệu chính thức

- Google OAuth web-server flow: <https://developers.google.com/identity/protocols/oauth2/web-server>
- Make OAuth API flow: <https://developers.make.com/api-documentation/authentication/oauth-flow>
- OpenAI model guidance: <https://developers.openai.com/api/docs/guides/latest-model>
- DeepSeek API: <https://api-docs.deepseek.com/>
- Gemini models: <https://ai.google.dev/gemini-api/docs/models>
- Claude Messages API: <https://platform.claude.com/docs/en/api/messages/create>
