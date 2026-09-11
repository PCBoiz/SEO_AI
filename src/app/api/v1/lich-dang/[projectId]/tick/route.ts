import { after } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { goNhip } from "@/lib/lich-dang/lich-dang.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Bước chạy trong `after()` — một lượt gọi AI tới 120 giây, có thể gọi lại một lần.
export const maxDuration = 300;

/**
 * Nhịp gõ của lịch đăng bài. VPS gọi mỗi 10 phút:
 *
 *   curl -s -X POST -H "Authorization: Bearer <mã>" https://<app>/api/v1/lich-dang/<projectId>/tick
 *
 * KHÔNG CÓ PHIÊN ĐĂNG NHẬP — mã kích hoạt sinh lúc lưu lịch, lưu mã hoá. Sai
 * mã hay chưa lập đều trả 401 cùng một câu (không kể cho kẻ dò projectId nào có thật).
 *
 * Trả lời NGAY sau khi tạo job; bước chạy trong `after()`, rồi tự gõ tiếp.
 * Thân trả lời là để đọc trong log crontab, không phải hợp đồng cho ai.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  try {
    const { projectId } = await params;
    const auth = request.headers.get("authorization") ?? "";
    const ma = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
    const goc = new URL(request.url).origin;

    // Lượt tự gõ tiếp mang header riêng — để phân biệt với VPS: chỉ VPS mới
    // là lưới an toàn, và thẻ trên trang dự án phải nói được "VPS chưa gõ".
    const nguon = request.headers.get("x-lich-dang-tu-go") ? "tu-go" : "vps";
    const kq = await goNhip(projectId, ma, { goc, nguon });
    if (kq.trangThai === "sai-ma" || kq.trangThai === "chua-lap") {
      return Response.json(
        { error: { code: "LICH_DANG_UNAUTHORIZED", message: "Mã kích hoạt không đúng." } },
        { status: 401 },
      );
    }
    if (kq.trangThai === "da-tao") {
      const { chay, ...conLai } = kq;
      after(chay);
      return Response.json(conLai, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(kq, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
