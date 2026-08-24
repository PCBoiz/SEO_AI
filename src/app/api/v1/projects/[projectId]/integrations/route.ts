import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { listSocialIntegrationStatus } from "@/lib/integrations/integration-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

// Trạng thái tích hợp mạng xã hội của dự án (không bao giờ trả token).
export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { projectId } = await context.params;
    const integrations = await listSocialIntegrationStatus(
      identity.workspaceId,
      projectId,
    );
    return Response.json(
      { integrations },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
