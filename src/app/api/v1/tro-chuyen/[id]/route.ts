import { requirePermission } from "@/lib/auth/dal";
import { getTroChuyenService, phanHoiLoiTroChuyen } from "@/lib/tro-chuyen/tro-chuyen-service.server";
import { xemCuoc, xemTin } from "@/domain/tro-chuyen/xem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const { id } = await params;
    const { cuoc, tin } = await getTroChuyenService(identity).mo(identity, id);
    return Response.json(
      { troChuyen: xemCuoc(cuoc), tinNhan: tin.map(xemTin) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return phanHoiLoiTroChuyen(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { id } = await params;
    await getTroChuyenService(identity).xoa(identity, id);
    return Response.json({ daXoa: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return phanHoiLoiTroChuyen(error);
  }
}
