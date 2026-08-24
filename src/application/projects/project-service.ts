import { randomUUID } from "node:crypto";
import type { WorkspaceRole } from "@/domain/auth/permissions";
import { assertRolePermission } from "@/domain/auth/permissions";
import {
  parseCreateProjectInput,
  parseUpdateProjectInput,
  ProjectAggregate,
} from "@/domain/projects/project";
import type {
  ProjectListItem,
  ProjectRepository,
} from "@/domain/projects/project-repository";
import { Vault } from "@/lib/vault";
import { NotFoundError, ValidationError } from "@/domain/shared/app-error";

export interface ProjectActor {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
}

export class ProjectService {
  constructor(
    private readonly repository: ProjectRepository,
    private readonly vault: Vault,
  ) {}

  async list(actor: ProjectActor): Promise<ProjectListItem[]> {
    assertRolePermission(actor.role, "workspace.read");
    return this.repository.listByWorkspace(actor.workspaceId);
  }

  async create(actor: ProjectActor, rawInput: unknown): Promise<ProjectListItem> {
    assertRolePermission(actor.role, "project.create");
    const input = parseCreateProjectInput(rawInput);
    const projectId = randomUUID();
    const aggregate = ProjectAggregate.create({
      id: projectId,
      workspaceId: actor.workspaceId,
      input,
      competitorIds: input.competitors.map(() => randomUUID()),
      now: new Date(),
    });
    const snapshot = aggregate.snapshot();
    const wordpressPassword = input.wordpress
      ? this.vault.encrypt(
          input.wordpress.password,
          wordpressCredentialContext(actor.workspaceId, projectId),
        )
      : undefined;

    return this.repository.create(
      snapshot,
      { wordpressPassword },
      actor.userId,
    );
  }

  async get(actor: ProjectActor, projectId: string): Promise<ProjectListItem> {
    assertRolePermission(actor.role, "workspace.read");
    const project = await this.repository.getById(actor.workspaceId, projectId);
    if (!project) {
      throw projectNotFound(projectId);
    }
    return project;
  }

  async update(
    actor: ProjectActor,
    projectId: string,
    rawInput: unknown,
  ): Promise<ProjectListItem> {
    assertRolePermission(actor.role, "project.update");
    const current = await this.repository.getById(actor.workspaceId, projectId);
    if (!current) {
      throw projectNotFound(projectId);
    }
    const input = parseUpdateProjectInput(rawInput);
    const wordpressChanged = Object.hasOwn(input, "wordpress");
    if (
      input.wordpress &&
      !input.wordpress.password &&
      current.integrations.wordpress.status !== "configured"
    ) {
      throw new ValidationError(
        "WORDPRESS_PASSWORD_REQUIRED",
        "Mật khẩu ứng dụng là bắt buộc khi cấu hình WordPress lần đầu.",
        { issues: [{ path: "wordpress.password", message: "Mật khẩu là bắt buộc." }] },
      );
    }

    const existingWordpress =
      current.integrations.wordpress.status === "configured" &&
      current.integrations.wordpress.url &&
      current.integrations.wordpress.username
        ? {
            url: current.integrations.wordpress.url,
            username: current.integrations.wordpress.username,
          }
        : undefined;
    const aggregate = ProjectAggregate.restore({
      id: current.id,
      workspaceId: actor.workspaceId,
      name: current.name,
      website: current.website,
      location: current.location ?? undefined,
      industry: current.industry ?? undefined,
      language: current.language,
      tone: current.tone,
      status: current.status,
      competitors: current.competitors.map((competitor) => ({
        ...competitor,
        title: competitor.title ?? undefined,
        notes: competitor.notes ?? undefined,
      })),
      wordpress: existingWordpress,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    });
    aggregate.update(
      input,
      input.competitors.map(() => randomUUID()),
      new Date(),
    );
    const snapshot = aggregate.snapshot();
    const encryptedPassword = input.wordpress?.password
      ? this.vault.encrypt(
          input.wordpress.password,
          wordpressCredentialContext(actor.workspaceId, projectId),
        )
      : undefined;

    return this.repository.update(
      snapshot,
      {
        wordpressChanged,
        wordpressPassword: encryptedPassword,
      },
      actor.userId,
    );
  }

  async archive(actor: ProjectActor, projectId: string): Promise<ProjectListItem> {
    assertRolePermission(actor.role, "project.delete");
    const archived = await this.repository.archive(
      actor.workspaceId,
      projectId,
      actor.userId,
      new Date(),
    );
    if (!archived) {
      throw projectNotFound(projectId);
    }
    return archived;
  }
}

export function wordpressCredentialContext(
  workspaceId: string,
  projectId: string,
): string {
  return `workspace:${workspaceId}:project:${projectId}:wordpress`;
}

function projectNotFound(projectId: string): NotFoundError {
  return new NotFoundError(
    "PROJECT_NOT_FOUND",
    "Không tìm thấy dự án trong workspace này.",
    { projectId },
  );
}
