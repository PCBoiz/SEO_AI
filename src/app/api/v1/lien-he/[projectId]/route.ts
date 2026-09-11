import { errorResponse } from "@/lib/api-response";
import { docThanKhach, nhanKhach } from "@/lib/integrations/lead-sheet.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cổng nhận khách liên hệ từ website → Google Sheets.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KHÔNG CÓ PHIÊN ĐĂNG NHẬP. Website gọi từ máy chủ của nó, mang token chia sẻ
 * trong `Authorization: Bearer <token>`. Token sinh lúc lập bảng, lưu mã hoá
 * trong `project_integrations`, so theo thời gian hằng số.
 *
 * ⚠️ TRẢ 401 CHO CẢ "SAI TOKEN" LẪN "CHƯA LẬP BẢNG". Hai câu khác nhau với
 * chủ dự án, nhưng với kẻ dò thì "chưa lập" là gợi ý rằng projectId này có
 * thật. Chủ dự án có trang dự án để biết mình đã lập hay chưa; cổng này không
 * cần kể.
 *
 * Phản hồi thành công CỐ Ý tối giản: `{ ok: true }`. Website chỉ kiểm
 * `response.ok` (đọc `dang-ky-action.ts` bên kho site) và không cần gì hơn.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { projectId } = await params;
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) {
      return Response.json(
        { error: { code: "LIEN_HE_UNAUTHORIZED", message: "Thiếu token." } },
        { status: 401 },
      );
    }

    const khach = docThanKhach(await request.json().catch(() => ({})));
    const kq = await nhanKhach(projectId, token, khach);

    switch (kq.trangThai) {
      case "ok":
        return Response.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
      case "sai-token":
      case "chua-lap":
        return Response.json(
          { error: { code: "LIEN_HE_UNAUTHORIZED", message: "Token không đúng." } },
          { status: 401 },
        );
      case "khong-ghi-duoc":
        // 502: lỗi ở phía Google, không phải ở website gọi. Website sẽ báo khách
        // "chưa gửi được, gọi trực tiếp" — đúng câu nó đã có sẵn cho trường hợp
        // webhook trả không-ok.
        return Response.json(
          { error: { code: "LIEN_HE_SHEET_FAILED", message: kq.lyDo } },
          { status: 502 },
        );
    }
  } catch (error) {
    return errorResponse(error);
  }
}
