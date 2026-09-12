import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { SO_ANH_TOI_DA, demAnhDrive, docHopDongWeb, dungWebChoDuAn } from "@/lib/dung-web/tu-job.server";
import { taoZip } from "@/lib/zip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

/**
 * Trạng thái bản dựng web của dự án — cho thẻ trên trang dự án.
 *
 * KHÔNG trả nội dung tệp: danh sách đường dẫn là đủ để người dùng biết mình
 * sắp tải về cái gì, và giữ phản hồi nhỏ.
 */
export async function GET(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const { projectId } = await params;
    const url = new URL(request.url);

    const hopDong = await docHopDongWeb(identity, projectId);
    if (!hopDong) {
      return Response.json(
        { coBanDung: false, lyDo: "Chưa có kiến trúc — chạy luồng «Dựng website — bản nháp» trước." },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const duAn = await getProjectService().get(identity, projectId);
    const thongTin = {
      dienThoai: url.searchParams.get("dienThoai")?.trim() || "0000 000 000",
      zalo: url.searchParams.get("zalo")?.trim() || "",
      diaChi: duAn.website,
    };

    // Tải về: `?tai=1`. Cùng một tuyến vì cả hai đều dựng lại từ cùng nguồn —
    // tách ra là hai chỗ phải giữ cho khớp nhau.
    if (url.searchParams.get("tai") === "1") {
      const kq = await dungWebChoDuAn(identity, projectId, thongTin);
      if (!kq) return errorResponse(new Error("Không dựng được."));
      const nen = taoZip(kq.cay.tep.map((t) => ({ duongDan: t.duongDan, noiDung: t.noiDung })));
      return new Response(new Uint8Array(nen), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${kq.tenTepNen}"`,
          "Content-Length": String(nen.length),
          "Cache-Control": "no-store",
        },
      });
    }

    // Trạng thái: KHÔNG tải ảnh (mỗi tấm một lượt gọi Drive + thu nhỏ, mất
    // vài giây) — chỉ đếm. Tải thật chỉ xảy ra lúc tải .zip hoặc xem trước.
    const [kq, soAnhDrive] = await Promise.all([
      dungWebChoDuAn(identity, projectId, thongTin, false),
      demAnhDrive(identity.workspaceId, projectId),
    ]);
    return Response.json(
      {
        coBanDung: true,
        soAnhDrive,
        soAnhSeDung: soAnhDrive === null ? 0 : Math.min(soAnhDrive, SO_ANH_TOI_DA),
        tenWebsite: hopDong.kienTruc.tenWebsite,
        soTrang: hopDong.kienTruc.trang.length,
        trang: hopDong.kienTruc.trang.map((t) => ({ duong: t.duong, tieuDe: t.tieuDe, soKhoi: t.khoi.length })),
        soTep: kq?.danhSachTep.length ?? 0,
        danhSachTep: kq?.danhSachTep ?? [],
        boQua: kq?.boQua ?? [],
        thieu: hopDong.thieu,
        duLieuCan: hopDong.kienTruc.duLieuCan,
        canVietMoi: hopDong.kienTruc.canVietMoi,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
