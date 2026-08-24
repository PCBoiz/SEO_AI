import { z } from "zod";
import { ValidationError } from "@/domain/shared/app-error";

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Chỉ dùng chữ thường, số và dấu gạch ngang đơn."),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export function parseUpdateWorkspaceInput(input: unknown): UpdateWorkspaceInput {
  const result = updateWorkspaceSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(
      "INVALID_WORKSPACE_PAYLOAD",
      "Cài đặt workspace không hợp lệ.",
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
