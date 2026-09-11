import { z } from "zod";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { lietKeAnh } from "@/lib/google/drive.server";
import { layThuMucAnh, noiThuMucAnh } from "@/lib/integrations/drive-folder.server";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ảnh trong thư mục Drive của dự án.
 *
 * Mọi thành viên workspace xem được (ảnh dự án là tài sản chung), nhưng đọc
 * bằng token của NGƯỜI ĐÃ NỐI thư mục — nên chỉ thấy đúng thư mục đó.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { projectId } = await params;
    await getProjectService().get(identity, projectId);

    const tm = await layThuMucAnh(projectId);
    if (!tm) return Response.json({ daNoi: false }, { headers: { "Cache-Control": "no-store" } });

    const kq = await lietKeAnh({ workspaceId: identity.workspaceId, userId: tm.userId }, tm.folderId);
    return Response.json(
      {
        daNoi: true,
        thuMuc: { id: tm.folderId, ten: tm.ten, url: `https://drive.google.com/drive/folders/${tm.folderId}` },
        ...(kq.trangThai === "ok"
          ? { anh: kq.duLieu }
          : {
              loi:
                kq.trangThai === "loi" || kq.trangThai === "can-ket-noi-lai"
                  ? kq.lyDo
                  : kq.trangThai === "thieu-quyen"
                    ? `Token Google của người nối thư mục thiếu quyền: ${kq.quyenConThieu.join(", ")}.`
                    : "Người nối thư mục chưa kết nối Google.",
            }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

const thanNoi = z.object({ link: z.string().trim().min(1).max(2_000) });

/** Nối (hoặc đổi) thư mục ảnh của dự án. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const identity = await requirePermission("project.update");
    const { projectId } = await params;
    const { link } = thanNoi.parse(await request.json().catch(() => ({})));
    const kq = await noiThuMucAnh(identity, projectId, link);
    if (kq.trangThai !== "ok") {
      return Response.json(
        { error: { code: "DRIVE_FOLDER_INVALID", message: kq.lyDo } },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({ thuMuc: kq.thuMuc }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
