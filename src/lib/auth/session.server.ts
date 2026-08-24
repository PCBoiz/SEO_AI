import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { ConfigurationError } from "@/domain/shared/app-error";
import { SessionTokenCodec } from "@/infrastructure/auth/session-token";
import { databaseAdapter } from "@/lib/db";
import { pgSessions } from "@/lib/db/postgres-schema";
import { sessions } from "@/lib/db/schema";

export const SESSION_COOKIE_NAME = "antigravity_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

let tokenCodec: SessionTokenCodec | undefined;

export async function createSession(userId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);
  const sessionId = randomUUID();

  const values = {
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
    lastSeenAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db.insert(pgSessions).values(values);
  } else {
    await databaseAdapter.db.insert(sessions).values(values);
  }

  const token = await getTokenCodec().encode({
    sessionId,
    userId,
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await getTokenCodec().decode(token);

  if (payload) {
    if (databaseAdapter.kind === "neon") {
      await databaseAdapter.db
        .update(pgSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(pgSessions.id, payload.sessionId),
            eq(pgSessions.userId, payload.userId),
            isNull(pgSessions.revokedAt),
          ),
        );
    } else {
      await databaseAdapter.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.id, payload.sessionId),
            eq(sessions.userId, payload.userId),
            isNull(sessions.revokedAt),
          ),
        );
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function readSessionToken() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return getTokenCodec().decode(token);
}

function getTokenCodec(): SessionTokenCodec {
  if (tokenCodec) {
    return tokenCodec;
  }

  const explicitSecret = process.env.AUTH_SESSION_SECRET?.trim();
  if (explicitSecret) {
    tokenCodec = new SessionTokenCodec(explicitSecret);
    return tokenCodec;
  }

  if (process.env.NODE_ENV === "production") {
    throw new ConfigurationError(
      "AUTH_SESSION_SECRET_MISSING",
      "AUTH_SESSION_SECRET is required in production.",
    );
  }

  const vaultKey = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!vaultKey) {
    throw new ConfigurationError(
      "AUTH_SESSION_SECRET_MISSING",
      "AUTH_SESSION_SECRET or VAULT_ENCRYPTION_KEY is required for local sessions.",
    );
  }

  const derivedKey = createHash("sha256")
    .update("antigravity-os/session/v1\0", "utf8")
    .update(vaultKey, "utf8")
    .digest();
  tokenCodec = new SessionTokenCodec(derivedKey);
  return tokenCodec;
}
