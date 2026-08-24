import { asc, eq } from "drizzle-orm";
import type {
  WorkspaceRepository,
  WorkspaceSettings,
} from "@/domain/workspaces/workspace-repository";
import type { UpdateWorkspaceInput } from "@/domain/workspaces/workspace";
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import {
  auditLogs,
  users,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";

export class SqliteWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly database: ApplicationDatabase) {}

  async get(id: string): Promise<WorkspaceSettings | null> {
    const workspaceRows = await this.database
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1);
    const workspace = workspaceRows[0];
    if (!workspace) return null;
    const members = await this.database
      .select({
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, id))
      .orderBy(asc(users.displayName));
    return { ...workspace, members };
  }

  async update(
    id: string,
    input: UpdateWorkspaceInput,
    actorUserId: string,
    now: Date,
  ): Promise<WorkspaceSettings | null> {
    const changed = this.database.transaction((transaction) => {
      const result = transaction
        .update(workspaces)
        .set({ name: input.name, slug: input.slug, updatedAt: now })
        .where(eq(workspaces.id, id))
        .run();
      if (result.changes !== 1) return false;
      transaction
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          workspaceId: id,
          userId: actorUserId,
          action: "workspace.updated",
          resourceType: "workspace",
          resourceId: id,
          details: { name: input.name, slug: input.slug },
          timestamp: now,
        })
        .run();
      return true;
    });
    return changed ? this.get(id) : null;
  }
}
