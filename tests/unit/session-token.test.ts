import { randomBytes, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import { SessionTokenCodec } from "@/infrastructure/auth/session-token";

describe("SessionTokenCodec", () => {
  it("signs and verifies a minimal session identity", async () => {
    const codec = new SessionTokenCodec(randomBytes(32));
    const payload = {
      sessionId: randomUUID(),
      userId: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    };

    const token = await codec.encode(payload);
    const decoded = await codec.decode(token);

    expect(decoded).toMatchObject({
      sessionId: payload.sessionId,
      userId: payload.userId,
    });
  });

  it("rejects tampered tokens and weak secrets", async () => {
    expect(() => new SessionTokenCodec("short-secret")).toThrow(
      ConfigurationError,
    );

    const codec = new SessionTokenCodec(randomBytes(32));
    const token = await codec.encode({
      sessionId: randomUUID(),
      userId: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const parts = token.split(".");
    const signature = parts[2];
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    await expect(
      codec.decode(`${parts[0]}.${parts[1]}.${tamperedSignature}`),
    ).resolves.toBeNull();
  });
});
