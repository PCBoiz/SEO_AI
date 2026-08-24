import "server-only";

import { ModuleJobService } from "@/application/modules/module-service";
import { NeonProjectRepository } from "@/infrastructure/projects/neon-project-repository";
import { SqliteProjectRepository } from "@/infrastructure/projects/sqlite-project-repository";
import { databaseAdapter } from "@/lib/db";
import { getModuleJobRepository } from "@/lib/modules/module-engine.server";
import "@/domain/modules/registry";

export function getModuleJobService(): ModuleJobService {
  const projects =
    databaseAdapter.kind === "neon"
      ? new NeonProjectRepository(databaseAdapter.db)
      : new SqliteProjectRepository(databaseAdapter.db);
  return new ModuleJobService(getModuleJobRepository(), projects);
}
