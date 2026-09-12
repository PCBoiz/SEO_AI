import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getWorkspaceService } from "@/lib/workspaces/workspace-service.server";
import { WorkspaceSettingsForm } from "@/app/(app)/settings/workspace-settings-form";
import { OAuthConnections } from "@/app/(app)/settings/oauth-connections";
import { listOAuthConnectionSummaries } from "@/lib/auth/oauth.server";
import { KetNoiGitHub } from "@/app/(app)/settings/ket-noi-github";
import { ketNoiGitHub } from "@/lib/dung-web/github.server";

const successMessages: Record<string, string> = {
  link_success: "Đã liên kết tài khoản OAuth để đăng nhập.",
  connect_success: "Đã mã hóa và lưu kết nối OAuth cho tự động hóa.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; oauth_error?: string }>;
}) {
  const identity = await requirePageIdentity();
  const [workspace, connections, query, github] = await Promise.all([
    getWorkspaceService().get(identity),
    listOAuthConnectionSummaries(identity),
    searchParams,
    ketNoiGitHub(identity).catch(() => null),
  ]);
  const notice = query.oauth_error
    ? {
        kind: "error" as const,
        message: `Kết nối OAuth chưa hoàn tất (${query.oauth_error}).`,
      }
    : query.oauth && successMessages[query.oauth]
      ? { kind: "success" as const, message: successMessages[query.oauth] }
      : undefined;
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <WorkspaceSettingsForm
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          members: workspace.members,
        }}
        canEdit={roleHasPermission(identity.role, "workspace.update")}
      />
      <OAuthConnections
        connections={connections}
        canManageIntegrations={roleHasPermission(identity.role, "integration.manage")}
        notice={notice}
      />
      <KetNoiGitHub banDau={github} canManage={roleHasPermission(identity.role, "pipeline.run")} />
    </div>
  );
}
