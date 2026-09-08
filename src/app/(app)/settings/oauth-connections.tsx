import Link from "next/link";
import { KeyRound, Link2, ShieldCheck } from "lucide-react";
import type { OAuthConnectionSummary } from "@/domain/auth/oauth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const providerLabels = {
  google: "Google",
  make: "Make.com",
} as const;

export function OAuthConnections({
  connections,
  canManageIntegrations,
  notice,
}: {
  connections: OAuthConnectionSummary[];
  canManageIntegrations: boolean;
  notice?: { kind: "success" | "error"; message: string };
}) {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> OAuth và kết nối dịch vụ
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Liên kết đăng nhập chỉ xác nhận danh tính. Kết nối tự động hóa cấp token
          riêng cho Google Drive/Sheets và token được mã hóa trong Vault.
        </p>
        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={
              notice.kind === "error"
                ? "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
                : "rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400"
            }
          >
            {notice.message}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {connections
            .filter((connection) => connection.provider !== "make")
            .map((connection) => {
            const thieuQuyen = connection.quyenConThieu.length > 0;
            return (
            <div
              key={connection.provider}
              className="flex flex-col gap-3 rounded-lg border border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {providerLabels[connection.provider]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {connection.accountLabel ?? "Chưa có tài khoản liên kết"}
                  </p>
                </div>
                {/* ⚠️ "ĐÃ KẾT NỐI" MÀ THIẾU QUYỀN THÌ KHÔNG ĐƯỢC TÔ XANH.
                    Màu xanh là lời hứa rằng mọi thứ chạy được. Một token thiếu
                    quyền vẫn hợp lệ, vẫn còn hạn, vẫn gọi được Drive — chỉ
                    riêng Search Console trả 403. Tô xanh nó là để người dùng
                    đi tìm lỗi ở mọi chỗ khác trước khi nghĩ tới đây. */}
                <Badge
                  variant={
                    thieuQuyen
                      ? "warning"
                      : connection.connectedForAutomation
                        ? "success"
                        : connection.configured
                          ? "warning"
                          : "outline"
                  }
                >
                  {thieuQuyen
                    ? "Thiếu quyền"
                    : connection.connectedForAutomation
                      ? "Đã kết nối"
                      : connection.configured
                        ? "Sẵn sàng"
                        : "Thiếu cấu hình"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {connection.linkedForLogin
                    ? "Đã liên kết đăng nhập"
                    : "Chưa liên kết đăng nhập"}
                </span>
                {/* ĐẾM SCOPE KHÔNG NÓI LÊN ĐIỀU GÌ. "5 scope đã cấp" đọc như
                    một lời trấn an, trong khi cái thiếu lại đúng là cái người
                    dùng đang cần. Nên khi thiếu thì gọi TÊN nó ra. */}
                {thieuQuyen ? (
                  <span className="text-warning">
                    Chưa cấp quyền: {connection.quyenConThieu.join(", ")}
                  </span>
                ) : connection.scopes.length > 0 ? (
                  <span>{connection.scopes.length} quyền đã cấp</span>
                ) : null}
              </div>
              {connection.configured && (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/api/v1/oauth/${connection.provider}/start?intent=link`}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
                  >
                    <Link2 className="h-3.5 w-3.5" /> Liên kết đăng nhập
                  </Link>
                  {canManageIntegrations && connection.automationConfigured && (
                    <Link
                      href={`/api/v1/oauth/${connection.provider}/start?intent=connect`}
                      className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {thieuQuyen ? "Cấp thêm quyền" : "Kết nối tự động hóa"}
                    </Link>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Google dùng quyền tăng dần: đăng nhập chỉ xin openid/email/profile; quyền
          Drive, Sheets và Search Console chỉ được yêu cầu khi bấm “Kết nối tự
          động hóa”. Danh sách quyền có thể dài ra sau các bản cập nhật — khi đó
          bấm lại nút này để cấp phần còn thiếu.
        </p>
      </CardContent>
    </Card>
  );
}
