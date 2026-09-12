import { errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { dungWebChoDuAn } from "@/lib/dung-web/tu-job.server";
import { trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";
import { taoMoiTruongMay } from "@/infrastructure/dung-web/moi-truong-may";
import { ghiThongTinWeb } from "@/lib/dung-web/thong-tin-web.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/**
 * Trên Vercel tuyến này từ chối ngay (xem dưới) nên thời lượng ở đó không
 * quan trọng; ở máy (nơi nó thật sự chạy, `npm install` vài phút) Next dev
 * không cắt theo con số này. Để 60 cho khớp giới hạn thấp nhất của mọi gói
 * Vercel — không có lý do gì để đòi hơn.
 */
export const maxDuration = 60;

type Ctx = { params: Promise<{ projectId: string }> };

/**
 * Bật máy chủ xem trước cho website vừa dựng.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CHỈ CHẠY KHI ANTIGRAVITY CHẠY TRÊN MÁY. Trên Vercel, hệ thống tệp chỉ đọc và
 * hàm bị cắt sau vài phút — `npm install` cho một dự án Next.js không có cửa
 * (đã đo 09/09/2026). Tuyến này TỪ CHỐI THẲNG ở đó thay vì chạy rồi chết giữa
 * chừng với một lỗi không nói lên điều gì.
 *
 * Người dùng trên bản Vercel vẫn có đường đi trọn vẹn: tải .zip về máy, giải
 * nén, `npm install && npm run dev`. README trong tệp nén ghi đúng hai lệnh đó.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function POST(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const { projectId } = await params;

    if (process.env.VERCEL) {
      return Response.json(
        {
          chayDuoc: false,
          lyDo:
            "Bản chạy trên Vercel không dựng được website khách (ổ đĩa chỉ đọc, hàm bị cắt giờ). " +
            "Tải mã nguồn .zip về máy rồi chạy `npm install` và `npm run dev` — README trong tệp nén có hướng dẫn.",
        },
        { status: 501, headers: { "Cache-Control": "no-store" } },
      );
    }

    const than = (await request.json().catch(() => ({}))) as {
      dienThoai?: string;
      zalo?: string;
      anhMoDau?: string;
      /** Dựng lại từ đầu dù đang có phiên chạy (sau khi sửa chữ, đổi số…). */
      dungLai?: boolean;
    };

    // Mã dự án dùng làm TÊN THƯ MỤC trên đĩa: chỉ cho chữ–số–gạch, và luôn
    // kèm tiền tố, để không có đường nào từ dữ liệu người dùng ra ngoài thư
    // mục làm việc.
    const ma = `du-an-${projectId.replace(/[^A-Za-z0-9_-]/g, "")}`;
    const may = taoMoiTruongMay();

    // Đang chạy rồi thì trả ngay địa chỉ cũ: dựng lại tốn vài phút, và người
    // dùng bấm hai lần không đáng bị phạt bằng ngần ấy thời gian. Muốn dựng
    // lại sau khi sửa thì gửi `dungLai`.
    const dangCo = may.dangXemTruoc(ma);
    if (dangCo && !than.dungLai) {
      return Response.json(
        { chayDuoc: true, url: dangCo, dangChay: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const dienThoai = String(than.dienThoai ?? "").trim();
    if (!/^[0-9+ ().-]{8,20}$/.test(dienThoai)) {
      return Response.json(
        { chayDuoc: false, lyDo: "Thiếu số điện thoại thật — mọi nút gọi trong mã dùng số này." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const duAn = await getProjectService().get(identity, projectId);
    const bangKhach = await trangThaiBangKhach(identity, projectId).catch(() => ({ daLap: false as const }));
    const anhMoDau = String(than.anhMoDau ?? "").trim() || undefined;
    await ghiThongTinWeb(projectId, { dienThoai, zalo: String(than.zalo ?? ""), anhMoDau }).catch(() => undefined);
    const kq = await dungWebChoDuAn(
      identity,
      projectId,
      {
        dienThoai,
        zalo: String(than.zalo ?? "").trim(),
        diaChi: duAn.website,
        webhookKhach: bangKhach.daLap ? `${new URL(request.url).origin}${bangKhach.webhookUrl}` : undefined,
      },
      true,
      anhMoDau,
    );
    if (!kq) {
      return Response.json(
        { chayDuoc: false, lyDo: "Chưa có kiến trúc — chạy luồng «Dựng website — bản nháp» trước." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    // Dựng lại: tắt phiên cũ trước, nếu không `next dev` thứ hai đụng cùng
    // thư mục `.next` và cả hai cùng hỏng.
    if (dangCo) await may.dongXemTruoc(ma);
    await may.chuanBi(ma, kq.cay);
    const phien = await may.moXemTruoc(ma);

    return Response.json(
      { chayDuoc: true, url: phien.url, soTep: kq.danhSachTep.length, thieu: kq.hopDong.thieu },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/** Tắt máy chủ xem trước và thu hồi cổng. */
export async function DELETE(_request: Request, { params }: Ctx): Promise<Response> {
  try {
    await requirePermission("pipeline.run");
    const { projectId } = await params;
    if (process.env.VERCEL) return Response.json({ ok: true });
    const ma = `du-an-${projectId.replace(/[^A-Za-z0-9_-]/g, "")}`;
    // `dongXemTruoc`, KHÔNG phải `moXemTruoc().dong()` — cái sau sẽ BẬT một
    // máy chủ mới (mất cả phút) rồi mới tắt nó.
    const daTat = await taoMoiTruongMay().dongXemTruoc(ma);
    return Response.json({ ok: true, daTat }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
