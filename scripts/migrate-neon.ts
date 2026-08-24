import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { z } from "zod";

loadEnvConfig(process.cwd());

const environment = z
  .object({
    DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//i),
    MIGRATOR_DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\//i)
      .optional(),
    BRIDGE_DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\//i)
      .optional(),
    BRIDGE_MIGRATOR_DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\//i)
      .optional(),
  })
  .parse(process.env);

async function migrateNeon(): Promise<void> {
  const appDatabase = drizzle(
    neon(environment.MIGRATOR_DATABASE_URL ?? environment.DATABASE_URL),
  );
  await migrate(appDatabase, {
    migrationsFolder: "drizzle-postgres",
    migrationsSchema: "drizzle_app",
    migrationsTable: "__antigravity_app_migrations",
  });

  const bridgeDatabase = drizzle(
    neon(
      environment.BRIDGE_MIGRATOR_DATABASE_URL ??
        environment.BRIDGE_DATABASE_URL ??
        environment.MIGRATOR_DATABASE_URL ??
        environment.DATABASE_URL,
    ),
  );
  await migrate(bridgeDatabase, {
    migrationsFolder: "drizzle-bridge",
    migrationsSchema: "drizzle_bridge",
    migrationsTable: "__antigravity_bridge_migrations",
  });
  console.log("Applied Antigravity app and Module 1 bridge migrations to Neon.");
}

void migrateNeon();
