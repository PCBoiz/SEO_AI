import { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import {
  setSocialIntegration,
  socialIntegrationTypes,
} from "@/lib/integrations/integration-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string; type: string }>;
}

const bodySchema = z.object({
  config: z.record(z.string(), z.string().trim().max(300)).default({}),
  secret: z.string().min(1).max(4_096),
});

// Lưu token tích hợp theo dự án (mã hoá vault; token không bao giờ trả lại).
export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId, type } = await context.params;
    const parsedType = z.enum(socialIntegrationTypes).parse(type);
    const body = bodySchema.parse(await request.json());
    await setSocialIntegration(
      identity.workspaceId,
      projectId,
      parsedType,
      body.config,
      body.secret,
    );
    return Response.json(
      { configured: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
