import { after } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { goNhip } from "@/lib/lich-dang/lich-dang.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * "Chạy thử ngay" từ trang dự án: mở một lượt cho hôm nay bất kể giờ đã đặt
 * (hoặc gõ tiếp lượt đang dở). Xác thực bằng phiên đăng nhập; các bước sau tự
 * nối bằng mã kích hoạt đang lưu — nên lần lưu đầu phải xong trước.
 *
 * Đây là cách thử cả luồng mà không phải đợi tới sáng mai.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId } = await params;
    const goc = new URL(request.url).origin;
    const kq = await goNhip(projectId, null, { identity, epMoLuot: true, goc });
    if (kq.trangThai === "da-tao") {
      const { chay, ...conLai } = kq;
      after(chay);
      return Response.json(conLai, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(kq, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
