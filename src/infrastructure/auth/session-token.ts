import { SignJWT, jwtVerify } from "jose";
import { ConfigurationError } from "@/domain/shared/app-error";

const SESSION_ALGORITHM = "HS256";
const SESSION_ISSUER = "antigravity-os";
const SESSION_AUDIENCE = "antigravity-os-session";

export interface SessionTokenPayload {
  sessionId: string;
  userId: string;
  expiresAt: Date;
}

export class SessionTokenCodec {
  private readonly key: Uint8Array;

  constructor(secret: string | Uint8Array) {
    const key =
      typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
    if (key.byteLength < 32) {
      throw new ConfigurationError(
        "INVALID_AUTH_SESSION_SECRET",
        "AUTH_SESSION_SECRET must contain at least 32 bytes.",
      );
    }
    this.key = key;
  }

  async encode(payload: SessionTokenPayload): Promise<string> {
    return new SignJWT({
      sessionId: payload.sessionId,
      userId: payload.userId,
    })
      .setProtectedHeader({ alg: SESSION_ALGORITHM, typ: "JWT" })
      .setIssuer(SESSION_ISSUER)
      .setAudience(SESSION_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(payload.expiresAt.getTime() / 1000))
      .sign(this.key);
  }

  async decode(token: string | undefined): Promise<SessionTokenPayload | null> {
    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: [SESSION_ALGORITHM],
        issuer: SESSION_ISSUER,
        audience: SESSION_AUDIENCE,
      });

      if (
        typeof payload.sessionId !== "string" ||
        typeof payload.userId !== "string" ||
        typeof payload.exp !== "number"
      ) {
        return null;
      }

      return {
        sessionId: payload.sessionId,
        userId: payload.userId,
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch {
      return null;
    }
  }
}
