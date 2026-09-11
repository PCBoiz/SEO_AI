import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { lapBangKhach, trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Trạng thái bảng khách của dự án — không lộ token. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("project.update");
    const { projectId } = await params;
    const trangThai = await trangThaiBangKhach(identity, projectId);
    return Response.json(trangThai, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Lập bảng khách: tạo Google Sheet + sinh token chia sẻ.
 *
 * Token chỉ trả về ĐÚNG MỘT LẦN, trong phản hồi này. Sau đó chỉ còn bản mã hoá
 * trong kho — muốn token mới thì lập lại (bảng cũ không bị xoá).
 *
 * ⚠️ CHỈ CHỦ WORKSPACE (`workspace.secrets.manage`), KHÔNG PHẢI `project.update`.
 * Lập bảng là quyết định dữ liệu cá nhân của khách chảy vào Drive CỦA AI — bảng
 * được tạo bằng token Google của người bấm. Biên tập viên có `project.update`;
 * nếu dùng quyền đó thì một biên tập viên bấm "Lập bảng mới" là từ đó mọi số
 * điện thoại khách đi vào tài khoản của họ, và chủ dự án không nhận được gì.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.secrets.manage");
    const { projectId } = await params;
    // Gốc lấy từ chính yêu cầu, để địa chỉ webhook đưa ra đúng nơi app đang
    // chạy (Vercel thật / xem thử / máy cục bộ) chứ không phải một biến cấu
    // hình có thể lệch.
    const goc = new URL(request.url).origin;
    const kq = await lapBangKhach(identity, projectId, goc);
    if (kq.trangThai !== "ok") {
      return Response.json(
        { error: { code: `LEAD_SHEET_${kq.trangThai.toUpperCase().replace(/-/g, "_")}`, message: kq.lyDo } },
        { status: kq.trangThai === "loi" ? 502 : 409, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(kq.duLieu, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
