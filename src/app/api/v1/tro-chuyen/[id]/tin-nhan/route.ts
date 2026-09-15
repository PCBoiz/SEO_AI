import { requirePermission } from "@/lib/auth/dal";
import { getTroChuyenService, phanHoiLoiTroChuyen } from "@/lib/tro-chuyen/tro-chuyen-service.server";
import { xemCuoc, xemTin } from "@/domain/tro-chuyen/xem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Một lượt = một lần gọi model (thường 3–20 giây, model chậm tới ~60). Nhà cung
 * cấp bị cắt ở 90 s (xem tro-chuyen-service.server) — 120 chừa chỗ cho đọc/ghi.
 * Dự án Vercel này đã chạy tuyến `maxDuration = 300` từ 24/08.
 */
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      noiDung?: unknown;
      provider?: unknown;
      guiLai?: unknown;
    };
    const kq = await getTroChuyenService(identity).gui(identity, id, {
      noiDung: body.noiDung,
      provider: typeof body.provider === "string" && body.provider ? body.provider : null,
      guiLai: body.guiLai === true,
    });
    return Response.json(
      { troChuyen: xemCuoc(kq.cuoc), tinNguoiDung: xemTin(kq.tinNguoiDung), tinTroLy: xemTin(kq.tinTroLy) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return phanHoiLoiTroChuyen(error);
  }
}
