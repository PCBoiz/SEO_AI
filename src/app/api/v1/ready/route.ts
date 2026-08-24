import { Vault } from "@/lib/vault";
import { databaseAdapter } from "@/lib/db";
import { parseServerEnvironment } from "@/infrastructure/config/environment";
import { logger } from "@/infrastructure/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const checks = {
    database: false,
    vault: false,
    auth: false,
    automationProvider: "mock" as const,
    storageProvider: "local" as "local" | "vercel_blob",
  };

  try {
    const environment = parseServerEnvironment();
    checks.database = await databaseAdapter.isReady();
    new Vault(environment.VAULT_ENCRYPTION_KEY);
    checks.vault = true;
    checks.auth = Boolean(
      environment.AUTH_SESSION_SECRET || environment.NODE_ENV !== "production",
    );
    checks.storageProvider = environment.STORAGE_PROVIDER;

    const ready = checks.database && checks.vault && checks.auth;
    return Response.json(
      {
        status: ready ? "ready" : "not_ready",
        checks,
        timestamp: new Date().toISOString(),
      },
      {
        status: ready ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    logger.error(
      { errorType: error instanceof Error ? error.name : "unknown" },
      "Readiness check failed",
    );
    return Response.json(
      {
        status: "not_ready",
        checks,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
