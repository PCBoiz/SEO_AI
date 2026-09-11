import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { taoMaMoi } from "@/lib/lich-dang/lich-dang.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Sinh mã kích hoạt mới (mã cũ hết hiệu lực ngay). Chỉ chủ workspace. Trả về một lần. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.secrets.manage");
    const { projectId } = await params;
    const ma = await taoMaMoi(identity, projectId);
    return Response.json({ ma }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
