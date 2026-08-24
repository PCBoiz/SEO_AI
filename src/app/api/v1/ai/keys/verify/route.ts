import { aiProviderIds, type AiProviderId } from "@/domain/ai/ai-model-provider";
import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { verifyUserAiKey } from "@/lib/ai/ai-key-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const body = await readJson(request);
    const provider = readProvider(body);
    const modelValue = (body as Record<string, unknown> | null)?.model;
    const result = await verifyUserAiKey(
      identity.userId,
      provider,
      typeof modelValue === "string" ? modelValue : undefined,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

function readProvider(body: unknown): AiProviderId {
  const value = (body as { provider?: unknown } | null)?.provider;
  if (
    typeof value !== "string" ||
    !(aiProviderIds as readonly string[]).includes(value)
  ) {
    throw new ValidationError(
      "AI_PROVIDER_UNKNOWN",
      "AI provider không hợp lệ.",
    );
  }
  return value as AiProviderId;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError(
      "INVALID_JSON",
      "Nội dung yêu cầu phải là JSON hợp lệ.",
    );
  }
}
