import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { ValidationError } from "@/domain/shared/app-error";
import { getModuleJobService } from "@/lib/modules/module-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ moduleKey: string }>;
}

// Trả bối cảnh dự án cho một module: preset reload + bối cảnh chung + module
// upstream đã có kết quả. Dùng để runner tự điền và hiển thị nối luồng.
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { moduleKey } = await context.params;
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      throw new ValidationError(
        "PROJECT_ID_REQUIRED",
        "Thiếu projectId để lấy ngữ cảnh module.",
      );
    }
    const data = await getModuleJobService().getContext(
      identity,
      projectId,
      moduleKey,
    );
    return Response.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
