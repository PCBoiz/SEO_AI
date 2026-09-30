import { tuKiemAnh } from "@/lib/google/tu-kiem-anh.server";
import { tuKiemXemTruoc } from "@/lib/dung-web/tu-kiem-xem-truoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Nhịp tim của máy chủ, và chỗ TỰ KIỂM những thứ chỉ hỏng ở nơi khác.
 *
 * `?kiem=xem-truoc` · `?kiem=anh` · `?kiem=tat-ca`
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHẢI GỌI ĐƯỢC TỪ NGOÀI
 *
 * Hai tính năng dưới đây phụ thuộc vào những thứ **không cổng kiểm nào chạm
 * tới**: tệp mà bộ dò của Next phải gói theo (`outputFileTracingIncludes`) và
 * một thư viện nhị phân phải nạp đúng cách. Cả hai từng hỏng RIÊNG trên
 * Vercel trong khi ở máy vẫn xanh. Mà mọi màn của ứng dụng đều đòi đăng nhập,
 * nên từ ngoài chỉ thấy 401 — 401 chứng minh tuyến CÓ, không chứng minh nó
 * CHẠY.
 *
 * KHÔNG chạy mặc định: Playwright và Vercel gõ tuyến này liên tục để biết máy
 * chủ sẵn sàng chưa, mà mỗi lượt tự kiểm tốn vài chục mili giây CPU.
 *
 * Hỏng thì trả **503**, không phải 200 kèm cờ: bộ theo dõi ngoài đọc mã trạng
 * thái, không đọc thân phản hồi.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function GET(request: Request): Promise<Response> {
  const than: Record<string, unknown> = {
    status: "ok",
    service: "antigravity-os",
    version: process.env.npm_package_version ?? "0.1.0",
    timestamp: new Date().toISOString(),
  };

  const kiem = new URL(request.url).searchParams.get("kiem");
  if (!kiem) {
    return Response.json(than, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  const tatCa = kiem === "tat-ca";
  let dat = true;
  if (tatCa || kiem === "xem-truoc") {
    const kq = await tuKiemXemTruoc();
    than.xemTruoc = kq;
    dat &&= kq.ok;
  }
  if (tatCa || kiem === "anh") {
    const kq = await tuKiemAnh();
    than.anh = kq;
    dat &&= kq.ok;
  }
  // Tên phép kiểm lạ: nói ra thay vì lặng lẽ trả "ok" — một lượt gõ sai tên
  // mà vẫn xanh là cách chắc chắn để tin nhầm là đã kiểm.
  if (than.xemTruoc === undefined && than.anh === undefined) {
    return Response.json(
      { ...than, status: "khong-hieu", coThe: ["xem-truoc", "anh", "tat-ca"] },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!dat) than.status = "hong";
  return Response.json(than, { status: dat ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
