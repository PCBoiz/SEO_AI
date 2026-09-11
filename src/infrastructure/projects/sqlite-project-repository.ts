import { and, desc, eq, inArray } from "drizzle-orm";
import type {
  PersistedProjectSecrets,
  ProjectListItem,
  ProjectRepository,
  UpdateProjectOptions,
} from "@/domain/projects/project-repository";
import type { ProjectSnapshot } from "@/domain/projects/project";
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import {
  auditLogs,
  competitors,
  moduleJobs,
  projectIntegrations,
  projects,
} from "@/lib/db/schema";

type IntegrationStatus =
  | "configured"
  | "unconfigured"
  | "disabled"
  | "error";

interface IntegrationConfig {
  url?: unknown;
  username?: unknown;
}

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private readonly database: ApplicationDatabase) {}

  async listByWorkspace(workspaceId: string): Promise<ProjectListItem[]> {
    const projectRows = await this.database
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.updatedAt));

    if (projectRows.length === 0) {
      return [];
    }

    const projectIds = projectRows.map((project) => project.id);
    const competitorRows = await this.database
      .select()
      .from(competitors)
      .where(inArray(competitors.projectId, projectIds));
    const integrationRows = await this.database
      .select({
        projectId: projectIntegrations.projectId,
        type: projectIntegrations.type,
        status: projectIntegrations.status,
        config: projectIntegrations.config,
      })
      .from(projectIntegrations)
      .where(inArray(projectIntegrations.projectId, projectIds));

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
    const projectsForWorkspace = await this.database
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.workspaceId, workspaceId),
          eq(projects.id, projectId),
        ),
      )
      .limit(1);
    const project = projectsForWorkspace[0];
    if (!project) {
      return null;
    }

    const competitorRows = await this.database
      .select()
      .from(competitors)
      .where(eq(competitors.projectId, project.id));
    const integrationRows = await this.database
      .select({
        projectId: projectIntegrations.projectId,
        type: projectIntegrations.type,
        status: projectIntegrations.status,
        config: projectIntegrations.config,
      })
      .from(projectIntegrations)
      .where(eq(projectIntegrations.projectId, project.id));

    return mapProject(project, competitorRows, integrationRows);
  }

  async create(
    project: Readonly<ProjectSnapshot>,
    secrets: PersistedProjectSecrets,
    actorUserId: string,
  ): Promise<ProjectListItem> {
    this.database.transaction((transaction) => {
      transaction
        .insert(projects)
        .values({
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
        })
        .run();

      if (project.competitors.length > 0) {
        transaction
          .insert(competitors)
          .values(
            project.competitors.map((competitor) => ({
              ...competitor,
              projectId: project.id,
              title: competitor.title,
              notes: competitor.notes,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            })),
          )
          .run();
      }

      transaction
        .insert(projectIntegrations)
        .values([
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
        ])
        .run();

      transaction
        .insert(auditLogs)
        .values({
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
        })
        .run();
    });

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
    this.database.transaction((transaction) => {
      const result = transaction
        .update(projects)
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
            eq(projects.id, project.id),
            eq(projects.workspaceId, project.workspaceId),
          ),
        )
        .run();
      if (result.changes !== 1) {
        throw new Error("Project update target disappeared during transaction.");
      }

      transaction
        .delete(competitors)
        .where(eq(competitors.projectId, project.id))
        .run();
      if (project.competitors.length > 0) {
        transaction
          .insert(competitors)
          .values(
            project.competitors.map((competitor) => ({
              ...competitor,
              projectId: project.id,
              title: competitor.title,
              notes: competitor.notes,
              createdAt: project.updatedAt,
              updatedAt: project.updatedAt,
            })),
          )
          .run();
      }

      if (options.wordpressChanged) {
        if (project.wordpress) {
          const credentialUpdate = options.wordpressPassword
            ? { encryptedCredentials: options.wordpressPassword }
            : {};
          transaction
            .update(projectIntegrations)
            .set({
              status: "configured",
              config: {
                url: project.wordpress.url,
                username: project.wordpress.username,
              },
              ...credentialUpdate,
              updatedAt: project.updatedAt,
            })
            .where(
              and(
                eq(projectIntegrations.projectId, project.id),
                eq(projectIntegrations.type, "wordpress"),
              ),
            )
            .run();
        } else {
          transaction
            .update(projectIntegrations)
            .set({
              status: "unconfigured",
              config: null,
              encryptedCredentials: null,
              secretReference: null,
              updatedAt: project.updatedAt,
            })
            .where(
              and(
                eq(projectIntegrations.projectId, project.id),
                eq(projectIntegrations.type, "wordpress"),
              ),
            )
            .run();
        }
      }

      transaction
        .insert(auditLogs)
        .values({
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
        })
        .run();
    });

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
    const changed = this.database.transaction((transaction) => {
      const result = transaction
        .update(projects)
        .set({ status: "archived", updatedAt: now })
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.workspaceId, workspaceId),
          ),
        )
        .run();
      if (result.changes !== 1) {
        return false;
      }
      transaction
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          userId: actorUserId,
          action: "project.archived",
          resourceType: "project",
          resourceId: projectId,
          details: {},
          timestamp: now,
        })
        .run();
      return true;
    });

    return changed ? this.getById(workspaceId, projectId) : null;
  }

  async deletePermanently(
    workspaceId: string,
    projectId: string,
    actorUserId: string,
    now: Date,
  ): Promise<boolean> {
    return this.database.transaction((transaction) => {
      const exists = transaction
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
        .get();
      if (!exists) return false;
      // `module_jobs` không có khoá ngoại tới dự án — xoá tay. Xem chú thích ở
      // `ProjectRepository.deletePermanently`.
      transaction
        .delete(moduleJobs)
        .where(and(eq(moduleJobs.projectId, projectId), eq(moduleJobs.workspaceId, workspaceId)))
        .run();
      transaction
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId)))
        .run();
      transaction
        .insert(auditLogs)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          userId: actorUserId,
          action: "project.deleted",
          resourceType: "project",
          resourceId: projectId,
          details: {},
          timestamp: now,
        })
        .run();
      return true;
    });
  }
}

function mapProject(
  project: typeof projects.$inferSelect,
  competitorRows: Array<typeof competitors.$inferSelect>,
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
      googleSheetBridge: {
        status: bridge?.status ?? "unconfigured",
      },
    },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
