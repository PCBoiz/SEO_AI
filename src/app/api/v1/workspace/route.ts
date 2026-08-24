import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { getWorkspaceService } from "@/lib/workspaces/workspace-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const workspace = await getWorkspaceService().get(identity);
    return Response.json(
      { workspace },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.update");
    const input = await readJson(request);
    const workspace = await getWorkspaceService().update(identity, input);
    return Response.json(
      { workspace },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("INVALID_JSON", "Request body must contain valid JSON.");
  }
}
