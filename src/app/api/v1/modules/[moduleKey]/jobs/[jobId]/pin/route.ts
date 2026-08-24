import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ moduleKey: string; jobId: string }>;
}

// Ghim run này làm bản "chính thức" của module trong dự án (nối luồng + preset
// sẽ dùng nó thay vì bản mới nhất).
export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { moduleKey, jobId } = await context.params;
    await getModuleJobService().pin(identity, moduleKey, jobId);
    return Response.json(
      { pinned: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Bỏ ghim: quay lại hành vi mặc định (dùng bản thành công mới nhất).
export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { moduleKey, jobId } = await context.params;
    const service = getModuleJobService();
    const job = await service.get(identity, jobId);
    await service.pin(identity, moduleKey, null, job.projectId);
    return Response.json(
      { pinned: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
