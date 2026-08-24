import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

interface TopbarProps {
  identity: AuthenticatedIdentity;
  actions?: React.ReactNode;
}

export function Topbar({ identity, actions }: TopbarProps) {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3 backdrop-blur-xl sm:px-6"
      style={{ background: "var(--glass-bg-strong)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MobileNavigation />
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
