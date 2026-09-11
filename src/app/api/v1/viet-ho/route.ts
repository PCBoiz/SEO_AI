import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { lichSuVietHo } from "@/lib/ai/viet-ho.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lịch sử AI viết hộ cho một ô: `?projectId=…&truong=…`.
 *
 * Viết hộ thì đi qua cổng job chung (`POST /api/v1/modules/RIS_VIET_HO/jobs`)
 * — cùng đường với mọi module, cùng khoá BYOK, cùng cách hỏi trạng thái.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim();
    const truong = url.searchParams.get("truong")?.trim();
    if (!projectId || !truong) {
      throw new ValidationError("VIET_HO_PARAMS", "Thiếu projectId hoặc truong.");
    }
    const lichSu = await lichSuVietHo(identity, projectId, truong);
    return Response.json({ lichSu }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
