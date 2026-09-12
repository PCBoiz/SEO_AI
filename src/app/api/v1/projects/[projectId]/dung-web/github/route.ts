import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";
import { dayWebLenGitHub, ketNoiGitHub, khoWebCuaDuAn, xoaKhoWeb } from "@/lib/dung-web/github.server";
import { LoiGitHub } from "@/lib/dung-web/github-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Vài chục lượt gọi GitHub (mỗi tệp một blob) — vẫn xa trần, nhưng không phải vài giây. */
export const maxDuration = 120;

type Ctx = { params: Promise<{ projectId: string }> };

/**
 * Đẩy web khách lên GitHub để Cloudflare tự dựng.
 *
 * Đường đi không cần máy dựng: Antigravity (kể cả bản Vercel) chỉ gọi HTTP
 * tới GitHub; Cloudflare Workers Builds nối với kho đó tự cài, dựng, đưa lên
 * mạng mỗi khi có commit mới. Xem `domain/dung-web/github-day.ts`.
 */
export async function GET(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const { projectId } = await params;
    await getProjectService().get(identity, projectId);
    const [ketNoi, kho] = await Promise.all([ketNoiGitHub(identity), khoWebCuaDuAn(projectId)]);
    return Response.json({ ketNoi, kho }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId } = await params;
    const than = (await request.json().catch(() => ({}))) as { dienThoai?: string; zalo?: string };
    const dienThoai = String(than.dienThoai ?? "").trim();
    if (!/^[0-9+ ().-]{8,20}$/.test(dienThoai)) {
      return Response.json({ trangThai: "loi", lyDo: "Điền số điện thoại thật trước — mọi nút gọi trên web dùng số này." }, { status: 400 });
    }
    const duAn = await getProjectService().get(identity, projectId);
    const url = new URL(request.url);
    const bangKhach = await trangThaiBangKhach(identity, projectId).catch(() => ({ daLap: false as const }));
    const kq = await dayWebLenGitHub(identity, projectId, {
      dienThoai,
      zalo: String(than.zalo ?? "").trim() || undefined,
      diaChi: duAn.website,
      webhookKhach: bangKhach.daLap ? `${url.origin}${bangKhach.webhookUrl}` : undefined,
    });
    return Response.json(kq, { status: kq.trangThai === "ok" ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LoiGitHub) {
      return Response.json({ trangThai: "loi", lyDo: error.message }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return errorResponse(error);
  }
}

/** Bỏ liên kết kho (không xoá kho trên GitHub) — lần đẩy sau tạo/dùng kho theo tên. */
export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId } = await params;
    await getProjectService().get(identity, projectId);
    return Response.json({ daXoa: await xoaKhoWeb(projectId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
