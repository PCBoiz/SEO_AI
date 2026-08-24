import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import { parseServerEnvironment } from "@/infrastructure/config/environment";

const vaultKey = randomBytes(32).toString("hex");

describe("parseServerEnvironment", () => {
  it("accepts local development defaults with a valid vault key", () => {
    const environment = parseServerEnvironment({
      NODE_ENV: "development",
      VAULT_ENCRYPTION_KEY: vaultKey,
    });

    expect(environment.DATABASE_URL).toBe("local.db");
    expect(environment.STORAGE_LOCAL_ROOT).toBe(".data/storage");
  });

  it("requires an independent session secret in production", () => {
    expect(() =>
      parseServerEnvironment({
        NODE_ENV: "production",
        VAULT_ENCRYPTION_KEY: vaultKey,
      }),
    ).toThrow(ConfigurationError);
  });
});
