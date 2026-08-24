import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigurationError, ValidationError } from "@/domain/shared/app-error";
import { Vault } from "@/lib/vault";

describe("Vault", () => {
  it("round-trips AES-256-GCM ciphertext with authenticated context", () => {
    const vault = new Vault(randomBytes(32).toString("hex"));
    const encrypted = vault.encrypt("wordpress-application-password", "project-1");

    expect(encrypted).not.toContain("wordpress-application-password");
    expect(vault.decrypt(encrypted, "project-1")).toBe(
      "wordpress-application-password",
    );
  });

  it("rejects tampered ciphertext and mismatched authenticated context", () => {
    const vault = new Vault(randomBytes(32).toString("base64"));
    const encrypted = vault.encrypt("sensitive", "project-1");
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("a") ? "b" : "a"}`;

    expect(() => vault.decrypt(tampered, "project-1")).toThrow(ValidationError);
    expect(() => vault.decrypt(encrypted, "project-2")).toThrow(ValidationError);
  });

  it("rejects invalid keys and empty plaintext instead of using a fallback", () => {
    expect(() => new Vault("development-default-secret")).toThrow(
      ConfigurationError,
    );

    const vault = new Vault(randomBytes(32).toString("hex"));
    expect(() => vault.encrypt("")).toThrow(ValidationError);
  });
});
