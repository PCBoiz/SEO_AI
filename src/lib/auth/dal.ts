import "server-only";

import { cache } from "react";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import type {
  WorkspacePermission,
  WorkspaceRole,
} from "@/domain/auth/permissions";
import { assertRolePermission } from "@/domain/auth/permissions";
import { AuthenticationError } from "@/domain/shared/app-error";
import { databaseAdapter } from "@/lib/db";
import {
  pgSessions,
  pgUsers,
  pgWorkspaceMembers,
  pgWorkspaces,
} from "@/lib/db/postgres-schema";
import {
  sessions,
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { readSessionToken } from "@/lib/auth/session.server";

export interface AuthenticatedIdentity {
  userId: string;
  displayName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: WorkspaceRole;
}

export const getCurrentIdentity = cache(
  async (): Promise<AuthenticatedIdentity | null> => {
    const token = await readSessionToken();
    if (!token || token.expiresAt <= new Date()) {
      return null;
    }

    const rows =
      databaseAdapter.kind === "neon"
        ? await databaseAdapter.db
            .select({
              userId: pgUsers.id,
              displayName: pgUsers.displayName,
              workspaceId: pgWorkspaces.id,
              workspaceName: pgWorkspaces.name,
              workspaceSlug: pgWorkspaces.slug,
              role: pgWorkspaceMembers.role,
            })
            .from(pgSessions)
            .innerJoin(pgUsers, eq(pgUsers.id, pgSessions.userId))
            .innerJoin(
              pgWorkspaceMembers,
              eq(pgWorkspaceMembers.userId, pgUsers.id),
            )
            .innerJoin(
              pgWorkspaces,
              eq(pgWorkspaces.id, pgWorkspaceMembers.workspaceId),
            )
            .where(
              and(
                eq(pgSessions.id, token.sessionId),
                eq(pgSessions.userId, token.userId),
                gt(pgSessions.expiresAt, new Date()),
                isNull(pgSessions.revokedAt),
                eq(pgUsers.status, "active"),
              ),
            )
            .limit(1)
        : await databaseAdapter.db
            .select({
              userId: users.id,
              displayName: users.displayName,
              workspaceId: workspaces.id,
              workspaceName: workspaces.name,
              workspaceSlug: workspaces.slug,
              role: workspaceMembers.role,
            })
            .from(sessions)
            .innerJoin(users, eq(users.id, sessions.userId))
            .innerJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
            .innerJoin(
              workspaces,
              eq(workspaces.id, workspaceMembers.workspaceId),
            )
            .where(
              and(
                eq(sessions.id, token.sessionId),
                eq(sessions.userId, token.userId),
                gt(sessions.expiresAt, new Date()),
                isNull(sessions.revokedAt),
                eq(users.status, "active"),
              ),
            )
            .limit(1);

    return rows[0] ?? null;
  },
);

export async function requirePageIdentity(): Promise<AuthenticatedIdentity> {
  const identity = await getCurrentIdentity();
  if (!identity) {
    redirect("/login");
  }
  return identity;
}

export async function requireApiIdentity(): Promise<AuthenticatedIdentity> {
  const identity = await getCurrentIdentity();
  if (!identity) {
    throw new AuthenticationError();
  }
  return identity;
}

export async function requirePermission(
  permission: WorkspacePermission,
): Promise<AuthenticatedIdentity> {
  const identity = await requireApiIdentity();
  assertRolePermission(identity.role, permission);
  return identity;
}
