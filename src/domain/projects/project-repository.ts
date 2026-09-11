import type { ProjectSnapshot } from "@/domain/projects/project";

export interface ProjectListItem {
  id: string;
  name: string;
  website: string;
  location: string | null;
  industry: string | null;
  language: string;
  tone: string;
  status: "active" | "archived";
  competitors: Array<{
    id: string;
    domain: string;
    title: string | null;
    notes: string | null;
    priority: number;
  }>;
  integrations: {
    wordpress: {
      status: "configured" | "unconfigured" | "disabled" | "error";
      url: string | null;
      username: string | null;
    };
    googleSheetBridge: {
      status: "configured" | "unconfigured" | "disabled" | "error";
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistedProjectSecrets {
  wordpressPassword?: string;
}

export interface UpdateProjectOptions extends PersistedProjectSecrets {
  wordpressChanged: boolean;
}

export interface ProjectRepository {
  listByWorkspace(workspaceId: string): Promise<ProjectListItem[]>;
  getById(workspaceId: string, projectId: string): Promise<ProjectListItem | null>;
  create(
    project: Readonly<ProjectSnapshot>,
    secrets: PersistedProjectSecrets,
    actorUserId: string,
  ): Promise<ProjectListItem>;
  update(
    project: Readonly<ProjectSnapshot>,
    options: UpdateProjectOptions,
    actorUserId: string,
  ): Promise<ProjectListItem>;
  archive(
    workspaceId: string,
    projectId: string,
    actorUserId: string,
    now: Date,
  ): Promise<ProjectListItem | null>;
  /**
   * Xoá HẲN dự án — trả `false` nếu không có dự án đó trong workspace.
   *
   * ⚠️ PHẢI XOÁ TAY `module_jobs`. Bảy bảng khác nối khoá ngoại tới `projects`
   * với `onDelete: "cascade"` nên tự đi theo; riêng `module_jobs` có cột
   * `project_id` mà KHÔNG có khoá ngoại. Chỉ xoá dòng dự án là để lại lịch sử
   * chạy mồ côi — trỏ tới một dự án không còn tồn tại.
   */
  deletePermanently(
    workspaceId: string,
    projectId: string,
    actorUserId: string,
    now: Date,
  ): Promise<boolean>;
}
