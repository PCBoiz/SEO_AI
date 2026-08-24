import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentIdentity } from "@/lib/auth/dal";
import { getOAuthProviderStatuses } from "@/infrastructure/config/oauth-environment";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth_error?: string }>;
}) {
  if (await getCurrentIdentity()) {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const oauthProviders = getOAuthProviderStatuses().filter(
    (provider) => provider.configured,
  );
  const allowPasswordLogin = process.env.APP_RUNTIME?.trim() !== "vercel";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-xl font-semibold">Antigravity OS</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Đăng nhập vào không gian tự động hóa
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Truy cập workspace</CardTitle>
          </CardHeader>
          <CardContent>
            {query.oauth_error && (
              <p
                role="alert"
                className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                Đăng nhập OAuth chưa hoàn tất ({query.oauth_error}). Tài khoản chủ
                sở hữu phải dùng đúng email đã cấu hình.
              </p>
            )}
            {allowPasswordLogin ? (
              <LoginForm />
            ) : (
              <p className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                Hệ thống chỉ cho phép đăng nhập bằng OAuth. Tài khoản và mật khẩu
                local không được gửi lên máy chủ.
              </p>
            )}
            {oauthProviders.length > 0 && (
              <div
                className={
                  allowPasswordLogin ? "mt-5 border-t border-border pt-4" : "mt-4"
                }
              >
                {allowPasswordLogin && (
                  <p className="mb-3 text-center text-xs text-muted-foreground">
                    Hoặc đăng nhập bằng tài khoản đã liên kết
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  {oauthProviders.map((provider) => (
                    <a
                      key={provider.id}
                      href={`/api/v1/oauth/${provider.id}/start?intent=login`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-border text-sm font-medium hover:bg-accent"
                    >
                      Đăng nhập với {provider.id === "google" ? "Google" : "Make.com"}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {!allowPasswordLogin && oauthProviders.length === 0 && (
              <p className="mt-4 text-xs text-destructive" role="alert">
                Chưa có nhà cung cấp OAuth nào được cấu hình. Quản trị viên cần
                kiểm tra biến môi trường phía server.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
