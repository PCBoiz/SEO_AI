import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const keys = await getAiKeyService().listStatus(identity.userId);
    return Response.json({ keys }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const body = await readJson(request);
    const modelValue = (body as Record<string, unknown> | null)?.model;
    // Service tự kiểm tra provider hợp lệ + key hợp lệ và mã hoá bằng Vault.
    const key = await getAiKeyService().saveKey(
      identity.userId,
      readField(body, "provider"),
      readField(body, "apiKey"),
      typeof modelValue === "string" ? modelValue : undefined,
    );
    return Response.json(
      { key },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const body = await readJson(request);
    const deleted = await getAiKeyService().deleteKey(
      identity.userId,
      readField(body, "provider"),
    );
    return Response.json(
      { deleted },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function readField(body: unknown, field: string): string {
  const value = (body as Record<string, unknown> | null)?.[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("MISSING_FIELD", `Thiếu trường ${field}.`, {
      field,
    });
  }
  return value;
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
