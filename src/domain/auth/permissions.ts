import { AuthorizationError } from "@/domain/shared/app-error";

export const workspaceRoles = ["owner", "editor", "viewer"] as const;
export type WorkspaceRole = (typeof workspaceRoles)[number];

export const workspacePermissions = [
  "workspace.read",
  "workspace.update",
  "workspace.members.manage",
  "workspace.secrets.manage",
  "project.create",
  "project.update",
  "project.delete",
  "pipeline.edit",
  "pipeline.run",
  "pipeline.delete",
  "job.retry",
  "job.cancel",
  "prompt.edit",
  "output.publish",
  "output.delete",
  "integration.manage",
] as const;

export type WorkspacePermission = (typeof workspacePermissions)[number];

const editorPermissions: ReadonlySet<WorkspacePermission> = new Set([
  "workspace.read",
  "project.create",
  "project.update",
  "pipeline.edit",
  "pipeline.run",
  "job.retry",
  "job.cancel",
  "prompt.edit",
  "output.publish",
  "integration.manage",
]);

const viewerPermissions: ReadonlySet<WorkspacePermission> = new Set([
  "workspace.read",
]);

export function roleHasPermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
): boolean {
  if (role === "owner") {
    return true;
  }
  if (role === "editor") {
    return editorPermissions.has(permission);
  }
  return viewerPermissions.has(permission);
}

export function assertRolePermission(
  role: WorkspaceRole,
  permission: WorkspacePermission,
): void {
  if (!roleHasPermission(role, permission)) {
    throw new AuthorizationError();
  }
}
