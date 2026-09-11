/**
 * Search Console — phần thuần tính toán, KHÔNG gọi mạng.
 *
 * Tách khỏi phần gọi HTTP để test được bằng dữ liệu tự dựng. Ba việc ở đây đều
 * là chỗ dễ sai âm thầm: chọn property, cộng số liệu, và tính khoảng ngày.
 */

/** Một dòng số liệu Search Console trả về. */
export interface DongSearchConsole {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  keys?: string[];
}

export interface TongHopHieuQua {
  clicks: number;
  impressions: number;
  /** Tỷ lệ 0–1. */
  ctr: number;
  /** Vị trí trung bình, càng nhỏ càng tốt. */
  viTri: number | null;
}

/**
 * Cộng nhiều dòng thành một tổng.
 *
 * ⚠️ CTR VÀ VỊ TRÍ KHÔNG CỘNG ĐƯỢC, CŨNG KHÔNG LẤY TRUNG BÌNH CỘNG.
 *
 * Một trang 1 lần hiển thị ở vị trí 1, một trang 999 lần hiển thị ở vị trí 90:
 * trung bình cộng ra 45,5 — một con số không mô tả điều gì có thật. Google tính
 * vị trí trung bình theo TRỌNG SỐ hiển thị, và CTR là clicks chia hiển thị của
 * cả cụm chứ không phải trung bình các CTR.
 *
 * Lỗi này không lộ ra khi thử: nó vẫn ra một con số trông hợp lý.
 */
export function congDong(dong: readonly DongSearchConsole[]): TongHopHieuQua {
  let clicks = 0;
  let impressions = 0;
  let tongViTriTheoTrongSo = 0;
  for (const d of dong) {
    clicks += d.clicks;
    impressions += d.impressions;
    tongViTriTheoTrongSo += d.position * d.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    viTri: impressions > 0 ? tongViTriTheoTrongSo / impressions : null,
  };
}

/**
 * Chọn property Search Console khớp với website của dự án.
 *
 * ⚠️ MỘT TÊN MIỀN CÓ THỂ CÓ NHIỀU PROPERTY, VÀ CHÚNG KHÔNG TƯƠNG ĐƯƠNG NHAU.
 *
 * Search Console có hai loại: `sc-domain:halongxanh360.vn` (cả tên miền, gồm
 * mọi tiền tố và cả http lẫn https) và `https://halongxanh360.vn/` (chỉ đúng
 * tiền tố đó). Người ta thường có cả hai, và bản tiền tố sẽ THIẾU dữ liệu của
 * `www.` — chọn nhầm là báo sót mà không có dấu hiệu nào.
 *
 * Nên ưu tiên `sc-domain:` khi có. Sau đó mới tới khớp đúng nguyên văn, rồi
 * khớp theo host.
 */
export function chonProperty(
  website: string,
  danhSach: readonly string[],
): string | null {
  const host = layHost(website);
  if (!host) return null;
  const hostGon = host.replace(/^www\./, "");

  const theoDomain = danhSach.find(
    (p) => p.toLowerCase() === `sc-domain:${hostGon}`,
  );
  if (theoDomain) return theoDomain;

  const nguyenVan = danhSach.find(
    (p) => layHost(p)?.toLowerCase() === host.toLowerCase(),
  );
  if (nguyenVan) return nguyenVan;

  return (
    danhSach.find((p) => layHost(p)?.replace(/^www\./, "") === hostGon) ?? null
  );
}

function layHost(dinhDanh: string): string | null {
  if (dinhDanh.startsWith("sc-domain:")) return dinhDanh.slice(10);
  try {
    return new URL(dinhDanh).hostname;
  } catch {
    try {
      return new URL(`https://${dinhDanh}`).hostname;
    } catch {
      return null;
    }
  }
}

/** Ngưỡng "đuôi dài": từ bao nhiêu chữ trở lên. */
export const NGUONG_DUOI_DAI = 7;

/**
 * Truy vấn này có phải "đuôi dài" không.
 *
 * ⚠️ ĐẾM CHỮ, KHÔNG ĐẾM TỪ — VÀ ĐÂY LÀ MỘT PHÉP XẤP XỈ CÓ CHỦ Ý.
 *
 * Tiếng Việt viết rời từng âm tiết: "mua nhà hạ long xanh giá bao nhiêu" là 9
 * chữ nhưng chỉ chừng 6 từ. Ngưỡng ≥7 trong nghiên cứu được đo trên tiếng Anh,
 * nơi một từ thường là một âm tiết — nên đếm theo khoảng trắng là cách gần nhất
 * với ý định gốc, chứ không phải cách đúng nhất.
 *
 * Ghi ra đây để người sau biết con số này hơi rộng tay với tiếng Việt, và đừng
 * đọc nhãn "đuôi dài" như một phân loại chính xác.
 */
export function laDuoiDai(truyVan: string): boolean {
  return demChu(truyVan) >= NGUONG_DUOI_DAI;
}

export function demChu(cau: string): number {
  return cau.trim().split(/\s+/).filter(Boolean).length;
}

export interface KhoangNgay {
  batDau: string;
  ketThuc: string;
}

/**
 * Khoảng 28 ngày, và khoảng 28 ngày LIỀN TRƯỚC để so sánh.
 *
 * ⚠️ LÙI 3 NGÀY. Search Console không có dữ liệu của hôm nay và thường chưa đủ
 * của hai ngày gần nhất. Lấy tới hôm nay là kéo theo một đuôi ngày rỗng, và
 * phép so sánh sẽ báo "giảm" mỗi lần mở trang — một cái giảm không có thật.
 */
export function khoangSoSanh(
  homNay: Date,
  soNgay = 28,
  luiNgay = 3,
): { kyNay: KhoangNgay; kyTruoc: KhoangNgay } {
  const ketThuc = themNgay(homNay, -luiNgay);
  const batDau = themNgay(ketThuc, -(soNgay - 1));
  const ketThucTruoc = themNgay(batDau, -1);
  const batDauTruoc = themNgay(ketThucTruoc, -(soNgay - 1));
  return {
    kyNay: { batDau: dinhDangNgay(batDau), ketThuc: dinhDangNgay(ketThuc) },
    kyTruoc: {
      batDau: dinhDangNgay(batDauTruoc),
      ketThuc: dinhDangNgay(ketThucTruoc),
    },
  };
}

function themNgay(goc: Date, so: number): Date {
  const d = new Date(goc);
  d.setUTCDate(d.getUTCDate() + so);
  return d;
}

function dinhDangNgay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Phần trăm thay đổi giữa hai kỳ. `null` khi kỳ trước bằng 0 mà kỳ này thì
 * không — tăng từ số không thì không có phần trăm nào diễn tả được.
 */
export function thayDoiPhanTram(truoc: number, nay: number): number | null {
  if (truoc === 0) return nay === 0 ? 0 : null;
  return ((nay - truoc) / truoc) * 100;
}

/**
 * Đọc LÝ DO từ thân lỗi của Google API — không chỉ mã HTTP.
 *
 * Google gói lý do trong `error.errors[0].reason`, và với lỗi "API chưa bật"
 * còn nhét sẵn ĐƯỜNG LINK bật API (mang project ID) vào `error.message`. Lấy
 * đúng link đó để người dùng bấm là tới đúng dự án, không phải tự tìm.
 *
 * Thuần tính toán, không mạng — để test được với thân phản hồi tự dựng.
 */
export interface LyDoGoogle {
  lyDo: string | null;
  lienKetBatApi: string | null;
  /** API chưa bật trong dự án Google Cloud — kết nối lại không sửa được. */
  apiChuaBat: boolean;
}

export function docLyDoGoogle(than: string): LyDoGoogle {
  let lyDo: string | null = null;
  let thongDiep = "";
  try {
    const d = JSON.parse(than) as {
      error?: {
        message?: string;
        status?: string;
        errors?: { reason?: string }[];
      };
    };
    lyDo = d.error?.errors?.[0]?.reason ?? d.error?.status ?? null;
    thongDiep = d.error?.message ?? "";
  } catch {
    // Thân không phải JSON — không có lý do máy đọc được.
  }
  const khop =
    /https:\/\/console\.(?:developers|cloud)\.google\.com\/apis\/[^\s"]+/.exec(
      thongDiep,
    );
  const lienKetBatApi = khop?.[0] ?? null;
  return {
    lyDo,
    lienKetBatApi,
    apiChuaBat:
      lyDo === "accessNotConfigured" ||
      lyDo === "SERVICE_DISABLED" ||
      lyDo === "PERMISSION_DENIED" && /has not been used|is disabled/i.test(thongDiep) ||
      lienKetBatApi !== null,
  };
}
