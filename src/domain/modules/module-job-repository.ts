import type { ModuleJob, ModuleJobStatus } from "@/domain/modules/module-job";

export interface NewModuleJob {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  moduleKey: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  now: Date;
}

export interface CreateModuleJobResult {
  job: ModuleJob;
  created: boolean;
}

export interface SetModuleJobStatusOptions {
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  incrementAttempt?: boolean;
}

export interface ModuleJobRepository {
  create(input: NewModuleJob): Promise<CreateModuleJobResult>;
  getById(workspaceId: string, jobId: string): Promise<ModuleJob | null>;
  setStatus(
    workspaceId: string,
    jobId: string,
    status: ModuleJobStatus,
    now: Date,
    options?: SetModuleJobStatusOptions,
  ): Promise<ModuleJob>;
  // Bản mới nhất (mọi trạng thái) của một module trong dự án — dùng preset/reload.
  // Nếu có bản được ghim thì ưu tiên bản ghim.
  getLatestForModule(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
  ): Promise<ModuleJob | null>;
  // Bản "chính thức" của MỖI module trong dự án (bản ghim nếu có, không thì bản
  // thành công mới nhất) — dùng nối luồng + ngữ cảnh.
  listLatestSucceededByProject(
    workspaceId: string,
    projectId: string,
  ): Promise<ModuleJob[]>;
  // Lịch sử run gần nhất của một module trong dự án (mới → cũ).
  listRecentForModule(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
    limit: number,
  ): Promise<ModuleJob[]>;
  // Job gần đây nhất trên TOÀN workspace (mọi dự án, mọi module, mọi trạng thái;
  // mới → cũ) — cho bảng điều khiển Tổng quan.
  listRecentByWorkspace(
    workspaceId: string,
    limit: number,
  ): Promise<ModuleJob[]>;
  // Ghim một job làm bản chính thức (bỏ ghim các job khác cùng dự án + module);
  // jobId = null nghĩa là bỏ ghim toàn bộ.
  setPinned(
    workspaceId: string,
    projectId: string,
    moduleKey: string,
    jobId: string | null,
    now: Date,
  ): Promise<void>;
}
