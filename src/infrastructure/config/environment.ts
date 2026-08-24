import { z } from "zod";
import { ConfigurationError } from "@/domain/shared/app-error";

const optionalUrl = z.union([z.url(), z.literal("")]).optional();

const serverEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_RUNTIME: z.enum(["local", "vercel"]).default("local"),
    DATABASE_URL: z.string().min(1).default("local.db"),
    VAULT_ENCRYPTION_KEY: z.string().min(1),
    AUTH_SESSION_SECRET: z.string().min(32).optional(),
    STORAGE_PROVIDER: z.enum(["local", "vercel_blob"]).default("local"),
    STORAGE_LOCAL_ROOT: z.string().min(1).default(".data/storage"),
    VERCEL_BLOB_ACCESS: z.enum(["private", "public"]).default("private"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    SENTRY_DSN: optionalUrl,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === "production" && !environment.AUTH_SESSION_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["AUTH_SESSION_SECRET"],
        message: "AUTH_SESSION_SECRET is required in production.",
      });
    }
    if (environment.APP_RUNTIME === "vercel" && environment.STORAGE_PROVIDER !== "vercel_blob") {
      context.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "Production requires durable Vercel Blob storage.",
      });
    }
    if (
      environment.APP_RUNTIME === "vercel" &&
      !/^postgres(?:ql)?:\/\//i.test(environment.DATABASE_URL)
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Vercel runtime requires a durable Neon PostgreSQL URL.",
      });
    }
  });

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function parseServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigurationError(
      "INVALID_ENVIRONMENT",
      "Server environment configuration is invalid.",
      {
        fields: result.error.issues.map((issue) => issue.path.join(".")),
      },
    );
  }
  return result.data;
}
