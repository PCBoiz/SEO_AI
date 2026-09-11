import "server-only";

import { docLyDoGoogle } from "@/domain/seo/search-console";
import { logger } from "@/infrastructure/observability/logger";
import { layAccessTokenGoogle, type ChuToken } from "@/lib/auth/google-token.server";

/* ══════════════════════════════════════════════════════════════════════════
   GOOGLE SHEETS — hai việc: lập bảng, và nối thêm một dòng.

   Đây là lần đầu quyền `spreadsheets` được DÙNG kể từ khi xin (vòng 8 phát
   hiện token nằm không). Việc nó phục vụ: khách để lại số trên website → một
   dòng mới trong bảng của chủ dự án, ngay lập tức, không ai phải mở tệp trên
   máy chủ để xem.

   Cố ý chỉ hai lệnh gọi, không bọc thư viện `googleapis` (nặng ~100 MB, kéo
   theo cả bộ auth riêng). Hai yêu cầu HTTP là đủ và đọc được từng byte.
   ══════════════════════════════════════════════════════════════════════════ */

export const QUYEN_SHEETS = "https://www.googleapis.com/auth/spreadsheets";
const GOC = "https://sheets.googleapis.com/v4/spreadsheets";
const FETCH_TIMEOUT_MS = 15_000;
/** Tên tab chứa khách. Cố định để `range` khi nối dòng luôn đúng. */
export const TEN_TAB = "Khách";

export type KetQuaSheets<T> =
  | { trangThai: "ok"; duLieu: T }
  | { trangThai: "chua-ket-noi" }
  | { trangThai: "thieu-quyen"; quyenConThieu: string[] }
  | { trangThai: "can-ket-noi-lai"; lyDo: string }
  | { trangThai: "loi"; lyDo: string };

export interface BangMoi {
  spreadsheetId: string;
  url: string;
}

/**
 * Lập một bảng tính mới với hàng tiêu đề.
 *
 * Bảng nằm ở thư mục gốc Drive của người lập. Google trả về `spreadsheetUrl`
 * — lưu lại để giao diện đưa link, không tự ghép URL.
 */
export async function taoBang(
  chu: ChuToken,
  tieuDe: string,
  tieuDeCot: readonly string[],
): Promise<KetQuaSheets<BangMoi>> {
  const token = await layAccessTokenGoogle(chu, [QUYEN_SHEETS]);
  if (token.trangThai !== "ok") return token;

  let r: Response;
  try {
    r = await fetch(GOC, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: tieuDe, locale: "vi_VN", timeZone: "Asia/Ho_Chi_Minh" },
        sheets: [
          {
            properties: { title: TEN_TAB, gridProperties: { frozenRowCount: 1 } },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: tieuDeCot.map((t) => ({
                      userEnteredValue: { stringValue: t },
                      userEnteredFormat: { textFormat: { bold: true } },
                    })),
                  },
                ],
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    return { trangThai: "loi", lyDo: moTaLoiMang(error) };
  }
  if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoiGoogle(r, "tạo bảng") };

  const body = (await r.json()) as { spreadsheetId?: string; spreadsheetUrl?: string };
  if (!body.spreadsheetId || !body.spreadsheetUrl) {
    return { trangThai: "loi", lyDo: "Google tạo bảng nhưng không trả về id/url." };
  }
  return { trangThai: "ok", duLieu: { spreadsheetId: body.spreadsheetId, url: body.spreadsheetUrl } };
}

/**
 * Nối một dòng vào cuối bảng.
 *
 * `USER_ENTERED` để số điện thoại "0941…" — Google sẽ hiểu là số và **cắt số 0
 * đầu**. Nên số điện thoại phải được đưa vào dưới dạng có dấu nháy đơn `'0941…`
 * ở phía gọi, hoặc dùng `RAW`. Chọn `RAW`: mọi ô là chuỗi y nguyên, không có
 * bất ngờ nào. Thời điểm cũng là chuỗi ISO — người đọc bảng vẫn sắp xếp được.
 */
export async function noiDong(
  chu: ChuToken,
  spreadsheetId: string,
  dong: readonly string[],
): Promise<KetQuaSheets<{ updatedRange: string }>> {
  const token = await layAccessTokenGoogle(chu, [QUYEN_SHEETS]);
  if (token.trangThai !== "ok") return token;

  const range = encodeURIComponent(`${TEN_TAB}!A1`);
  let r: Response;
  try {
    r = await fetch(
      `${GOC}/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ values: [dong] }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
  } catch (error) {
    return { trangThai: "loi", lyDo: moTaLoiMang(error) };
  }
  if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoiGoogle(r, "ghi dòng") };
  const body = (await r.json()) as { updates?: { updatedRange?: string } };
  return { trangThai: "ok", duLieu: { updatedRange: body.updates?.updatedRange ?? "" } };
}

async function moTaLoiGoogle(r: Response, viec: string): Promise<string> {
  const than = await r.text().catch(() => "");
  logger.warn({ status: r.status, chiTiet: than.slice(0, 400) }, `Sheets API ${viec} failed`);
  const doc = docLyDoGoogle(than);
  if (doc.apiChuaBat) {
    return "API Google Sheets chưa bật trong dự án Google Cloud — bật ở console.cloud.google.com/apis/library/sheets.googleapis.com";
  }
  if (r.status === 404) return "Không tìm thấy bảng — có thể đã bị xoá hoặc đổi chủ.";
  if (r.status === 403) return "Google từ chối (403): tài khoản không có quyền ghi vào bảng này.";
  return `Google trả HTTP ${r.status} khi ${viec}${doc.lyDo ? ` (${doc.lyDo})` : ""}.`;
}

function moTaLoiMang(error: unknown): string {
  const m = error instanceof Error ? error.message : String(error);
  return /abort|timed out/i.test(m) ? "Gọi Google Sheets quá lâu, đã dừng." : `Không gọi được Google Sheets (${m}).`;
}
