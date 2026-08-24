import { asc, eq } from "drizzle-orm";
import type { UpdateWorkspaceInput } from "@/domain/workspaces/workspace";
import type {
  WorkspaceRepository,
  WorkspaceSettings,
} from "@/domain/workspaces/workspace-repository";
import type { NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import {
  pgAuditLogs,
  pgUsers,
  pgWorkspaceMembers,
  pgWorkspaces,
} from "@/lib/db/postgres-schema";

export class NeonWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: NeonApplicationDatabase) {}

  async get(id: string): Promise<WorkspaceSettings | null> {
    const [workspace] = await this.database
      .select()
      .from(pgWorkspaces)
      .where(eq(pgWorkspaces.id, id))
      .limit(1);
    if (!workspace) return null;
    const members = await this.database
      .select({
        userId: pgUsers.id,
        displayName: pgUsers.displayName,
        email: pgUsers.email,
        role: pgWorkspaceMembers.role,
      })
      .from(pgWorkspaceMembers)
      .innerJoin(pgUsers, eq(pgUsers.id, pgWorkspaceMembers.userId))
      .where(eq(pgWorkspaceMembers.workspaceId, id))
      .orderBy(asc(pgUsers.displayName));
    return { ...workspace, members };
  }

  async update(
    id: string,
    input: UpdateWorkspaceInput,
    actorUserId: string,
    now: Date,
  ): Promise<WorkspaceSettings | null> {
    if (!(await this.get(id))) return null;
    await this.database.batch([
      this.database
        .update(pgWorkspaces)
        .set({ name: input.name, slug: input.slug, updatedAt: now })
        .where(eq(pgWorkspaces.id, id)),
      this.database.insert(pgAuditLogs).values({
        id: crypto.randomUUID(),
        workspaceId: id,
        userId: actorUserId,
        action: "workspace.updated",
        resourceType: "workspace",
        resourceId: id,
        details: { name: input.name, slug: input.slug },
        timestamp: now,
      }),
    ]);
    return this.get(id);
  }
}
