# Module 1 — Import blueprint Neon Canary v1.2 vào Make

Cập nhật: 2026-07-22 (Asia/Saigon)

## File cần import

`docs/integration/make-blueprints/RIS 3.5 Module 1 - Sitemap - Neon Canary.blueprint.json`

Blueprint này là bản viết lại cho canary một website. Bản v1.2 được sửa từ
chính blueprint mà Make đã import rồi export lại trong tài khoản của chủ sở hữu:

- Custom webhook nhận contract `sitemap-pilot/1.1`.
- PostgreSQL gọi `claim_sitemap_job_v2` để khóa idempotency và đọc input từ Neon.
- Hai module DeepSeek tạo sitemap rồi chọn tối đa 30 nhãn.
- PostgreSQL gọi `complete_sitemap_job` để ghi output về Neon.
- Hai error route gọi `fail_sitemap_job` nếu một trong hai module DeepSeek lỗi.
- Không có Google Sheets, WordPress, Facebook, callback, database URL hoặc secret nhúng trong file.
- Webhook ID `4274190`, PostgreSQL account ID `14453762` và DeepSeek account ID
  `14453773` được giữ lại từ bản export của chủ sở hữu. Đây là ID tham chiếu,
  không phải credential, và khiến file v1.2 chỉ phù hợp với chính Make team đó.
- Mapper function dùng đúng khóa động do Make sinh ra: `@01:uuid`,
  `@02:uuid`, `@03:jsonb` hoặc `@03:text`.
- Truy cập phần tử đầu tiên của `sites` dùng `get(parseJSON(...); "1.field")`;
  không còn cú pháp `parseJSON(...)[1]` mà Make đã tách sai khi import v1.1.

File đã được kiểm tra bằng `npm run module1:validate-blueprint`. Sau import,
hãy mở từng module để Make tái xác nhận metadata động. Nếu các connection vẫn
hiện đúng thì chỉ cần Save; nếu Make báo ID không còn tồn tại thì chọn lại
connection/function tương ứng.

## Sửa lỗi `password authentication failed`

Lỗi này xảy ra trước khi Make kiểm tra schema, function hoặc grant. Import blueprint không thể sửa lỗi này. Host đã truy cập được PostgreSQL; username/password hoặc branch chưa khớp.

1. Mở Neon Console và chọn đúng project, đúng branch chứa schema `antigravity_bridge`.
2. Trong **Connect**, kiểm tra endpoint direct của branch. Host dùng trong Make phải là phần hostname, không gồm `postgresql://`, username, password, `/neondb` hoặc query string. Để pilot dễ chẩn đoán, dùng endpoint direct không có hậu tố `-pooler`.
3. Mở SQL Editor trên chính branch đó và chạy:

   ```sql
   select current_database(), current_user;

   select rolname, rolcanlogin
   from pg_roles
   where rolname = 'antigravity_bridge_make';
   ```

4. Tạo một mật khẩu ngẫu nhiên mới dài ít nhất 32 ký tự. Để loại trừ lỗi copy ở lần kết nối đầu, có thể chỉ dùng chữ hoa, chữ thường và số. Không gửi mật khẩu qua chat và không lưu vào repo.
5. Trên cùng SQL Editor, chạy với mật khẩu mới:

   ```sql
   alter role antigravity_bridge_make
     with login password '<MAT_KHAU_MOI>';

   grant connect on database neondb to antigravity_bridge_make;
   grant usage on schema antigravity_bridge to antigravity_bridge_make;
   grant execute on function antigravity_bridge.claim_sitemap_job_v2(uuid, uuid)
     to antigravity_bridge_make;
   grant execute on function antigravity_bridge.complete_sitemap_job(uuid, uuid, jsonb)
     to antigravity_bridge_make;
   grant execute on function antigravity_bridge.fail_sitemap_job(uuid, uuid, text)
     to antigravity_bridge_make;
   revoke all on antigravity_bridge.sitemap_jobs
     from antigravity_bridge_make;
   ```

   Nếu câu `alter role` báo role chưa tồn tại, dùng:

   ```sql
   create role antigravity_bridge_make
     with login password '<MAT_KHAU_MOI>';
   ```

   rồi chạy lại toàn bộ các câu `grant`/`revoke` ở trên.

6. Tạo connection trong Make với đúng các field riêng:

   - Host: hostname direct của đúng Neon branch.
   - Port: `5432`.
   - Database: `neondb`.
   - User: `antigravity_bridge_make`.
   - Password: mật khẩu vừa đặt, không có dấu cách đầu/cuối.
   - Encrypt: `Yes`.
   - Keep alive: `Yes` hoặc để trống.

Nếu vẫn nhận đúng lỗi password sau khi đã reset trên đúng branch, tạo role thử mới `antigravity_bridge_make_v2` trên branch đó, cấp cùng grant và dùng đúng username mới trong Make. Cách này tách hoàn toàn lỗi credential cũ; không dùng role owner để “thử cho nhanh”.

## Import và hoàn thiện mapping

1. Tạo một scenario mới trong Make, chưa bật schedule.
2. Chọn menu scenario, **Import blueprint**, rồi chọn file JSON ở trên.
3. Module 1 — **Webhook Antigravity v1.1**:
   - Tạo một Custom webhook mới.
   - Chưa đưa URL vào Vercel Production.
4. Module 2 — **Claim job**:
   - Xác nhận connection PostgreSQL đã được chọn; nếu trống, chọn connection `antigravity_bridge_make`.
   - Xác nhận function `antigravity_bridge.claim_sitemap_job_v2`.
   - Xác nhận `p_job_id ← 1.jobId` (`@01:uuid`).
   - Xác nhận `p_idempotency_key ← 1.idempotencyKey` (`@02:uuid`).
   - Giữ `Ignore returned data = No`.
5. Module 3 và 4 — **DeepSeek**:
   - Xác nhận connection DeepSeek đã test thành công; v1.2 đã giữ account ID từ bản export.
   - Xác nhận model `deepseek-v4-flash`.
   - Giữ `Thinking = No` cho canary đầu tiên.
6. Module 5 — **Complete job**:
   - Xác nhận cùng connection PostgreSQL.
   - Xác nhận function `antigravity_bridge.complete_sitemap_job`.
   - Xác nhận `p_job_id`, `p_idempotency_key`, `p_output` tương ứng
     `@01:uuid`, `@02:uuid`, `@03:jsonb` còn nguyên.
7. Mở error route dưới module 3 và module 4:
   - Xác nhận cùng connection PostgreSQL.
   - Xác nhận function `antigravity_bridge.fail_sitemap_job`.
   - Xác nhận `p_job_id`, `p_idempotency_key`, `p_error_message` tương ứng
     `@01:uuid`, `@02:uuid`, `@03:text`.
8. Trong Scenario settings, giữ **Auto commit = Yes**, **Process data in order = Yes**, và bật lưu incomplete executions nếu gói Make hỗ trợ.
9. Save nhưng chưa bật scenario.

## Học schema webhook mà không tốn token

Sau khi module PostgreSQL đã kết nối:

1. Bấm **Run once**.
2. Gửi payload sau tới URL webhook mới:

   ```json
   {
     "jobId": "00000000-0000-4000-8000-000000000001",
     "idempotencyKey": "00000000-0000-4000-8000-000000000002",
     "automationKey": "RIS_SITEMAP",
     "sheetFallbackMode": "disabled"
   }
   ```

Hai UUID này không tồn tại trong bảng job nên `claim_sitemap_job_v2` trả zero rows. Route dừng trước DeepSeek, không phát sinh phí. Sau lần này Make sẽ nhận biết bốn field webhook và các token mapping sẽ hiện đúng trong editor.

## Bằng chứng cần gửi lại trước canary thật

- Ảnh connection PostgreSQL báo thành công, đã che host nếu muốn và không hiển thị password.
- Ảnh toàn bộ graph có 5 module chính và 2 error route.
- Blueprint export lại từ scenario sau khi đã chọn connection/function; file export không chứa secret.
- Kết quả lần Run once bằng UUID giả: claim zero rows, DeepSeek không chạy.

Chỉ sau khi bản export lại được đối chiếu mới đặt webhook vào Vercel Preview, bật `neon_make` ở Preview và chạy một job thật duy nhất.
