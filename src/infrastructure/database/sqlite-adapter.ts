import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { ConfigurationError } from "@/domain/shared/app-error";
import * as schema from "@/lib/db/schema";

export type ApplicationDatabase = BetterSQLite3Database<typeof schema>;

export class SqliteDatabaseAdapter {
  readonly kind = "sqlite" as const;
  readonly client: Database.Database;
  readonly db: ApplicationDatabase;

  constructor(databaseUrl = "local.db") {
    const filename = resolveSqliteFilename(databaseUrl);
    this.client = new Database(filename);
    this.client.pragma("foreign_keys = ON");
    this.client.pragma("busy_timeout = 5000");
    this.db = drizzle(this.client, { schema });
  }

  isReady(): boolean {
    const result = this.client.prepare("select 1 as ready").get() as
      | { ready: number }
      | undefined;
    return result?.ready === 1;
  }

  close(): void {
    if (this.client.open) {
      this.client.close();
    }
  }
}

export function resolveSqliteFilename(databaseUrl: string): string {
  const value = databaseUrl.trim();
  if (!value) {
    throw new ConfigurationError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL must point to a local SQLite file.",
    );
  }

  if (value === ":memory:") {
    return value;
  }

  if (value.includes("://") && !value.startsWith("file://")) {
    throw new ConfigurationError(
      "DATABASE_DIALECT_MISMATCH",
      "The local SQLite adapter cannot open a non-SQLite DATABASE_URL.",
    );
  }

  if (value.startsWith("file://")) {
    return fileURLToPath(value);
  }

  return path.resolve(value);
}
