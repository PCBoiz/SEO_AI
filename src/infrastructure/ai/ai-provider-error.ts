import { AppError } from "@/domain/shared/app-error";

export class AiProviderError extends AppError {
  constructor(
    code: string,
    message: string,
    details: Record<string, unknown> = {},
    cause?: unknown,
  ) {
    super(code, message, { status: 502, details, cause });
  }
}
