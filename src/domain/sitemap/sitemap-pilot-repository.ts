import type {
  CreateSitemapPilotJobInput,
  SitemapPilotJob,
  SitemapPilotOutput,
  SitemapPilotStatus,
} from "@/domain/sitemap/sitemap-pilot";

export interface NewSitemapPilotJob {
  id: string;
  workspaceId: string;
  input: CreateSitemapPilotJobInput;
  now: Date;
}

export interface CreateSitemapPilotJobResult {
  job: SitemapPilotJob;
  created: boolean;
}

export interface SitemapPilotJobRepository {
  create(input: NewSitemapPilotJob): Promise<CreateSitemapPilotJobResult>;
  getById(workspaceId: string, jobId: string): Promise<SitemapPilotJob | null>;
  // Lịch sử run gần nhất của dự án (mới → cũ) — cho preset input + xem lại output.
  listRecentForProject(
    workspaceId: string,
    projectId: string,
    limit: number,
  ): Promise<SitemapPilotJob[]>;
  setStatus(
    workspaceId: string,
    jobId: string,
    status: SitemapPilotStatus,
    now: Date,
    options?: {
      output?: SitemapPilotOutput;
      errorCode?: string;
      errorMessage?: string;
      incrementAttempt?: boolean;
    },
  ): Promise<SitemapPilotJob>;
}
