import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { projectId } = await context.params;
    const project = await getProjectService().get(identity, projectId);
    return Response.json(
      { project },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("project.update");
    const { projectId } = await context.params;
    const input = await readJson(request);
    const project = await getProjectService().update(identity, projectId, input);
    return Response.json(
      { project },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const identity = await requirePermission("project.delete");
    const { projectId } = await context.params;
    const project = await getProjectService().archive(identity, projectId);
    return Response.json(
      { project },
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
    throw new ValidationError(
      "INVALID_JSON",
      "Nội dung yêu cầu phải là JSON hợp lệ.",
    );
  }
}
