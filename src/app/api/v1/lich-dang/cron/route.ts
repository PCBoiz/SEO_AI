import { after } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { CAU_CRON_CHUA_BAT, kiemMaCron } from "@/lib/lich-dang/cron";
import { goNhipTatCa } from "@/lib/lich-dang/lich-dang.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Như tuyến gõ từng dự án: bước chạy trong `after()`, một lượt gọi AI tới 120 giây.
export const maxDuration = 300;

/**
 * Nhịp gõ từ CRON CỦA VERCEL cho mọi dự án đang bật lịch.
 *
 * `vercel.json` → `crons` trỏ vào đây; Vercel gọi GET kèm
 * `Authorization: Bearer <CRON_SECRET>`. Vì sao có tuyến này, giới hạn của
 * gói Hobby, và cái bẫy giờ hẹn: xem khối CRON trong `lich-dang.server.ts`.
 *
 * Trả lời NGAY sau khi tạo job cho từng dự án; các bước chạy trong `after()`
 * rồi tự gõ tiếp. Thân trả lời để đọc trong log cron của Vercel.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const kiem = kiemMaCron(request.headers.get("authorization"), process.env.CRON_SECRET);
    if (kiem === "chua-bat") {
      return Response.json(
        { error: { code: "CRON_CHUA_BAT", message: CAU_CRON_CHUA_BAT } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (kiem === "sai") {
      return Response.json(
        { error: { code: "CRON_UNAUTHORIZED", message: "Mã cron không đúng." } },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const goc = new URL(request.url).origin;
    const ketQua = await goNhipTatCa({ goc });
    for (const k of ketQua) if (k.chay) after(k.chay);

    return Response.json(
      {
        luc: new Date().toISOString(),
        lichTrigger: request.headers.get("x-vercel-cron-schedule"),
        soDuAn: ketQua.length,
        ketQua: ketQua.map(({ projectId, trangThai }) => ({ projectId, trangThai })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
