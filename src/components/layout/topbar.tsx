import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import type { CheDo } from "@/lib/che-do-don-gian";

interface TopbarProps {
  identity: AuthenticatedIdentity;
  actions?: React.ReactNode;
  cheDo: CheDo;
}

export function Topbar({ identity, actions, cheDo }: TopbarProps) {
  return (
    <header
      // `sticky top-0` CHỈ có ý nghĩa sau khi khung ứng dụng cho trang tự
      // cuộn trên điện thoại. Thiếu nó thì nút mở điều hướng — thứ duy nhất
      // dẫn sang màn hình khác — trôi mất khi cuộn xuống, và muốn đi đâu
      // cũng phải cuộn ngược lên đầu trang.
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border px-3 backdrop-blur-xl sm:px-6 md:relative"
      style={{ background: "var(--glass-bg-strong)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MobileNavigation cheDo={cheDo} />
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {identity.displayName}
        </span>
        {actions}
        <ThemeToggle />
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" title="Đăng xuất">
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only">Đăng xuất</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
