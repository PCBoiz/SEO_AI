import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { layThuNho } from "@/lib/google/drive.server";
import { layThuMucAnh } from "@/lib/integrations/drive-folder.server";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ảnh thu nhỏ của một ảnh trong thư mục Drive của dự án.
 *
 * ⚠️ Ba lớp chặn, đều bắt buộc: có phiên đăng nhập · dự án thuộc workspace của
 * người hỏi · tệp nằm trong ĐÚNG thư mục đã nối (kiểm trong `layThuNho`). Thiếu
 * lớp thứ ba là cửa đọc mọi tệp trong Drive của người đã nối thư mục.
 *
 * `Cache-Control: private` — ảnh của dự án, không cho CDN hay proxy chung giữ.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> },
): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const { projectId, fileId } = await params;
    await getProjectService().get(identity, projectId);

    const tm = await layThuMucAnh(projectId);
    if (!tm) return new Response("Chưa nối thư mục ảnh.", { status: 404 });

    const canh = Number(new URL(request.url).searchParams.get("s") ?? "400");
    const canhDai = Number.isFinite(canh) ? Math.min(Math.max(Math.round(canh), 64), 1600) : 400;

    const kq = await layThuNho(
      { workspaceId: identity.workspaceId, userId: tm.userId },
      tm.folderId,
      fileId,
      canhDai,
    );
    if (kq.trangThai !== "ok") {
      return new Response(kq.trangThai === "loi" ? kq.lyDo : "Không đọc được ảnh.", {
        status: kq.trangThai === "loi" ? 404 : 409,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(kq.duLieu.bytes, {
      headers: {
        "content-type": kq.duLieu.contentType,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
