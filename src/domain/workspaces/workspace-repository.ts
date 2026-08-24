import type { UpdateWorkspaceInput } from "@/domain/workspaces/workspace";

export interface WorkspaceSettings {
  id: string;
  name: string;
  slug: string;
  members: Array<{
    userId: string;
    displayName: string;
    email: string;
    role: "owner" | "editor" | "viewer";
  }>;
  updatedAt: Date;
}

export interface WorkspaceRepository {
  get(id: string): Promise<WorkspaceSettings | null>;
  update(
    id: string,
    input: UpdateWorkspaceInput,
    actorUserId: string,
    now: Date,
  ): Promise<WorkspaceSettings | null>;
}
