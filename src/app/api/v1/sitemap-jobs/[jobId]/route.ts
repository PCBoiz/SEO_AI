import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { getSitemapPilotService } from "@/lib/sitemap/sitemap-pilot-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { jobId } = await context.params;
    const job = await getSitemapPilotService().get(identity, jobId);
    return Response.json(
      { job },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Sửa & lưu sitemap đã chọn (bản chữ người dùng chỉnh).
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { jobId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      selectedSitemap?: unknown;
    };
    if (typeof body.selectedSitemap !== "string") {
      throw new ValidationError(
        "SITEMAP_PAYLOAD_INVALID",
        "Thiếu nội dung sitemap để lưu.",
      );
    }
    const job = await getSitemapPilotService().updateSitemap(
      identity,
      jobId,
      body.selectedSitemap,
    );
    return Response.json(
      { job },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
