import { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const than = z.object({ xacNhanTen: z.string().max(200) });

/**
 * Xoá HẲN một dự án. Khác `DELETE /projects/[id]` (chỉ lưu trữ, lấy lại được).
 *
 * POST chứ không phải DELETE: thao tác cần một thân yêu cầu (tên xác nhận), và
 * DELETE có thân là thứ nhiều lớp trung gian bỏ rơi. Chỉ chủ workspace
 * (`project.delete`) — biên tập viên không có quyền này.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("project.delete");
    const { projectId } = await params;
    const { xacNhanTen } = than.parse(await request.json().catch(() => ({})));
    await getProjectService().deletePermanently(identity, projectId, xacNhanTen);
    return Response.json({ daXoa: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
