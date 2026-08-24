import "server-only";

import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { z } from "zod";
import type {
  OAuthConnectionSummary,
  OAuthIntent,
  OAuthProviderId,
} from "@/domain/auth/oauth";
import {
  AuthenticationError,
  ConfigurationError,
  ConflictError,
  ValidationError,
} from "@/domain/shared/app-error";
import { assertRolePermission } from "@/domain/auth/permissions";
import {
  getOAuthProviderConfiguration,
  getOAuthProviderStatuses,
  type OAuthProviderConfiguration,
} from "@/infrastructure/config/oauth-environment";
import { logger } from "@/infrastructure/observability/logger";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { createSession } from "@/lib/auth/session.server";
import { databaseAdapter } from "@/lib/db";
import {
  pgAuthAccounts,
  pgOauthConnections,
  pgUsers,
} from "@/lib/db/postgres-schema";
import {
  authAccounts,
  oauthConnections,
  users,
} from "@/lib/db/schema";
import { Vault } from "@/lib/vault";

const TRANSACTION_MAX_AGE_SECONDS = 10 * 60;
const OAUTH_FETCH_TIMEOUT_MS = 15_000;

const transactionSchema = z.object({
  version: z.literal(1),
  provider: z.enum(["google", "make"]),
  intent: z.enum(["login", "link", "connect"]),
  state: z.string().min(32),
  nonce: z.string().min(32),
  codeVerifier: z.string().min(43),
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  expiresAt: z.string().datetime(),
});

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  token_type: z.string().optional(),
  expires_in: z.coerce.number().int().positive().optional(),
  scope: z.string().optional(),
  id_token: z.string().min(1),
});

interface OAuthProfile {
  subject: string;
  email?: string;
  displayName?: string;
}

type OAuthTransaction = z.infer<typeof transactionSchema>;

const remoteJwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
const openIdConfigurationSchema = z.object({
  issuer: z.url(),
  jwks_uri: z.url(),
});

export async function beginOAuth(
  provider: OAuthProviderId,
  intent: OAuthIntent,
  identity: AuthenticatedIdentity | null,
): Promise<string> {
  if (intent !== "login" && !identity) {
    throw new AuthenticationError();
  }
  if (intent === "connect" && identity) {
    assertRolePermission(identity.role, "integration.manage");
  }

  const configuration = getOAuthProviderConfiguration(provider, intent);
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier, "ascii")
    .digest("base64url");
  const transaction: OAuthTransaction = {
    version: 1,
    provider,
    intent,
    state,
    nonce,
    codeVerifier,
    userId: identity?.userId,
    workspaceId: identity?.workspaceId,
    expiresAt: new Date(
      Date.now() + TRANSACTION_MAX_AGE_SECONDS * 1000,
    ).toISOString(),
  };

  const cookieName = getTransactionCookieName(provider);
  const vault = getVault();
  const cookieStore = await cookies();
  cookieStore.set(
    cookieName,
    vault.encrypt(JSON.stringify(transaction), cookieName),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/api/v1/oauth/${provider}`,
      maxAge: TRANSACTION_MAX_AGE_SECONDS,
      priority: "high",
    },
  );

  const authorizationUrl = new URL(configuration.authorizationEndpoint);
  authorizationUrl.searchParams.set("client_id", configuration.clientId);
  authorizationUrl.searchParams.set("redirect_uri", configuration.redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", configuration.scopes.join(" "));
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);
  authorizationUrl.searchParams.set("code_challenge", codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    authorizationUrl.searchParams.set("include_granted_scopes", "true");
    authorizationUrl.searchParams.set(
      "prompt",
      intent === "connect" ? "consent" : "select_account",
    );
    if (intent === "connect") {
      authorizationUrl.searchParams.set("access_type", "offline");
    }
  }

  return authorizationUrl.toString();
}

export async function completeOAuth(
  provider: OAuthProviderId,
  searchParams: URLSearchParams,
  identity: AuthenticatedIdentity | null,
): Promise<{ redirectPath: string; intent: OAuthIntent }> {
  const transaction = await consumeTransaction(provider);
  const error = searchParams.get("error");
  if (error) {
    throw new ValidationError(
      "OAUTH_PROVIDER_REJECTED",
      "Nhà cung cấp OAuth đã từ chối hoặc hủy yêu cầu.",
      { provider, providerError: error },
    );
  }

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (!state || !safeEqual(state, transaction.state) || !code) {
    throw new ValidationError(
      "INVALID_OAUTH_CALLBACK",
      "OAuth callback thiếu mã hoặc state không hợp lệ.",
    );
  }
  if (new Date(transaction.expiresAt) <= new Date()) {
    throw new ValidationError(
      "OAUTH_TRANSACTION_EXPIRED",
      "Phiên kết nối OAuth đã hết hạn. Vui lòng thử lại.",
    );
  }
  if (
    transaction.intent !== "login" &&
    (!identity ||
      identity.userId !== transaction.userId ||
      identity.workspaceId !== transaction.workspaceId)
  ) {
    throw new AuthenticationError(
      "Phiên đăng nhập đã thay đổi trong lúc kết nối OAuth.",
    );
  }

  const configuration = getOAuthProviderConfiguration(
    provider,
    transaction.intent,
  );
  const tokens = await exchangeAuthorizationCode(
    configuration,
    code,
    transaction.codeVerifier,
  );
  const profile = await verifyIdentityToken(
    configuration,
    tokens.id_token,
    transaction.nonce,
  );

  if (transaction.intent === "login") {
    let account = await findLinkedAccount(provider, profile.subject);
    if (!account && provider === "google") {
      account = await bootstrapGoogleLogin(profile);
    }
    if (!account) {
      throw new AuthenticationError(
        "Tài khoản OAuth này chưa được liên kết. Hãy đăng nhập local rồi liên kết trong Cài đặt.",
      );
    }
    const loginUpdate = {
      providerEmail: profile.email,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };
    if (databaseAdapter.kind === "neon") {
      await databaseAdapter.db
        .update(pgAuthAccounts)
        .set(loginUpdate)
        .where(eq(pgAuthAccounts.id, account.accountId));
    } else {
      await databaseAdapter.db
        .update(authAccounts)
        .set(loginUpdate)
        .where(eq(authAccounts.id, account.accountId));
    }
    await createSession(account.userId);
    return { redirectPath: "/dashboard?oauth=login_success", intent: "login" };
  }

  if (!identity) {
    throw new AuthenticationError();
  }

  if (transaction.intent === "link") {
    await linkLoginAccount(identity.userId, provider, profile);
    return { redirectPath: "/settings?oauth=link_success", intent: "link" };
  }

  await saveAutomationConnection(identity, provider, profile, configuration, tokens);
  return { redirectPath: "/settings?oauth=connect_success", intent: "connect" };
}

async function bootstrapGoogleLogin(
  profile: OAuthProfile,
): Promise<{ accountId: string; userId: string } | undefined> {
  const allowedEmail = process.env.OAUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!allowedEmail || profile.email !== allowedEmail) return undefined;

  const [user] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ id: pgUsers.id, status: pgUsers.status })
          .from(pgUsers)
          .where(eq(pgUsers.email, allowedEmail))
          .limit(1)
      : await databaseAdapter.db
          .select({ id: users.id, status: users.status })
          .from(users)
          .where(eq(users.email, allowedEmail))
          .limit(1);
  if (!user || user.status !== "active") return undefined;

  await linkLoginAccount(user.id, "google", profile);
  return findLinkedAccount("google", profile.subject);
}

export async function listOAuthConnectionSummaries(
  identity: AuthenticatedIdentity,
): Promise<OAuthConnectionSummary[]> {
  const [linkedRows, connectionRows] =
    databaseAdapter.kind === "neon"
      ? await Promise.all([
          databaseAdapter.db
            .select({
              provider: pgAuthAccounts.provider,
              providerEmail: pgAuthAccounts.providerEmail,
            })
            .from(pgAuthAccounts)
            .where(eq(pgAuthAccounts.userId, identity.userId)),
          databaseAdapter.db
            .select({
              provider: pgOauthConnections.provider,
              providerEmail: pgOauthConnections.providerEmail,
              displayLabel: pgOauthConnections.displayLabel,
              scopes: pgOauthConnections.scopes,
              status: pgOauthConnections.status,
              expiresAt: pgOauthConnections.accessTokenExpiresAt,
            })
            .from(pgOauthConnections)
            .where(
              and(
                eq(pgOauthConnections.workspaceId, identity.workspaceId),
                eq(pgOauthConnections.userId, identity.userId),
              ),
            ),
        ])
      : await Promise.all([
          databaseAdapter.db
            .select({
              provider: authAccounts.provider,
              providerEmail: authAccounts.providerEmail,
            })
            .from(authAccounts)
            .where(eq(authAccounts.userId, identity.userId)),
          databaseAdapter.db
            .select({
              provider: oauthConnections.provider,
              providerEmail: oauthConnections.providerEmail,
              displayLabel: oauthConnections.displayLabel,
              scopes: oauthConnections.scopes,
              status: oauthConnections.status,
              expiresAt: oauthConnections.accessTokenExpiresAt,
            })
            .from(oauthConnections)
            .where(
              and(
                eq(oauthConnections.workspaceId, identity.workspaceId),
                eq(oauthConnections.userId, identity.userId),
              ),
            ),
        ]);
  const statuses = getOAuthProviderStatuses();

  return statuses.map((status) => {
    const linked = linkedRows.find((row) => row.provider === status.id);
    const connection = connectionRows.find(
      (row) =>
        row.provider ===
        (status.id === "google" ? "google_workspace" : "make"),
    );
    return {
      provider: status.id,
      configured: status.configured,
      automationConfigured:
        status.configured &&
        (status.id !== "make" || status.automationScopesConfigured),
      linkedForLogin: Boolean(linked),
      connectedForAutomation: connection?.status === "active",
      accountLabel:
        connection?.displayLabel ??
        connection?.providerEmail ??
        linked?.providerEmail ??
        undefined,
      scopes: connection?.scopes ?? [],
      status: connection?.status,
      expiresAt: connection?.expiresAt?.toISOString(),
    };
  });
}

async function consumeTransaction(
  provider: OAuthProviderId,
): Promise<OAuthTransaction> {
  const cookieName = getTransactionCookieName(provider);
  const cookieStore = await cookies();
  const encrypted = cookieStore.get(cookieName)?.value;
  cookieStore.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/v1/oauth/${provider}`,
    maxAge: 0,
    priority: "high",
  });
  if (!encrypted) {
    throw new ValidationError(
      "OAUTH_TRANSACTION_MISSING",
      "Không tìm thấy phiên OAuth. Vui lòng bắt đầu lại.",
    );
  }

  try {
    const plaintext = getVault().decrypt(encrypted, cookieName);
    return transactionSchema.parse(JSON.parse(plaintext));
  } catch (cause) {
    logger.warn(
      { provider, causeType: cause instanceof Error ? cause.name : "unknown" },
      "OAuth transaction could not be verified",
    );
    throw new ValidationError(
      "INVALID_OAUTH_TRANSACTION",
      "Phiên OAuth không hợp lệ. Vui lòng bắt đầu lại.",
    );
  }
}

async function exchangeAuthorizationCode(
  configuration: OAuthProviderConfiguration,
  code: string,
  codeVerifier: string,
) {
  const response = await fetch(configuration.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: configuration.redirectUri,
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      code_verifier: codeVerifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new AuthenticationError("Không thể đổi mã OAuth thành token.");
  }
  return tokenResponseSchema.parse(await response.json());
}

async function verifyIdentityToken(
  configuration: OAuthProviderConfiguration,
  idToken: string,
  expectedNonce: string,
): Promise<OAuthProfile> {
  const verification = await resolveIdentityVerification(configuration);
  let jwks = remoteJwks.get(verification.jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(verification.jwksUri), {
      timeoutDuration: OAUTH_FETCH_TIMEOUT_MS,
    });
    remoteJwks.set(verification.jwksUri, jwks);
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    audience: configuration.clientId,
    issuer: verification.issuer,
  });
  if (
    typeof payload.sub !== "string" ||
    typeof payload.nonce !== "string" ||
    !safeEqual(payload.nonce, expectedNonce)
  ) {
    throw new AuthenticationError("Danh tính OAuth không hợp lệ.");
  }
  if (configuration.id === "google" && payload.email_verified !== true) {
    throw new AuthenticationError("Email Google chưa được xác minh.");
  }

  return {
    subject: payload.sub,
    email:
      typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    displayName: typeof payload.name === "string" ? payload.name : undefined,
  };
}

async function resolveIdentityVerification(
  configuration: OAuthProviderConfiguration,
): Promise<{ issuer: string | string[]; jwksUri: string }> {
  if (!configuration.discoveryEndpoint) {
    return { issuer: configuration.issuer, jwksUri: configuration.jwksUri };
  }

  const response = await fetch(configuration.discoveryEndpoint, {
    cache: "no-store",
    signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new AuthenticationError("Không thể tải metadata OIDC chính thức.");
  }
  const metadata = openIdConfigurationSchema.parse(await response.json());
  const issuer = new URL(metadata.issuer);
  const jwks = new URL(metadata.jwks_uri);
  if (
    issuer.protocol !== "https:" ||
    jwks.protocol !== "https:" ||
    issuer.hostname !== "www.make.com" ||
    jwks.hostname !== "www.make.com"
  ) {
    throw new AuthenticationError("Metadata OIDC Make không đúng origin tin cậy.");
  }
  return { issuer: metadata.issuer, jwksUri: metadata.jwks_uri };
}

async function findLinkedAccount(
  provider: OAuthProviderId,
  providerSubject: string,
): Promise<{ accountId: string; userId: string } | undefined> {
  const [row] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            accountId: pgAuthAccounts.id,
            userId: pgAuthAccounts.userId,
            status: pgUsers.status,
          })
          .from(pgAuthAccounts)
          .innerJoin(pgUsers, eq(pgUsers.id, pgAuthAccounts.userId))
          .where(
            and(
              eq(pgAuthAccounts.provider, provider),
              eq(pgAuthAccounts.providerSubject, providerSubject),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({
            accountId: authAccounts.id,
            userId: authAccounts.userId,
            status: users.status,
          })
          .from(authAccounts)
          .innerJoin(users, eq(users.id, authAccounts.userId))
          .where(
            and(
              eq(authAccounts.provider, provider),
              eq(authAccounts.providerSubject, providerSubject),
            ),
          )
          .limit(1);
  return row?.status === "active" ? row : undefined;
}

async function linkLoginAccount(
  userId: string,
  provider: OAuthProviderId,
  profile: OAuthProfile,
): Promise<void> {
  const [subjectOwner] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ userId: pgAuthAccounts.userId })
          .from(pgAuthAccounts)
          .where(
            and(
              eq(pgAuthAccounts.provider, provider),
              eq(pgAuthAccounts.providerSubject, profile.subject),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({ userId: authAccounts.userId })
          .from(authAccounts)
          .where(
            and(
              eq(authAccounts.provider, provider),
              eq(authAccounts.providerSubject, profile.subject),
            ),
          )
          .limit(1);
  if (subjectOwner && subjectOwner.userId !== userId) {
    throw new ConflictError(
      "OAUTH_ACCOUNT_ALREADY_LINKED",
      "Tài khoản OAuth này đã được liên kết với người dùng khác.",
    );
  }

  const now = new Date();
  const values = {
    id: randomUUID(),
    userId,
    provider,
    providerSubject: profile.subject,
    providerEmail: profile.email,
    createdAt: now,
    updatedAt: now,
  };
  const update = {
    providerSubject: profile.subject,
    providerEmail: profile.email,
    updatedAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgAuthAccounts)
      .values(values)
      .onConflictDoUpdate({
        target: [pgAuthAccounts.userId, pgAuthAccounts.provider],
        set: update,
      });
  } else {
    await databaseAdapter.db
      .insert(authAccounts)
      .values(values)
      .onConflictDoUpdate({
        target: [authAccounts.userId, authAccounts.provider],
        set: update,
      });
  }
}

async function saveAutomationConnection(
  identity: AuthenticatedIdentity,
  provider: OAuthProviderId,
  profile: OAuthProfile,
  configuration: OAuthProviderConfiguration,
  tokens: z.infer<typeof tokenResponseSchema>,
): Promise<void> {
  const connectionProvider =
    provider === "google" ? ("google_workspace" as const) : ("make" as const);
  const [existing] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({ encryptedTokens: pgOauthConnections.encryptedTokens })
          .from(pgOauthConnections)
          .where(
            and(
              eq(pgOauthConnections.workspaceId, identity.workspaceId),
              eq(pgOauthConnections.userId, identity.userId),
              eq(pgOauthConnections.provider, connectionProvider),
            ),
          )
          .limit(1)
      : await databaseAdapter.db
          .select({ encryptedTokens: oauthConnections.encryptedTokens })
          .from(oauthConnections)
          .where(
            and(
              eq(oauthConnections.workspaceId, identity.workspaceId),
              eq(oauthConnections.userId, identity.userId),
              eq(oauthConnections.provider, connectionProvider),
            ),
          )
          .limit(1);
  const aad = getConnectionAad(identity.workspaceId, identity.userId, provider);
  let previousRefreshToken: string | undefined;
  if (existing?.encryptedTokens) {
    try {
      const previous = z
        .object({ refreshToken: z.string().optional() })
        .parse(JSON.parse(getVault().decrypt(existing.encryptedTokens, aad)));
      previousRefreshToken = previous.refreshToken;
    } catch {
      logger.warn({ provider }, "Existing OAuth refresh token could not be preserved");
    }
  }

  const now = new Date();
  const expiresAt = tokens.expires_in
    ? new Date(now.getTime() + tokens.expires_in * 1000)
    : null;
  const encryptedTokens = getVault().encrypt(
    JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? previousRefreshToken,
      tokenType: tokens.token_type ?? "Bearer",
      expiresAt: expiresAt?.toISOString(),
    }),
    aad,
  );
  const scopes = tokens.scope
    ? tokens.scope.split(/\s+/).filter(Boolean)
    : configuration.scopes;

  const connectionValues = {
    id: randomUUID(),
    workspaceId: identity.workspaceId,
    userId: identity.userId,
    provider: connectionProvider,
    providerAccountId: profile.subject,
    providerEmail: profile.email,
    displayLabel: profile.displayName,
    scopes,
    encryptedTokens,
    accessTokenExpiresAt: expiresAt,
    status: "active" as const,
    lastVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const connectionUpdate = {
    providerAccountId: profile.subject,
    providerEmail: profile.email,
    displayLabel: profile.displayName,
    scopes,
    encryptedTokens,
    accessTokenExpiresAt: expiresAt,
    status: "active" as const,
    lastVerifiedAt: now,
    updatedAt: now,
  };
  if (databaseAdapter.kind === "neon") {
    await databaseAdapter.db
      .insert(pgOauthConnections)
      .values(connectionValues)
      .onConflictDoUpdate({
        target: [
          pgOauthConnections.workspaceId,
          pgOauthConnections.userId,
          pgOauthConnections.provider,
        ],
        set: connectionUpdate,
      });
  } else {
    await databaseAdapter.db
      .insert(oauthConnections)
      .values(connectionValues)
      .onConflictDoUpdate({
        target: [
          oauthConnections.workspaceId,
          oauthConnections.userId,
          oauthConnections.provider,
        ],
        set: connectionUpdate,
      });
  }
}

function getVault(): Vault {
  const key = process.env.VAULT_ENCRYPTION_KEY?.trim();
  if (!key) {
    throw new ConfigurationError(
      "VAULT_NOT_CONFIGURED",
      "Vault chưa được cấu hình cho OAuth.",
    );
  }
  return new Vault(key);
}

function getTransactionCookieName(provider: OAuthProviderId): string {
  return `antigravity_oauth_${provider}`;
}

function getConnectionAad(
  workspaceId: string,
  userId: string,
  provider: OAuthProviderId,
): string {
  return `oauth/v1/${workspaceId}/${userId}/${provider}`;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
