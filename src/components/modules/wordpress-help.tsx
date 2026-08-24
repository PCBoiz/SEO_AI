"use client";

import { ChevronRight } from "lucide-react";

// Hướng dẫn lấy thông tin xác thực WordPress. Có hai loại site và cách lấy khác
// nhau; Module 12 tự nhận diện khi chạy nên người dùng chỉ cần dán đúng chuỗi
// tương ứng vào ô "Mật khẩu ứng dụng".
export function WordpressHelp() {
  return (
    <details className="group rounded-lg border border-border bg-background/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs font-medium text-foreground">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        Lấy thông tin xác thực ở đâu? (không cần cài plugin)
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          Có <span className="text-foreground">hai loại site WordPress</span> và cách lấy khác nhau.
          Hệ thống <span className="text-foreground">tự nhận diện</span> khi đăng bài — bạn chỉ cần
          dán đúng chuỗi tương ứng.
        </p>

        <div className="flex flex-col gap-1.5 rounded-md border border-border bg-background/40 p-2.5">
          <p className="text-foreground">
            ① WordPress tự host (hosting riêng) — hoặc WordPress.com gói Doanh nghiệp
          </p>
          <p>
            Dùng <span className="text-foreground">Application Password</span>, có sẵn trong
            WordPress từ bản 5.6:
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-4">
            <li>Đăng nhập WP Admin bằng tài khoản Administrator hoặc Editor.</li>
            <li>
              Vào <span className="text-foreground">Users → Profile</span>, kéo xuống cuối trang tới
              mục <span className="text-foreground">Application Passwords</span>.
            </li>
            <li>
              Gõ tên bất kỳ (ví dụ <span className="text-foreground">Antigravity</span>) → bấm{" "}
              <span className="text-foreground">Add New Application Password</span>.
            </li>
            <li>
              Copy chuỗi 24 ký tự dạng{" "}
              <span className="metric text-foreground">abcd EFGH ijkl MNOP qrst UVWX</span> → dán vào
              ô &quot;Mật khẩu ứng dụng&quot;. Chuỗi này{" "}
              <span className="text-foreground">chỉ hiện một lần</span>.
            </li>
          </ol>
          <p className="text-muted-foreground/80">
            Ô &quot;Tên đăng nhập&quot;: điền username đăng nhập WP (không phải email).
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-md border border-border bg-background/40 p-2.5">
          <p className="text-foreground">
            ② WordPress.com gói Free / Cá nhân / Cao cấp (địa chỉ *.wordpress.com)
          </p>
          <p>
            Loại này <span className="text-foreground">không có</span> Application Passwords. Dùng{" "}
            <span className="text-foreground">OAuth2 token</span>:
          </p>
          <ol className="flex list-decimal flex-col gap-1 pl-4">
            <li>
              Mở <span className="metric text-foreground">developer.wordpress.com/apps</span> → bấm{" "}
              <span className="text-foreground">Create New Application</span> (miễn phí).
            </li>
            <li>
              Điền tên bất kỳ, website và Redirect URL để tạm{" "}
              <span className="metric text-foreground">https://localhost</span> → lưu lại.
            </li>
            <li>
              Mở tab <span className="text-foreground">WordPress.com Connect</span> của ứng dụng vừa
              tạo để lấy <span className="text-foreground">access token</span> cho site của bạn.
            </li>
            <li>Dán token vào ô &quot;Mật khẩu ứng dụng&quot;.</li>
          </ol>
          <p className="text-muted-foreground/80">
            Ô &quot;Tên đăng nhập&quot;: điền email/username WordPress.com của bạn (chỉ để ghi nhớ,
            không dùng để xác thực).
          </p>
        </div>

        <p className="rounded-md border border-amber-500/25 bg-amber-500/5 p-2.5 text-amber-200/90">
          <span className="font-medium">Không thấy mục Application Passwords?</span> Site chưa chạy
          HTTPS (WordPress ẩn mục này trên HTTP), plugin bảo mật (Wordfence, Solid Security, All In
          One WP Security…) đã tắt nó, hoặc hosting chặn REST API. Nếu site của bạn là
          *.wordpress.com gói Free/Cá nhân/Cao cấp thì mục này vốn không tồn tại — dùng cách ②.
        </p>
        <p>
          Cả hai chuỗi trên đều <span className="text-foreground">không phải</span> mật khẩu đăng
          nhập, và đều thu hồi riêng được bất cứ lúc nào. Hệ thống mã hóa AES-256-GCM trước khi lưu.
        </p>
      </div>
    </details>
  );
}
