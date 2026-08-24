import "server-only";
import { ConfigurationError } from "@/domain/shared/app-error";
import { NeonDatabaseAdapter } from "@/infrastructure/database/neon-adapter";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";

const databaseUrl = process.env.DATABASE_URL ?? "local.db";
const usesNeon = /^postgres(?:ql)?:\/\//i.test(databaseUrl.trim());
const databaseAdapter = usesNeon
  ? new NeonDatabaseAdapter(databaseUrl)
  : new SqliteDatabaseAdapter(databaseUrl);

export { databaseAdapter };

export function getSqliteDatabase() {
  if (databaseAdapter.kind !== "sqlite") {
    throw new ConfigurationError(
      "DATABASE_DIALECT_MISMATCH",
      "SQLite persistence was requested while Neon is active.",
    );
  }
  return databaseAdapter.db;
}

export function getNeonDatabase() {
  if (databaseAdapter.kind !== "neon") {
    throw new ConfigurationError(
      "DATABASE_DIALECT_MISMATCH",
      "Neon persistence was requested while SQLite is active.",
    );
  }
  return databaseAdapter.db;
}
