import { z } from "zod";
import { aiProviderIds } from "@/domain/ai/ai-model-provider";
import { ValidationError } from "@/domain/shared/app-error";
import {
  sitemapNodeSchema,
  type SitemapNode,
} from "@/domain/sitemap/sitemap-structure";

export const sitemapPilotStatuses = [
  "queued",
  "dispatching",
  "running",
  "succeeded",
  "failed",
  "timed_out",
] as const;

export type SitemapPilotStatus = (typeof sitemapPilotStatuses)[number];

const siteInputSchema = z.object({
  reference: z.string().trim().min(1, "Tên tham chiếu không được để trống").max(80),
  location: z
    .string()
    .trim()
    .min(1, "Thị trường/địa điểm không được để trống")
    .max(160),
  primaryKeyword: z
    .string()
    .trim()
    .min(1, "Từ khóa chính không được để trống")
    .max(240),
  tone: z.string().trim().min(1, "Giọng văn không được để trống").max(120),
  language: z.string().trim().min(1, "Ngôn ngữ đầu ra không được để trống").max(80),
  websiteBrief: z
    .string()
    .trim()
    .min(10, "Mô tả website cần ít nhất 10 ký tự")
    .max(8_000),
  competitorUrls: z
    .array(z.url("Mỗi dòng đối thủ phải là URL hợp lệ (https://...)"))
    .max(5, "Tối đa 5 URL đối thủ")
    .default([]),
});

export const createSitemapPilotJobSchema = z
  .object({
    projectId: z.string().trim().min(1),
    idempotencyKey: z.uuid(),
    ai: z
      .object({
        provider: z.enum(aiProviderIds),
        model: z.string().trim().min(1).max(120),
      })
      .strict(),
    sites: z.array(siteInputSchema).min(1).max(4),
  })
  .strict();

export type CreateSitemapPilotJobInput = z.infer<
  typeof createSitemapPilotJobSchema
>;
export type SitemapPilotSiteInput = CreateSitemapPilotJobInput["sites"][number];

export interface SitemapPilotSiteOutput {
  reference: string;
  draftSitemap: string;
  selectedSitemap: string;
  // Cây sitemap có cấu trúc để vẽ sơ đồ radial. Optional: job cũ chưa có →
  // client tự dựng từ selectedSitemap.
  structure?: SitemapNode;
}

export interface SitemapPilotOutput extends Record<string, unknown> {
  contractVersion: "1.0";
  sites: SitemapPilotSiteOutput[];
  mocked?: boolean;
}

export const sitemapPilotOutputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    sites: z
      .array(
        z
          .object({
            reference: z.string().trim().min(1).max(80),
            draftSitemap: z.string().min(1),
            selectedSitemap: z.string().min(1),
            structure: sitemapNodeSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(4),
    mocked: z.boolean().optional(),
  })
  .strict();

export interface SitemapPilotJob {
  id: string;
  workspaceId: string;
  projectId: string;
  automationKey: "RIS_SITEMAP";
  idempotencyKey: string;
  status: SitemapPilotStatus;
  input: CreateSitemapPilotJobInput;
  output: SitemapPilotOutput | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function parseCreateSitemapPilotJobInput(
  value: unknown,
): CreateSitemapPilotJobInput {
  const result = createSitemapPilotJobSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(
      "INVALID_SITEMAP_JOB_PAYLOAD",
      "Dữ liệu chạy thử Sitemap không hợp lệ.",
      {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    );
  }
  return result.data;
}

export function parseSitemapPilotOutput(value: unknown): SitemapPilotOutput {
  return sitemapPilotOutputSchema.parse(value);
}

// Đọc output đã lưu (do Make ghi trực tiếp vào Neon) một cách khoan dung: bỏ
// qua key thừa, ép kiểu text và không bao giờ ném lỗi. Tránh trường hợp một job
// đã `succeeded` bị ẩn chỉ vì output lệch nhẹ so với schema strict lúc ghi mock.
const storedTextField = z.preprocess((value) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).join("\n");
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}, z.string());

const storedSitemapPilotOutputSchema = z.object({
  contractVersion: z.literal("1.0").catch("1.0"),
  sites: z
    .array(
      z.object({
        reference: storedTextField,
        draftSitemap: storedTextField,
        selectedSitemap: storedTextField,
        // Job cũ không có structure → undefined; parse lỗi cũng bỏ qua an toàn.
        structure: sitemapNodeSchema.optional().catch(undefined),
      }),
    )
    .min(1),
  mocked: z.boolean().optional(),
});

export function parseStoredSitemapPilotOutput(
  value: unknown,
): SitemapPilotOutput | null {
  if (value === null || value === undefined) return null;
  const result = storedSitemapPilotOutputSchema.safeParse(value);
  if (!result.success) return null;
  return {
    contractVersion: "1.0",
    sites: result.data.sites,
    ...(result.data.mocked === undefined ? {} : { mocked: result.data.mocked }),
  };
}

export function isTerminalSitemapPilotStatus(
  status: SitemapPilotStatus,
): boolean {
  return ["succeeded", "failed", "timed_out"].includes(status);
}
