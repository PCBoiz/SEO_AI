import { z } from "zod";
import { aiProviderIds } from "@/domain/ai/ai-model-provider";

// Trạng thái dùng chung cho mọi module app-native (giống Module 1 để UI polling
// và nhãn hiển thị nhất quán trên toàn hệ thống).
export const moduleJobStatuses = [
  "queued",
  "dispatching",
  "running",
  "succeeded",
  "failed",
  "timed_out",
] as const;

export type ModuleJobStatus = (typeof moduleJobStatuses)[number];

export function isTerminalModuleJobStatus(status: ModuleJobStatus): boolean {
  return ["succeeded", "failed", "timed_out"].includes(status);
}

// Phần bao (envelope) chung của mọi input module: dự án, khóa chống trùng, và
// lựa chọn AI (provider + model). Mỗi module ghép thêm payload riêng của nó.
export const moduleJobBaseShape = {
  projectId: z.string().trim().min(1),
  idempotencyKey: z.uuid(),
  ai: z
    .object({
      provider: z.enum(aiProviderIds),
      model: z.string().trim().min(1).max(120),
    })
    .strict(),
} as const;

export interface ModuleJobBaseInput {
  projectId: string;
  idempotencyKey: string;
  ai: { provider: (typeof aiProviderIds)[number]; model: string };
}

// Bản ghi job generic: input/output lưu JSON thô, engine tự parse theo định nghĩa
// module tương ứng. Repo không phụ thuộc vào bất kỳ module cụ thể nào.
export interface ModuleJob {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  moduleKey: string;
  idempotencyKey: string;
  status: ModuleJobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  version: number;
  // Bản run được ghim làm "chính thức" cho dự án (ưu tiên khi nối luồng/preset).
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
