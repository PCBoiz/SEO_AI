import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { ConfigurationError } from "@/domain/shared/app-error";
import * as schema from "@/lib/db/postgres-schema";

export type NeonApplicationDatabase = NeonHttpDatabase<typeof schema>;

export class NeonDatabaseAdapter {
  readonly kind = "neon" as const;
  readonly db: NeonApplicationDatabase;

  constructor(databaseUrl: string) {
    const value = databaseUrl.trim();
    if (!/^postgres(?:ql)?:\/\//i.test(value)) {
      throw new ConfigurationError(
        "DATABASE_DIALECT_MISMATCH",
        "Neon requires a PostgreSQL DATABASE_URL.",
      );
    }
    this.db = drizzle(neon(value), { schema });
  }

  async isReady(): Promise<boolean> {
    const result = await this.db.execute<{ ready: number }>("select 1 as ready");
    return Number(result.rows[0]?.ready) === 1;
  }
}
