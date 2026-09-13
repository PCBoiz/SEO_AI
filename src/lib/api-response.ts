import { ZodError } from "zod";
import { AppError } from "@/domain/shared/app-error";
import { logger } from "@/infrastructure/observability/logger";

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      } satisfies ErrorEnvelope,
      { status: error.status },
    );
  }

  // Zod parse trực tiếp trong route (không qua AppError) → 400 kèm chi tiết
  // trường lỗi thay vì 500 chung chung.
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dữ liệu yêu cầu không hợp lệ.",
          details: {
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
      } satisfies ErrorEnvelope,
      { status: 400 },
    );
  }

  // Lỗi KHÔNG BIẾT → 500 — và PHẢI ghi nhật ký. Bản trước trả 500 mà không
  // ghi gì: 13/09/2026 `/api/v1/sitemap-jobs` trả 500 trên bản build, nhật ký
  // máy chủ trống hoàn toàn — không cách nào biết vì sao ngoài việc gọi lại
  // tầng dịch vụ bằng tay. Người dùng chỉ thấy "lỗi không mong muốn".
  logger.error(
    {
      err: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
    },
    "API trả 500: lỗi không thuộc AppError/ZodError",
  );
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Đã xảy ra lỗi không mong muốn.",
        details: {},
      },
    } satisfies ErrorEnvelope,
    { status: 500 },
  );
}
