import { requirePermission } from "@/lib/auth/dal";
import { getTroChuyenService, phanHoiLoiTroChuyen } from "@/lib/tro-chuyen/tro-chuyen-service.server";
import { xemCuoc } from "@/domain/tro-chuyen/xem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KHONG_DEM = { "Cache-Control": "no-store" };

/** Các cuộc trò chuyện CỦA NGƯỜI ĐANG ĐĂNG NHẬP, mới nhất trước. */
export async function GET(): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const ds = await getTroChuyenService(identity).danhSach(identity);
    return Response.json({ troChuyen: ds.map(xemCuoc) }, { headers: KHONG_DEM });
  } catch (error) {
    return phanHoiLoiTroChuyen(error);
  }
}

/** Mở cuộc mới, có thể gắn một dự án làm ngữ cảnh. Trò chuyện tốn AI nên cần quyền chạy. */
export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const body = (await request.json().catch(() => ({}))) as { projectId?: unknown };
    const cuoc = await getTroChuyenService(identity).tao(identity, {
      projectId: typeof body.projectId === "string" ? body.projectId : null,
    });
    return Response.json({ troChuyen: xemCuoc(cuoc) }, { status: 201, headers: KHONG_DEM });
  } catch (error) {
    return phanHoiLoiTroChuyen(error);
  }
}
