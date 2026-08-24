import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  PersistedProjectSecrets,
  ProjectListItem,
  ProjectRepository,
  UpdateProjectOptions,
} from "@/domain/projects/project-repository";
import type { ProjectSnapshot } from "@/domain/projects/project";
import type { NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import {
  pgAuditLogs,
  pgCompetitors,
  pgProjectIntegrations,
  pgProjects,
} from "@/lib/db/postgres-schema";

type IntegrationStatus = "configured" | "unconfigured" | "disabled" | "error";

interface IntegrationConfig {
  url?: unknown;
  username?: unknown;
}

export class NeonProjectRepository implements ProjectRepository {
  constructor(private readonly database: NeonApplicationDatabase) {}

  async listByWorkspace(workspaceId: string): Promise<ProjectListItem[]> {
    const projectRows = await this.database
      .select()
      .from(pgProjects)
      .where(eq(pgProjects.workspaceId, workspaceId))
      .orderBy(desc(pgProjects.updatedAt));
    if (projectRows.length === 0) return [];

    const projectIds = projectRows.map((project) => project.id);
    const competitorRows = await this.database
      .select()
      .from(pgCompetitors)
      .where(inArray(pgCompetitors.projectId, projectIds));
    const integrationRows = await this.database
      .select({
        projectId: pgProjectIntegrations.projectId,
        type: pgProjectIntegrations.type,
        status: pgProjectIntegrations.status,
        config: pgProjectIntegrations.config,
      })
      .from(pgProjectIntegrations)
      .where(inArray(pgProjectIntegrations.projectId, projectIds));

    return projectRows.map((project) =>
      mapProject(
        project,
        competitorRows.filter((item) => item.projectId === project.id),
        integrationRows.filter((item) => item.projectId === project.id),
      ),
    );
  }

  async getById(
    workspaceId: string,
    projectId: string,
  ): Promise<ProjectListItem | null> {
    const [project] = await this.database
      .select()
      .from(pgProjects)
      .where(
        and(
          eq(pgProjects.workspaceId, workspaceId),
          eq(pgProjects.id, projectId),
        ),
      )
      .limit(1);
    if (!project) return null;
    const competitorRows = await this.database
      .select()
      .from(pgCompetitors)
      .where(eq(pgCompetitors.projectId, project.id));
    const integrationRows = await this.database
      .select({
        projectId: pgProjectIntegrations.projectId,
        type: pgProjectIntegrations.type,
        status: pgProjectIntegrations.status,
        config: pgProjectIntegrations.config,
      })
      .from(pgProjectIntegrations)
      .where(eq(pgProjectIntegrations.projectId, project.id));
    return mapProject(project, competitorRows, integrationRows);
  }

  async create(
    project: Readonly<ProjectSnapshot>,
    secrets: PersistedProjectSecrets,
    actorUserId: string,
  ): Promise<ProjectListItem> {
    const queries: unknown[] = [
      this.database.insert(pgProjects).values({
        id: project.id,
        workspaceId: project.workspaceId,
        name: project.name,
        website: project.website,
        location: project.location,
        industry: project.industry,
        language: project.language,
        tone: project.tone,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }),
    ];
    if (project.competitors.length > 0) {
      queries.push(
        this.database.insert(pgCompetitors).values(
          project.competitors.map((competitor) => ({
            ...competitor,
            projectId: project.id,
            title: competitor.title,
            notes: competitor.notes,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          })),
        ),
      );
    }
    queries.push(
      this.database.insert(pgProjectIntegrations).values([
        {
          id: crypto.randomUUID(),
          projectId: project.id,
          type: "wordpress",
          status: project.wordpress ? "configured" : "unconfigured",
          config: project.wordpress
            ? {
                url: project.wordpress.url,
                username: project.wordpress.username,
              }
            : null,
          encryptedCredentials: secrets.wordpressPassword,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        {
          id: crypto.randomUUID(),
          projectId: project.id,
          type: "google_sheet_bridge",
          status: "unconfigured",
          config: null,
          encryptedCredentials: null,
          secretReference: null,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      ]),
      this.database.insert(pgAuditLogs).values({
        id: crypto.randomUUID(),
        workspaceId: project.workspaceId,
        userId: actorUserId,
        action: "project.created",
        resourceType: "project",
        resourceId: project.id,
        details: {
          competitorsCount: project.competitors.length,
          wordpressConfigured: Boolean(project.wordpress),
          googleSheetBridgeConfigured: false,
        },
        timestamp: project.createdAt,
      }),
    );
    await runBatch(this.database, queries);
    const created = await this.getById(project.workspaceId, project.id);
    if (!created) {
      throw new Error("Project transaction completed without a readable record.");
    }
    return created;
  }

  async update(
    project: Readonly<ProjectSnapshot>,
    options: UpdateProjectOptions,
    actorUserId: string,
  ): Promise<ProjectListItem> {
    if (!(await this.getById(project.workspaceId, project.id))) {
      throw new Error("Project update target disappeared before transaction.");
    }
    const queries: unknown[] = [
      this.database
        .update(pgProjects)
        .set({
          name: project.name,
          website: project.website,
          location: project.location,
          industry: project.industry,
          language: project.language,
          tone: project.tone,
          updatedAt: project.updatedAt,
        })
        .where(
          and(
            eq(pgProjects.id, project.id),
            eq(pgProjects.workspaceId, project.workspaceId),
          ),
        ),
      this.database
        .delete(pgCompetitors)
        .where(eq(pgCompetitors.projectId, project.id)),
    ];
    if (project.competitors.length > 0) {
      queries.push(
        this.database.insert(pgCompetitors).values(
          project.competitors.map((competitor) => ({
            ...competitor,
            projectId: project.id,
            title: competitor.title,
            notes: competitor.notes,
            createdAt: project.updatedAt,
            updatedAt: project.updatedAt,
          })),
        ),
      );
    }
    if (options.wordpressChanged) {
      if (project.wordpress) {
        queries.push(
          this.database
            .update(pgProjectIntegrations)
            .set({
              status: "configured",
              config: {
                url: project.wordpress.url,
                username: project.wordpress.username,
              },
              ...(options.wordpressPassword
                ? { encryptedCredentials: options.wordpressPassword }
                : {}),
              updatedAt: project.updatedAt,
            })
            .where(
              and(
                eq(pgProjectIntegrations.projectId, project.id),
                eq(pgProjectIntegrations.type, "wordpress"),
              ),
            ),
        );
      } else {
        queries.push(
          this.database
            .update(pgProjectIntegrations)
            .set({
              status: "unconfigured",
              config: null,
              encryptedCredentials: null,
              secretReference: null,
              updatedAt: project.updatedAt,
            })
            .where(
              and(
                eq(pgProjectIntegrations.projectId, project.id),
                eq(pgProjectIntegrations.type, "wordpress"),
              ),
            ),
        );
      }
    }
    queries.push(
      this.database.insert(pgAuditLogs).values({
        id: crypto.randomUUID(),
        workspaceId: project.workspaceId,
        userId: actorUserId,
        action: "project.updated",
        resourceType: "project",
        resourceId: project.id,
        details: {
          competitorsCount: project.competitors.length,
          wordpressChanged: options.wordpressChanged,
          wordpressPasswordRotated: Boolean(options.wordpressPassword),
        },
        timestamp: project.updatedAt,
      }),
    );
    await runBatch(this.database, queries);
    const updated = await this.getById(project.workspaceId, project.id);
    if (!updated) {
      throw new Error("Project transaction completed without a readable record.");
    }
    return updated;
  }

  async archive(
    workspaceId: string,
    projectId: string,
    actorUserId: string,
    now: Date,
  ): Promise<ProjectListItem | null> {
    if (!(await this.getById(workspaceId, projectId))) return null;
    await this.database.batch([
      this.database
        .update(pgProjects)
        .set({ status: "archived", updatedAt: now })
        .where(
          and(
            eq(pgProjects.id, projectId),
            eq(pgProjects.workspaceId, workspaceId),
          ),
        ),
      this.database.insert(pgAuditLogs).values({
        id: crypto.randomUUID(),
        workspaceId,
        userId: actorUserId,
        action: "project.archived",
        resourceType: "project",
        resourceId: projectId,
        details: {},
        timestamp: now,
      }),
    ]);
    return this.getById(workspaceId, projectId);
  }
}

async function runBatch(
  database: NeonApplicationDatabase,
  queries: unknown[],
): Promise<void> {
  if (queries.length === 0) return;
  await database.batch(
    queries as unknown as Parameters<NeonApplicationDatabase["batch"]>[0],
  );
}

function mapProject(
  project: typeof pgProjects.$inferSelect,
  competitorRows: Array<typeof pgCompetitors.$inferSelect>,
  integrationRows: Array<{
    projectId: string;
    type: string;
    status: IntegrationStatus;
    config: Record<string, unknown> | null;
  }>,
): ProjectListItem {
  const wordpress = integrationRows.find((item) => item.type === "wordpress");
  const bridge = integrationRows.find(
    (item) => item.type === "google_sheet_bridge",
  );
  const wordpressConfig = (wordpress?.config ?? {}) as IntegrationConfig;
  return {
    id: project.id,
    name: project.name,
    website: project.website,
    location: project.location,
    industry: project.industry,
    language: project.language,
    tone: project.tone,
    status: project.status,
    competitors: competitorRows
      .map((competitor) => ({
        id: competitor.id,
        domain: competitor.domain,
        title: competitor.title,
        notes: competitor.notes,
        priority: competitor.priority,
      }))
      .sort((left, right) => right.priority - left.priority),
    integrations: {
      wordpress: {
        status: wordpress?.status ?? "unconfigured",
        url:
          typeof wordpressConfig.url === "string" ? wordpressConfig.url : null,
        username:
          typeof wordpressConfig.username === "string"
            ? wordpressConfig.username
            : null,
      },
      googleSheetBridge: { status: bridge?.status ?? "unconfigured" },
    },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
