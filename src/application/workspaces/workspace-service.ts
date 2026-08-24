import type { WorkspaceRole } from "@/domain/auth/permissions";
import { assertRolePermission } from "@/domain/auth/permissions";
import { NotFoundError } from "@/domain/shared/app-error";
import { parseUpdateWorkspaceInput } from "@/domain/workspaces/workspace";
import type {
  WorkspaceRepository,
  WorkspaceSettings,
} from "@/domain/workspaces/workspace-repository";

interface WorkspaceActor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export class WorkspaceService {
  constructor(private readonly repository: WorkspaceRepository) {}

  async get(actor: WorkspaceActor): Promise<WorkspaceSettings> {
    assertRolePermission(actor.role, "workspace.read");
    const workspace = await this.repository.get(actor.workspaceId);
    if (!workspace) throw workspaceNotFound();
    return workspace;
  }

  async update(actor: WorkspaceActor, rawInput: unknown): Promise<WorkspaceSettings> {
    assertRolePermission(actor.role, "workspace.update");
    const input = parseUpdateWorkspaceInput(rawInput);
    const workspace = await this.repository.update(
      actor.workspaceId,
      input,
      actor.userId,
      new Date(),
    );
    if (!workspace) throw workspaceNotFound();
    return workspace;
  }
}

function workspaceNotFound(): NotFoundError {
  return new NotFoundError(
    "WORKSPACE_NOT_FOUND",
    "Workspace hiện tại không còn tồn tại.",
  );
}
