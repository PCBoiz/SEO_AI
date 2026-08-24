import { after } from "next/server";
import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { runModuleJobAppNative } from "@/lib/modules/module-engine.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// after() chạy trong cùng invocation — cần đủ thời gian cho nhiều lần gọi model.
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ moduleKey: string }>;
}

// Lịch sử run của module trong dự án (mới → cũ) — cho panel preset/ghim.
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { moduleKey } = await context.params;
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      throw new ValidationError(
        "PROJECT_ID_REQUIRED",
        "Thiếu projectId để xem lịch sử.",
      );
    }
    const limit = Number(url.searchParams.get("limit") ?? "10");
    const jobs = await getModuleJobService().listHistory(
      identity,
      projectId,
      moduleKey,
      Number.isFinite(limit) ? limit : 10,
    );
    return Response.json(
      { jobs },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { moduleKey } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      input?: unknown;
    };
    const rawInput =
      body && typeof body === "object" && "input" in body ? body.input : body;
    const job = await getModuleJobService().create(identity, moduleKey, rawInput);
    // Trả response ngay (UI polling); phần gọi model chạy nền bằng key BYOK.
    if (["queued", "dispatching"].includes(job.status)) {
      const { workspaceId, userId } = identity;
      after(() => runModuleJobAppNative(workspaceId, userId, job.id));
    }
    return Response.json(
      { job },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
