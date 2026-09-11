import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { luuCauHinhLich, trangThaiLich } from "@/lib/lich-dang/lich-dang.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

/** Trạng thái lịch + sổ lượt gần đây — cho thẻ trên trang dự án. */
export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const { projectId } = await params;
    return Response.json(await trangThaiLich(identity, projectId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Lưu cấu hình. Người lưu trở thành người "sở hữu" lịch (khoá AI + token
 * Google của họ chạy lịch). Lần lưu đầu trả kèm `maMoi` — mã kích hoạt, chỉ
 * hiện ĐÚNG MỘT LẦN, để dán vào crontab trên VPS.
 */
export async function PUT(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId } = await params;
    const kq = await luuCauHinhLich(identity, projectId, await request.json().catch(() => ({})));
    if (kq.trangThai !== "ok") {
      return Response.json(
        { error: { code: "LICH_DANG_INVALID", message: kq.lyDo } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({ ok: true, maMoi: kq.maMoi }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
