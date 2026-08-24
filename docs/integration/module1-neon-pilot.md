# Pilot Module 1 — Neon Postgres + Make.com

Cập nhật: 2026-07-22 (Asia/Saigon)

## Trạng thái và giới hạn

Pilot Module 1 đã có đầy đủ nền tảng trong mã nguồn nhưng mặc định vẫn chạy với `SITEMAP_PILOT_MODE=mock`. Không có webhook Make hoặc database Neon thật nào được gọi trong quá trình triển khai này.

Quyết định mới của chủ sở hữu là thay Google Sheet bằng một bridge database PostgreSQL trên Neon cho Module 1. Đây là hợp đồng Phase 3 mới; nó không thay đổi bằng chứng về hành vi scenario cũ trong Blueprint Reconciliation v1.

- SQLite tiếp tục lưu người dùng, workspace, dự án và dữ liệu giao diện local.
- Neon chỉ lưu input, output và vòng đời job của bridge Module 1.
- Trình duyệt chỉ gọi API Antigravity; URL webhook và chuỗi kết nối Neon không được gửi xuống browser.
- Antigravity tạo job trên Neon, sau đó webhook chỉ gửi `jobId`, `idempotencyKey` và `automationKey`.
- Make đọc input và ghi output trực tiếp trên Neon.
- Giao diện thăm dò API Antigravity; không cần callback vào localhost.
- Pilot chưa có tự động retry hoặc job-timeout sweeper. `MAKE_DISPATCH_TIMEOUT_MS` chỉ giới hạn thời gian gửi webhook.

## Hợp đồng input v1.1 / output v1.0

Một job có `automationKey=RIS_SITEMAP`, tối đa bốn site và một khóa chống chạy trùng do client tạo. Giao diện pilot hiện gửi một site mỗi lần; API/schema đã chấp nhận tối đa bốn để scenario có thể chuyển dần từ bốn hàng Setup cũ.

```json
{
  "projectId": "project-id",
  "idempotencyKey": "uuid",
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-v4-flash"
  },
  "sites": [
    {
      "reference": "Tên dự án hoặc nhánh",
      "location": "Việt Nam",
      "primaryKeyword": "dịch vụ SEO tổng thể",
      "tone": "Chuyên nghiệp",
      "language": "Tiếng Việt",
      "websiteBrief": "Mô tả website và khách hàng mục tiêu",
      "competitorUrls": [
        "https://doi-thu-1.vn",
        "https://doi-thu-2.vn"
      ]
    }
  ]
}
```

Make phải ghi kết quả đúng hợp đồng sau vào `output_payload`:

```json
{
  "contractVersion": "1.0",
  "sites": [
    {
      "reference": "Tên dự án hoặc nhánh",
      "draftSitemap": "Nội dung sitemap đầy đủ dạng text",
      "selectedSitemap": "Tối đa 30 nhãn sitemap dạng text"
    }
  ]
}
```

`draftSitemap` tương ứng vai trò của các ô `Sitemap-Working!A1/A3/A5/A7`; `selectedSitemap` tương ứng vai trò của `Sitemap!D3:D200`. Đây là sự thay thế có chủ đích cho lưu trữ Sheet, không phải tuyên bố rằng webhook Blueprint cũ đã có payload này.

## Tạo schema Neon

Migration Drizzle nằm trong `drizzle-bridge/`, gồm schema bảng, function lifecycle và function claim v2 có AI routing. Chỉ chạy migration sau khi chủ sở hữu đã tạo Neon project/branch thử nghiệm và cấp chuỗi kết nối owner riêng cho thao tác migration.

```powershell
$env:BRIDGE_DATABASE_URL='<NEON_OWNER_OR_MIGRATOR_URL>'
npm run db:bridge:migrate
```

Không lưu URL thật trong `.env.example`, tài liệu, Blueprint hoặc browser code.

Sau khi migration hoàn tất, tạo hai role riêng bằng Neon SQL Editor hoặc công cụ PostgreSQL. Thay placeholder bằng mật khẩu ngẫu nhiên mạnh và không commit câu lệnh đã điền secret.

```sql
create role antigravity_bridge_app login password '<APP_RANDOM_PASSWORD>';
create role antigravity_bridge_make login password '<MAKE_RANDOM_PASSWORD>';

grant usage on schema antigravity_bridge to antigravity_bridge_app;
grant select, insert, update on antigravity_bridge.sitemap_jobs
  to antigravity_bridge_app;

grant usage on schema antigravity_bridge to antigravity_bridge_make;
grant execute on function antigravity_bridge.claim_sitemap_job_v2(uuid, uuid)
  to antigravity_bridge_make;
grant execute on function antigravity_bridge.complete_sitemap_job(uuid, uuid, jsonb)
  to antigravity_bridge_make;
grant execute on function antigravity_bridge.fail_sitemap_job(uuid, uuid, text)
  to antigravity_bridge_make;
```

Pilot dùng database/schema riêng và role không phải owner. Chưa bật RLS vì repository Neon hiện không thiết lập workspace session variable trong cùng transaction; application vẫn bắt buộc lọc mọi đọc/ghi theo `workspace_id`. Bật RLS nửa vời sẽ tạo cảm giác an toàn sai và có thể làm hỏng pooled HTTP queries. RLS là hardening item cần thiết trước khi bridge mở rộng cho nhiều tenant hoặc nhiều automation.

## Sửa scenario Make Module 1

Blueprint gốc có custom webhook module `9`, router module `12`, bốn nhánh đọc `Setup!A2:J5`, năm module DeepSeek và năm Sheet writes. Bản pilot mới giữ custom webhook và logic prompt, nhưng thay toàn bộ module Google Sheet bằng PostgreSQL.

### 1. Webhook đầu vào

Webhook nhận bốn field theo contract `sitemap-pilot/1.1`:

```json
{
  "jobId": "uuid",
  "idempotencyKey": "uuid",
  "automationKey": "RIS_SITEMAP",
  "sheetFallbackMode": "disabled"
}
```

Không thêm chuỗi kết nối DB, secret hoặc toàn bộ input vào webhook.
`sheetFallbackMode` chỉ nhận `disabled` hoặc `manual_mirror` từ cấu hình server.
Không có fallback tự động; `manual_mirror` chỉ được bật sau khi mapping Sheet thật
đã được xác minh, và Neon vẫn là nguồn dữ liệu chính.

### 2. Claim job bằng function có tham số kiểu hóa

Thêm module PostgreSQL `Execute a function` và chọn `antigravity_bridge.claim_sitemap_job_v2`. Make tải động hai tham số UUID để mapping riêng từng giá trị. Bật auto-commit cho connection/module. Không ghép chuỗi webhook vào câu SQL. Function trả thêm `ai_provider` và `ai_model` đã được schema ứng dụng kiểm tra.

```sql
select * from antigravity_bridge.claim_sitemap_job_v2($1::uuid, $2::uuid);
```

Nếu query trả về không dòng nào, scenario phải dừng thành công mà không chạy DeepSeek. Điều này chặn một webhook lặp lại khi job đang chạy hoặc đã hoàn thành.

### 3. Lặp qua `sites`

Thêm Iterator cho mảng `sites`. Mỗi bundle ánh xạ trực tiếp:

| Prompt Module 1 cũ | Field bridge mới | Mức chắc chắn |
| --- | --- | --- |
| Setup cột A, được prompt dùng sau từ “in” | `location` | `inferred_from_module_references` |
| Setup cột B / `Primary Keyword (B)` | `primaryKeyword` | `confirmed_from_blueprint` |
| Setup cột C / `Tone of Voice (C)` | `tone` | `confirmed_from_blueprint` nhưng prompt Module 1 cũ chưa tham chiếu |
| Setup cột D / `Language (D)` | `language` | `confirmed_from_blueprint` |
| Setup cột E / `Website Brief (E)` | `websiteBrief` | `confirmed_from_blueprint` |
| Setup cột F:J / `Competitor 1..5` | `competitorUrls[]` | `confirmed_from_blueprint` |

`location` được giữ là inference vì interface JSON chỉ ghi nhãn cột A là `(A)`; prompt dùng giá trị đó như địa điểm. Không trình bày mapping này như header Sheet đã được xác minh.

### 4. Chọn model AI và gom kết quả

Với mỗi site, router Make đọc `ai_provider` và chỉ chạy đúng một nhánh đã cấu hình:

| `ai_provider` | Model mặc định từ app | Connection cần tạo trong Make |
| --- | --- | --- |
| `deepseek` | `deepseek-v4-flash` | DeepSeek API key phía Make |
| `openai` | `gpt-5.6-terra` | OpenAI API key phía Make |
| `gemini` | `gemini-3.6-flash` | Google Gemini API key hoặc connection Google Cloud phù hợp |
| `anthropic` | `claude-sonnet-5` | Anthropic API key phía Make |

Tên model là dữ liệu cấu hình, không phải hằng số vĩnh viễn. Make phải allowlist bốn provider và model đã duyệt; không dùng model string từ job để tạo URL tùy ý. Sau khi chọn nhánh:

1. Dùng prompt tạo sitemap tương đương module DeepSeek `11/19/17/21`, nhưng thay tham chiếu Sheet bằng field Iterator và gọi model của nhánh đã chọn.
2. Dùng prompt chọn tối đa 30 nhãn tương đương module `23`.
3. Tạo object `{reference, draftSitemap, selectedSitemap}`.
4. Dùng Array Aggregator gom các object thành mảng `sites`.

Không cần bốn router branch cố định. Iterator thay vai trò bốn hàng `Setup!A2:J5` và tránh hard-code vị trí hàng.

### 5. Ghi thành công

Serialize đúng JSON hợp đồng v1, sau đó dùng PostgreSQL `Execute a function` với `complete_sitemap_job(jobId, idempotencyKey, outputJson)`. Function chỉ cập nhật khi job đang `running` và JSON có `contractVersion=1.0` cùng mảng `sites` từ một đến bốn phần tử.

```sql
select * from antigravity_bridge.complete_sitemap_job(
  $1::uuid,
  $2::uuid,
  $3::jsonb
);
```

### 6. Error handler

Gắn error handler vào phần DeepSeek/aggregator và gọi `fail_sitemap_job(jobId, idempotencyKey, sanitizedMessage)`. Chỉ lưu thông báo đã được rút gọn; không ghi API key, connection string, full response headers hoặc secret vào `error_message`.

```sql
select * from antigravity_bridge.fail_sitemap_job(
  $1::uuid,
  $2::uuid,
  $3::text
);
```

## Chuyển từ mock sang live

Chỉ chuyển sau khi đã kiểm tra scenario trong Make bằng một Neon branch/database thử nghiệm:

1. Apply migration bằng role owner/migrator rồi thay bằng pooled connection string của `antigravity_bridge_app` trong runtime Antigravity.
2. Tạo Make PostgreSQL connection bằng `antigravity_bridge_make`; bật encryption và auto-commit.
3. Tạo connection riêng trong Make cho model dùng ở lần pilot đầu. Khuyến nghị bắt đầu bằng DeepSeek để gần Blueprint gốc nhất; ba nhánh còn lại chỉ bật sau khi từng connection đã được test riêng.
4. Sửa scenario theo sáu bước trên và kiểm tra claim v2 trả đúng `ai_provider`, `ai_model`; claim trùng phải trả về zero rows.
5. Đặt URL webhook thật vào `MAKE_WEBHOOK_RIS_SITEMAP` phía server.
6. Đặt `SITEMAP_PILOT_MODE=neon_make` và restart local server.
7. Chạy một job thử, kiểm tra `queued → dispatching → running → succeeded`, model route, output contract và polling UI.
8. Thử gửi lại cùng `jobId/idempotencyKey` và xác nhận model không chạy lần hai.
9. Thử một lỗi model có kiểm soát và xác nhận job chuyển `failed` mà không lộ secret.

OAuth Google/Make của Antigravity và các connection AI trong Make là hai miền credential khác nhau. Không copy access token OAuth đã mã hóa từ SQLite sang Make, không đưa API key AI vào job/webhook, và không dùng token Make API làm webhook secret.

Nếu thiếu bất kỳ secret/config nào, giữ `SITEMAP_PILOT_MODE=mock`. Không dùng fallback im lặng từ live về mock vì điều đó có thể khiến người dùng hiểu nhầm một automation thật đã chạy.

## Nguồn kỹ thuật chính thức

- Neon serverless driver: <https://neon.com/docs/serverless/serverless-driver>
- Neon connection pooling: <https://neon.com/docs/connect/connection-pooling>
- Drizzle với Neon: <https://orm.drizzle.team/docs/get-started/neon-new>
- Make PostgreSQL modules: <https://apps.make.com/postgres>
