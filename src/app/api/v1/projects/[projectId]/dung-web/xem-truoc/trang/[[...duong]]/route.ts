import { randomBytes } from "node:crypto";
import { AppError } from "@/domain/shared/app-error";
import { requirePermission } from "@/lib/auth/dal";
import { banXemTruoc } from "@/lib/dung-web/xem-truoc-tinh.server";
import { tepTrongCay, veTrangTinh } from "@/lib/dung-web/ve-trang-tinh";
import { logger } from "@/infrastructure/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Lần đầu phải tải ≤8 ảnh Drive (song song, vài giây); các lần sau vài chục ms. */
export const maxDuration = 60;

type Ctx = { params: Promise<{ projectId: string; duong?: string[] }> };

/**
 * XEM THỬ TĨNH — trang website khách vẽ ngay trên máy chủ Antigravity.
 *
 * `…/xem-truoc/trang`            → trang chủ
 * `…/xem-truoc/trang/bang-gia`   → trang `/bang-gia`
 * `…/xem-truoc/trang/anh/x.webp` → ảnh trong `public/anh/`
 * `…/xem-truoc/trang/icon.svg`   → biểu tượng tab
 *
 * Trả HTML (kể cả khi lỗi) vì nơi nhận là một iframe: một khối JSON trong
 * khung xem thử thì người không rành không đọc được, còn một trang chữ có
 * câu "chưa có bản dựng — làm bước này trước" thì ai cũng hiểu.
 *
 * Chạy ở mọi nơi (Vercel lẫn máy) — khác tuyến `xem-truoc` cha (POST) là bản
 * `next dev` thật, chỉ chạy trên máy. Xem `lib/dung-web/ve-trang-tinh.ts`.
 */
export async function GET(request: Request, { params }: Ctx): Promise<Response> {
  try {
    const identity = await requirePermission("workspace.read");
    const { projectId, duong = [] } = await params;
    const url = new URL(request.url);
    const tienTo = `/api/v1/projects/${encodeURIComponent(projectId)}/dung-web/xem-truoc/trang`;

    const ban = await banXemTruoc(identity, projectId, { moi: url.searchParams.has("moi") });
    if (!ban) {
      return trangLoi("Chưa có bản dựng nào. Chạy luồng «Dựng website — bản nháp» (màn Quy trình) trước, rồi quay lại đây.", 404);
    }

    // Tài nguyên tĩnh — chỉ tên tệp chữ-số-gạch-chấm, tra đúng đường trong cây.
    if (duong[0] === "anh" && duong.length === 2 && /^[A-Za-z0-9._-]+$/.test(duong[1]!)) {
      return tepHoacKhong(tepTrongCay(ban.cay, `public/anh/${duong[1]}`));
    }
    if (duong.length === 1 && duong[0] === "icon.svg") {
      return tepHoacKhong(tepTrongCay(ban.cay, "src/app/icon.svg"));
    }

    const duongTrang = `/${duong.map((d) => decodeURIComponent(d)).join("/")}`;
    const nonce = randomBytes(16).toString("base64");
    const kq = await veTrangTinh(ban.cay, duongTrang, { tienTo, nonce });
    if (!kq.ok) {
      const khongCo = kq.loi.startsWith("Website không có trang");
      if (!khongCo) logger.error({ projectId, duong: duongTrang, loi: kq.loi }, "Xem thử tĩnh: không vẽ được trang");
      return trangLoi(kq.loi, khongCo ? 404 : 500);
    }
    return new Response(kq.html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": cspXemTruoc(nonce),
        // Ghi đè `DENY` toàn cục trong next.config: trang này SINH RA để nằm
        // trong iframe của chính Antigravity.
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    if (error instanceof AppError) return trangLoi(error.message, error.status);
    logger.error({ err: error instanceof Error ? error.message : String(error) }, "Xem thử tĩnh: lỗi không mong muốn");
    return trangLoi("Có lỗi không mong muốn khi dựng bản xem thử. Thử tải lại; vẫn hỏng thì báo tôi kèm giờ.", 500);
  }
}

/**
 * Trang xem thử chỉ được: nhúng trong Antigravity, tải ảnh từ chính tuyến này,
 * font từ Google, và chạy đúng một đoạn script mang nonce. Không gửi biểu mẫu
 * đi đâu, không gọi mạng — kể cả khi mã khối sau này có thêm gì.
 */
function cspXemTruoc(nonce: string): string {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data:",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com data:",
    `script-src 'nonce-${nonce}'`,
  ].join("; ");
}

function tepHoacKhong(tep: { noiDung: Buffer | string; kieu: string } | null): Response {
  if (!tep) return new Response("Không có tệp này.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const than = typeof tep.noiDung === "string" ? tep.noiDung : new Uint8Array(tep.noiDung);
  return new Response(than, {
    headers: {
      "Content-Type": tep.kieu,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function trangLoi(loi: string, status: number): Response {
  const chu = loi.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html =
    `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Bản xem thử</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f6f4;color:#222;font:16px/1.5 system-ui,sans-serif}` +
    `main{max-width:36rem;padding:2rem}p{margin:0}.phu{color:#666;font-size:.9rem;margin-top:.5rem}</style></head>` +
    `<body><main><p><strong>Chưa xem được.</strong></p><p class="phu">${chu}</p></main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
