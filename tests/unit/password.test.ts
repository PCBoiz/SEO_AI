import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/app-error";
import { hashPassword, verifyPassword } from "@/infrastructure/auth/password";

describe("password hashing", () => {
  it("hashes with a random salt and verifies in constant-time comparison", async () => {
    const password = "correct horse battery staple!";
    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password value", firstHash)).resolves.toBe(
      false,
    );
  });

  it("rejects short passwords and malformed hashes", async () => {
    await expect(hashPassword("too-short")).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(verifyPassword("valid-long-password", "malformed")).resolves.toBe(
      false,
    );
  });
});
