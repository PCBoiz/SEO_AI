import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuroraBackground } from "@/components/layout/aurora-background";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { layCheDo } from "@/lib/che-do-don-gian.server";

interface AppShellProps {
  children: React.ReactNode;
  identity: AuthenticatedIdentity;
  topbarActions?: React.ReactNode;
}

export async function AppShell({ children, identity, topbarActions }: AppShellProps) {
  // Đọc chế độ ở MÁY CHỦ để sidebar dựng ra đúng ngay từ đầu — xem ghi chú
  // trong `lib/che-do-don-gian.ts` về việc vì sao không dùng localStorage.
  const cheDo = await layCheDo();
  return (
    <div className="relative flex h-dvh min-h-0">
      <AuroraBackground />
      <Sidebar identity={identity} cheDo={cheDo} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar identity={identity} actions={topbarActions} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
