import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { guiThuMotDong } from "@/lib/integrations/lead-sheet.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ghi một dòng thử vào bảng khách — kiểm riêng đoạn Antigravity → Google,
 * không đi qua website. Xem `guiThuMotDong`.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("project.update");
    const { projectId } = await params;
    const kq = await guiThuMotDong(identity, projectId);
    if (kq.trangThai !== "ok") {
      return Response.json(
        { error: { code: "LEAD_SHEET_TEST_FAILED", message: kq.lyDo } },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
