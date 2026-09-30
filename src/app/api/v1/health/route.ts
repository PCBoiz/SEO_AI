import { tuKiemXemTruoc } from "@/lib/dung-web/tu-kiem-xem-truoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Nhịp tim của máy chủ.
 *
 * `?kiem=xem-truoc` chạy thêm một lượt TỰ KIỂM bộ xem thử website — xem
 * `lib/dung-web/tu-kiem-xem-truoc.ts` để biết vì sao phép kiểm ấy phải gọi
 * được TỪ NGOÀI (tuyến xem thử thật đòi đăng nhập nên từ ngoài chỉ thấy 401).
 *
 * KHÔNG chạy mặc định: Playwright và Vercel gõ tuyến này liên tục để biết máy
 * chủ đã sẵn sàng chưa, mà một lượt tự kiểm tốn vài chục mili giây CPU. Phép
 * kiểm chỉ chạy khi có ai hỏi đúng câu hỏi ấy.
 *
 * Hỏng thì trả **503**, không phải 200 kèm cờ: bộ theo dõi ngoài (UptimeRobot
 * và các dịch vụ cùng loại) đọc mã trạng thái, không đọc thân phản hồi.
 */
export async function GET(request: Request): Promise<Response> {
  const than: Record<string, unknown> = {
    status: "ok",
    service: "antigravity-os",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  };

  if (new URL(request.url).searchParams.get("kiem") === "xem-truoc") {
    const kq = await tuKiemXemTruoc();
    than.xemTruoc = kq;
    if (!kq.ok) than.status = "hong";
    return Response.json(than, {
      status: kq.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return Response.json(than, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
