import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ moduleKey: string; jobId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { jobId } = await context.params;
    const job = await getModuleJobService().get(identity, jobId);
    return Response.json(
      { job },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Sửa & lưu đầu ra đã tinh chỉnh của một run.
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { jobId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      output?: unknown;
    };
    if (
      !body.output ||
      typeof body.output !== "object" ||
      Array.isArray(body.output)
    ) {
      throw new ValidationError(
        "MODULE_OUTPUT_INVALID",
        "Thiếu nội dung đầu ra để lưu.",
      );
    }
    const job = await getModuleJobService().updateOutput(
      identity,
      jobId,
      body.output as Record<string, unknown>,
    );
    return Response.json(
      { job },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
