import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";

async function main(): Promise<void> {
  const dataRoot = path.resolve(".data");
  const databasePath = path.join(dataRoot, "e2e.db");
  const credentialsPath = path.join(dataRoot, "e2e-credentials.json");
  await mkdir(dataRoot, { recursive: true });

  for (const target of [
    databasePath,
    `${databasePath}-shm`,
    `${databasePath}-wal`,
    credentialsPath,
  ]) {
    assertInsideDataRoot(target, dataRoot);
    await rm(target, { force: true });
  }

  const adapter = new SqliteDatabaseAdapter(databasePath);
  try {
    migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  } finally {
    adapter.close();
  }

  process.env.ANTIGRAVITY_SEED_LIBRARY = "1";
  const { seedLocalData } = await import("./seed");
  await seedLocalData({ databaseUrl: databasePath, credentialsPath });
}

function assertInsideDataRoot(target: string, dataRoot: string): void {
  if (path.dirname(path.resolve(target)) !== dataRoot) {
    throw new Error("E2E cleanup target escaped the workspace .data directory.");
  }
}

void main();
