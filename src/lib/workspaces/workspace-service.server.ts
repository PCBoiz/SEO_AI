import "server-only";

import { WorkspaceService } from "@/application/workspaces/workspace-service";
import { NeonWorkspaceRepository } from "@/infrastructure/workspaces/neon-workspace-repository";
import { SqliteWorkspaceRepository } from "@/infrastructure/workspaces/sqlite-workspace-repository";
import { databaseAdapter } from "@/lib/db";

let service: WorkspaceService | undefined;

export function getWorkspaceService(): WorkspaceService {
  service ??= new WorkspaceService(
    databaseAdapter.kind === "neon"
      ? new NeonWorkspaceRepository(databaseAdapter.db)
      : new SqliteWorkspaceRepository(databaseAdapter.db),
  );
  return service;
}
