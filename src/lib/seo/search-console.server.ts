import "server-only";

import {
  chonProperty,
  congDong,
  laDuoiDai,
  khoangSoSanh,
  thayDoiPhanTram,
  type DongSearchConsole,
  type TongHopHieuQua,
} from "@/domain/seo/search-console";
import { logger } from "@/infrastructure/observability/logger";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { layAccessTokenGoogle } from "@/lib/auth/google-token.server";

const QUYEN_SEARCH_CONSOLE =
  "https://www.googleapis.com/auth/webmasters.readonly";
const GOC = "https://www.googleapis.com/webmasters/v3";
const FETCH_TIMEOUT_MS = 20_000;
const SO_TRANG_TOP = 10;
const SO_TU_KHOA_TOP = 15;

export interface TrangTop {
  duongDan: string;
  clicks: number;
  impressions: number;
  viTri: number;
}

export interface TuKhoaTop {
  truyVan: string;
  clicks: number;
  impressions: number;
  viTri: number;
  /**
   * Truy vấn từ 7 chữ trở lên — "đuôi dài".
   *
   * Đánh dấu ở đây vì đó là nhóm đáng viết bài nhất mà lại dễ trôi qua mắt:
   * nghiên cứu vòng 7 đo được truy vấn ≥7 chữ kích hoạt AI Overviews 46,4% so
   * với 1 chữ chỉ 9,5%, và từ khoá thắng có lượng tìm trung bình ~6.100/tháng
   * chứ không phải ~178.000.
   */
  duoiDai: boolean;
}

export interface HieuQuaTimKiem {
  property: string;
  kyNay: TongHopHieuQua;
  /** Thay đổi so với 28 ngày liền trước, đơn vị %. `null` = chưa đủ dữ liệu. */
  thayDoi: {
    clicks: number | null;
    impressions: number | null;
  };
  trangTop: TrangTop[];
  tuKhoaTop: TuKhoaTop[];
  khoang: { batDau: string; ketThuc: string };
}

export type KetQuaHieuQua =
  | { trangThai: "ok"; duLieu: HieuQuaTimKiem }
  | { trangThai: "chua-ket-noi" }
  | { trangThai: "thieu-quyen"; quyenConThieu: string[] }
  | { trangThai: "can-ket-noi-lai"; lyDo: string }
  /** Kết nối tốt, nhưng tài khoản không có property nào khớp website dự án. */
  | { trangThai: "khong-thay-property"; website: string; daThay: string[] }
  | { trangThai: "loi"; lyDo: string };

/**
 * Lấy số liệu Search Console 28 ngày cho website của một dự án.
 *
 * ⚠️ HÀM NÀY TRẢ VỀ TRẠNG THÁI, KHÔNG NÉM LỖI, VÀ KHÔNG BAO GIỜ TRẢ SỐ 0 THAY
 * CHO "KHÔNG BIẾT".
 *
 * Trang phân tích trước đây hiện dấu gạch ngang kèm chữ "cần kết nối" cho mọi
 * trường hợp — đóng cứng trong mã, không đọc từ đâu. Ai nhìn cũng tưởng mình
 * chưa kết nối, kể cả người đã kết nối xong.
 *
 * Sáu trạng thái dưới đây là sáu câu chuyện khác nhau và mỗi cái cần một hành
 * động khác nhau. Gộp chúng lại thành "chưa có dữ liệu" là vứt đi đúng phần
 * người đọc cần.
 */
export async function layHieuQuaTimKiem(
  identity: AuthenticatedIdentity,
  website: string,
  homNay: Date = new Date(),
): Promise<KetQuaHieuQua> {
  const khoaDem = `${identity.workspaceId}|${website}|${dinhDangNgayDem(homNay)}`;
  const dem = docDem(khoaDem);
  if (dem) return dem;

  const ketQua = await layHieuQuaThat(identity, website, homNay);
  // CHỈ nhớ kết quả THÀNH CÔNG.
  //
  // Nhớ cả trạng thái lỗi thì người dùng bấm "kết nối lại" xong, quay về trang,
  // vẫn thấy y nguyên câu báo lỗi cũ trong 30 phút — và sẽ kết luận rằng việc
  // kết nối lại không ăn thua. Lỗi phải hỏi lại ngay mỗi lần.
  if (ketQua.trangThai === "ok") ghiDem(khoaDem, ketQua);
  return ketQua;
}

async function layHieuQuaThat(
  identity: AuthenticatedIdentity,
  website: string,
  homNay: Date,
): Promise<KetQuaHieuQua> {
  const token = await layAccessTokenGoogle(identity, [QUYEN_SEARCH_CONSOLE]);
  if (token.trangThai !== "ok") return token;

  let danhSach: string[];
  try {
    danhSach = await lietKeProperty(token.accessToken);
  } catch (error) {
    return { trangThai: "loi", lyDo: moTaLoi(error) };
  }

  const property = chonProperty(website, danhSach);
  if (!property) {
    return { trangThai: "khong-thay-property", website, daThay: danhSach };
  }

  const { kyNay, kyTruoc } = khoangSoSanh(homNay);
  try {
    const [dongNay, dongTruoc, dongTrang, dongTuKhoa] = await Promise.all([
      truyVan(token.accessToken, property, kyNay, []),
      truyVan(token.accessToken, property, kyTruoc, []),
      truyVan(token.accessToken, property, kyNay, ["page"], SO_TRANG_TOP),
      truyVan(token.accessToken, property, kyNay, ["query"], SO_TU_KHOA_TOP),
    ]);

    const tongNay = congDong(dongNay);
    const tongTruoc = congDong(dongTruoc);

    return {
      trangThai: "ok",
      duLieu: {
        property,
        kyNay: tongNay,
        thayDoi: {
          clicks: thayDoiPhanTram(tongTruoc.clicks, tongNay.clicks),
          impressions: thayDoiPhanTram(
            tongTruoc.impressions,
            tongNay.impressions,
          ),
        },
        trangTop: dongTrang.map((d) => ({
          duongDan: rutGonDuongDan(d.keys?.[0] ?? ""),
          clicks: d.clicks,
          impressions: d.impressions,
          viTri: d.position,
        })),
        tuKhoaTop: dongTuKhoa.map((d) => {
          const truyVan = d.keys?.[0] ?? "";
          return {
            truyVan,
            clicks: d.clicks,
            impressions: d.impressions,
            viTri: d.position,
            duoiDai: laDuoiDai(truyVan),
          };
        }),
        khoang: kyNay,
      },
    };
  } catch (error) {
    return { trangThai: "loi", lyDo: moTaLoi(error) };
  }
}

async function lietKeProperty(accessToken: string): Promise<string[]> {
  const response = await goi(`${GOC}/sites`, accessToken);
  const body = (await response.json()) as {
    siteEntry?: { siteUrl?: string; permissionLevel?: string }[];
  };
  return (body.siteEntry ?? [])
    // `siteUnverifiedUser` là property người dùng thấy tên nhưng KHÔNG đọc được
    // số liệu. Để nó trong danh sách thì `chonProperty` có thể chọn đúng nó rồi
    // mọi truy vấn sau đó trả 403 — một lỗi khó lần vì tên property hiện ra
    // đúng như mong đợi.
    .filter((e) => e.permissionLevel !== "siteUnverifiedUser")
    .map((e) => e.siteUrl)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

async function truyVan(
  accessToken: string,
  property: string,
  khoang: { batDau: string; ketThuc: string },
  dimensions: string[],
  rowLimit = 1,
): Promise<DongSearchConsole[]> {
  const response = await goi(
    `${GOC}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    accessToken,
    {
      startDate: khoang.batDau,
      endDate: khoang.ketThuc,
      dimensions,
      rowLimit,
      // `web` bỏ qua ảnh, video, tin tức — cùng loại kết quả mà giao diện đang
      // nói tới. Trộn cả bốn vào một con số làm vị trí trung bình lệch mà không
      // ai giải thích được vì sao.
      type: "web",
    },
  );
  const body = (await response.json()) as { rows?: DongSearchConsole[] };
  return body.rows ?? [];
}

async function goi(
  url: string,
  accessToken: string,
  body?: unknown,
): Promise<Response> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    // KHÔNG đưa nội dung phản hồi của Google ra giao diện: nó có thể chứa email
    // và tên property của tài khoản. Ghi vào log cho người vận hành, còn người
    // dùng chỉ cần biết mã lỗi.
    const chiTiet = await response.text().catch(() => "");
    logger.warn(
      { status: response.status, chiTiet: chiTiet.slice(0, 500) },
      "Search Console API call failed",
    );
    throw new Error(`HTTP ${response.status}`);
  }
  return response;
}

/** Bỏ phần gốc để bảng hiện `/tin-tuc/abc` thay vì cả địa chỉ dài. */
function rutGonDuongDan(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   BỘ NHỚ ĐỆM — VÀ NÓI THẲNG NÓ YẾU Ở ĐÂU

   Mỗi lần mở trang là BỐN lượt gọi Search Console. Trang khai `force-dynamic`
   nên bấm F5 mười lần là bốn mươi lượt gọi — cho một tập số liệu mà Google chỉ
   cập nhật MỘT LẦN MỖI NGÀY. Đó là đốt hạn mức để lấy lại đúng thứ vừa có.

   ⚠️ ĐÂY LÀ BỘ NHỚ TRONG MỘT TIẾN TRÌNH, KHÔNG PHẢI BỘ ĐỆM DÙNG CHUNG.

   Trên Vercel mỗi yêu cầu có thể rơi vào một máy khác, và máy nguội thì bộ nhớ
   rỗng. Nên nó KHÔNG bảo đảm số lượt gọi bị chặn — nó chỉ bắt được trường hợp
   phổ biến nhất: cùng một người bấm tải lại vài lần liên tiếp, rơi vào cùng một
   máy đang nóng.

   Cố ý không dùng `unstable_cache`: tài liệu Next 16 ghi nó đã được thay bằng
   `use cache`, và cả hai đều lấy đối số làm khoá — mà hàm này nhận `identity`
   (đối tượng) và có nhánh GHI vào cơ sở dữ liệu khi làm mới token. Bọc một hàm
   có ghi vào bộ đệm là cách tạo ra lỗi khó lần.

   Cũng cố ý không lưu xuống cơ sở dữ liệu: việc đó cần thêm bảng, tức thêm
   migration — mà migration `0004` hiện còn chưa xác nhận đã áp trên Neon.
   ══════════════════════════════════════════════════════════════════════════ */

const DEM_SONG_MS = 30 * 60_000;
const DEM_TOI_DA = 32;

const boNhoDem = new Map<string, { luc: number; ketQua: KetQuaHieuQua }>();

/** Ngày theo giờ Việt Nam — số liệu GSC đổi theo ngày, nên khoá đệm cũng vậy. */
function dinhDangNgayDem(d: Date): string {
  return new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

function docDem(khoa: string): KetQuaHieuQua | null {
  const co = boNhoDem.get(khoa);
  if (!co) return null;
  if (Date.now() - co.luc > DEM_SONG_MS) {
    boNhoDem.delete(khoa);
    return null;
  }
  return co.ketQua;
}

function ghiDem(khoa: string, ketQua: KetQuaHieuQua): void {
  // Trần số mục: không có nó thì một workspace nhiều dự án chạy lâu ngày sẽ để
  // Map phình mãi. Bỏ mục cũ nhất — đủ tốt cho một bộ đệm 32 mục.
  if (boNhoDem.size >= DEM_TOI_DA) {
    const cuNhat = boNhoDem.keys().next().value;
    if (cuNhat !== undefined) boNhoDem.delete(cuNhat);
  }
  boNhoDem.set(khoa, { luc: Date.now(), ketQua });
}

/** Xoá đệm của một workspace — gọi sau khi người dùng kết nối lại. */
export function xoaDemHieuQua(workspaceId: string): void {
  for (const khoa of [...boNhoDem.keys()]) {
    if (khoa.startsWith(`${workspaceId}|`)) boNhoDem.delete(khoa);
  }
}

function moTaLoi(error: unknown): string {
  const thongDiep = error instanceof Error ? error.message : String(error);
  if (thongDiep.includes("403")) {
    return "Google từ chối (403) — tài khoản không có quyền đọc property này.";
  }
  if (thongDiep.includes("429")) {
    return "Google tạm chặn vì gọi quá nhiều (429). Thử lại sau ít phút.";
  }
  if (thongDiep.includes("timed out") || thongDiep.includes("abort")) {
    return "Gọi Search Console quá lâu, đã dừng.";
  }
  return `Không lấy được số liệu (${thongDiep}).`;
}
