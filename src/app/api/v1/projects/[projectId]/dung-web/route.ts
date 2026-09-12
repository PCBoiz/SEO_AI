import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { SO_ANH_TOI_DA, demAnhDrive, docHopDongWeb, dungWebChoDuAn } from "@/lib/dung-web/tu-job.server";
import { taoZip } from "@/lib/zip";
import { soatCayTep } from "@/domain/dung-web/soat-cay-tep";
import { trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";
import { docThongTinWeb, ghiThongTinWeb } from "@/lib/dung-web/thong-tin-web.server";

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
    // Dự án đã lập bảng khách thì điền sẵn địa chỉ nhận vào `.env.example` của
    // website sinh ra — khách để lại số trên web mới sẽ chảy về đúng bảng
    // Google Sheets đang dùng. KHÔNG kèm token (tệp nén có thể đi tới tay
    // khách); chủ dự án tự dán token lúc đưa web lên mạng.
    const bangKhach = await trangThaiBangKhach(identity, projectId).catch(() => ({ daLap: false as const }));
    // Số đã lưu từ lần dùng trước (tải/đẩy/xem thử) — thẻ điền sẵn, và trạng
    // thái soát bằng số thật thay vì số giữ chỗ.
    const daLuu = await docThongTinWeb(projectId).catch(() => null);
    const soGui = url.searchParams.get("dienThoai")?.trim();
    const coSoThat = Boolean(soGui || daLuu?.dienThoai);
    const thongTin = {
      dienThoai: soGui || daLuu?.dienThoai || "0000 000 000",
      zalo: url.searchParams.get("zalo")?.trim() ?? daLuu?.zalo ?? "",
      diaChi: duAn.website,
      webhookKhach: bangKhach.daLap ? `${url.origin}${bangKhach.webhookUrl}` : undefined,
    };

    // Tải về: `?tai=1`. Cùng một tuyến vì cả hai đều dựng lại từ cùng nguồn —
    // tách ra là hai chỗ phải giữ cho khớp nhau.
    if (url.searchParams.get("tai") === "1") {
      const kq = await dungWebChoDuAn(identity, projectId, thongTin);
      if (!kq) return errorResponse(new Error("Không dựng được."));
      if (soGui) await ghiThongTinWeb(projectId, { dienThoai: soGui, zalo: thongTin.zalo }).catch(() => undefined);
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
        // Xem thử cần máy có Node và ổ ghi được — trên Vercel không có. Nói
        // trước để thẻ khỏi bày một nút mà bấm vào chỉ nhận câu từ chối.
        xemTruocDuoc: !process.env.VERCEL,
        soAnhDrive,
        soAnhSeDung: soAnhDrive === null ? 0 : Math.min(soAnhDrive, SO_ANH_TOI_DA),
        tenWebsite: hopDong.kienTruc.tenWebsite,
        soTrang: hopDong.kienTruc.trang.length,
        trang: hopDong.kienTruc.trang.map((t) => ({ duong: t.duong, tieuDe: t.tieuDe, soKhoi: t.khoi.length })),
        soTep: kq?.danhSachTep.length ?? 0,
        // Tự soát: những lỗi `next build` không bắt (thiếu h1, ảnh không alt,
        // JSON-LD hỏng). Không chặn tải về — đây là lỗi của bộ sinh mã, chặn
        // thì người dùng kẹt mà không tự sửa được; nhưng phải nói ra.
        //
        // Chưa có số điện thoại (thẻ hỏi trạng thái trước khi người dùng điền)
        // thì bản dựng tạm dùng số giữ chỗ — luật "số giữ chỗ còn trong mã"
        // bắt đúng số đó và thẻ hiện một ô đỏ "lỗi của bộ dựng, gửi tôi ảnh
        // chụp". Không phải lỗi: số thật sẽ thay vào lúc tải/đẩy. Bỏ luật ấy
        // khỏi trạng thái khi chưa có số.
        soat: kq ? soatCayTep(kq.cay).filter((l) => coSoThat || !l.loi.includes("giữ chỗ")) : [],
        danhSachTep: kq?.danhSachTep ?? [],
        boQua: kq?.boQua ?? [],
        thieu: hopDong.thieu,
        // Không có URL website thì canonical/sitemap/thẻ chia sẻ trỏ vào
        // example.com — trang lên mạng vẫn chạy, nhưng Google và Zalo đọc sai
        // địa chỉ. Phải nói ra ở thẻ, vì không ai mở meta.ts để thấy.
        thieuTenMien: !duAn.website?.trim(),
        daLuu: daLuu ? { dienThoai: daLuu.dienThoai, zalo: daLuu.zalo } : null,
        duLieuCan: hopDong.kienTruc.duLieuCan,
        canVietMoi: hopDong.kienTruc.canVietMoi,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
