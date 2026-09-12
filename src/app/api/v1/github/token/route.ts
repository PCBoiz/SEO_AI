import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { ketNoiGitHub, luuTokenGitHub, xoaTokenGitHub } from "@/lib/dung-web/github.server";
import { LoiGitHub } from "@/lib/dung-web/github-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Token GitHub của người dùng — để đẩy web khách lên kho.
 *
 * Token KHÔNG BAO GIỜ đi ngược ra trình duyệt: GET chỉ trả tên tài khoản và
 * thời điểm lưu. POST kiểm token với GitHub trước khi lưu, nên token sai báo
 * ngay tại ô nhập.
 */
export async function GET(): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    return Response.json({ ketNoi: await ketNoiGitHub(identity) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const than = (await request.json().catch(() => ({}))) as { token?: string };
    const ketNoi = await luuTokenGitHub(identity, String(than.token ?? ""));
    return Response.json({ ketNoi }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LoiGitHub) {
      return Response.json({ error: { code: "GITHUB", message: error.message } }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return errorResponse(error);
  }
}

export async function DELETE(): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    return Response.json({ daXoa: await xoaTokenGitHub(identity) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
