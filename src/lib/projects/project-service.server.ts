import "server-only";

import { ProjectService } from "@/application/projects/project-service";
import { NeonProjectRepository } from "@/infrastructure/projects/neon-project-repository";
import { SqliteProjectRepository } from "@/infrastructure/projects/sqlite-project-repository";
import { parseServerEnvironment } from "@/infrastructure/config/environment";
import { databaseAdapter } from "@/lib/db";
import { Vault } from "@/lib/vault";

let service: ProjectService | undefined;

export function getProjectService(): ProjectService {
  if (!service) {
    const environment = parseServerEnvironment();
    const repository =
      databaseAdapter.kind === "neon"
        ? new NeonProjectRepository(databaseAdapter.db)
        : new SqliteProjectRepository(databaseAdapter.db);
    service = new ProjectService(
      repository,
      new Vault(environment.VAULT_ENCRYPTION_KEY),
    );
  }
  return service;
}
