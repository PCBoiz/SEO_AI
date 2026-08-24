import { AppShell } from "@/components/layout/app-shell";
import { requirePageIdentity } from "@/lib/auth/dal";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await requirePageIdentity();
  return <AppShell identity={identity}>{children}</AppShell>;
}
