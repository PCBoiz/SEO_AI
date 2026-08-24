import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const projects = await getProjectService().list(identity);
    return Response.json(
      { projects },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("project.create");
    const input = await readJson(request);
    const project = await getProjectService().create(identity, input);
    return Response.json(
      { project },
      { status: 201, headers: { "Cache-Control": "no-store" } },
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
