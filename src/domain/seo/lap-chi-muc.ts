/**
 * Trạng thái lập chỉ mục Google — phần thuần tính toán, KHÔNG gọi mạng.
 *
 * Kết quả thô của URL Inspection API có hơn chục trường và mấy bộ enum. Người
 * mở trang không cần từng ấy: họ cần biết trang nào ĐÃ vào chỉ mục, trang nào
 * CHƯA và vì sao, và Google đọc trang chủ lần cuối lúc nào. Tệp này rút gọn
 * thành đúng ba câu đó, và test được bằng dữ liệu tự dựng.
 */

/** Phần của `IndexStatusInspectionResult` mà giao diện dùng. */
export interface KetQuaSoiUrl {
  url: string;
  verdict: "PASS" | "PARTIAL" | "FAIL" | "NEUTRAL" | "VERDICT_UNSPECIFIED";
  /** Câu Google mô tả, ví dụ "Submitted and indexed", "Crawled - currently not indexed". */
  coverageState: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  /** ISO timestamp, hoặc thiếu nếu Google chưa từng crawl. */
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
}

export type NhomChiMuc = "da-vao" | "chua-vao" | "bi-chan" | "loi-tai";

export interface DongChiMuc {
  duongDan: string;
  nhom: NhomChiMuc;
  /** Câu Google nói, giữ nguyên — đây là thứ người dùng dán vào ô tìm kiếm khi cần tra. */
  lyDo: string;
  crawlGanNhat: string | null;
  /** Google chọn canonical KHÁC địa chỉ ta khai — dấu hiệu trùng nội dung. */
  canonicalLech: boolean;
}

export interface TomTatChiMuc {
  tong: number;
  daVao: number;
  chuaVao: number;
  biChan: number;
  loiTai: number;
  dong: DongChiMuc[];
}

/**
 * Xếp một kết quả soi vào đúng một trong bốn nhóm.
 *
 * ⚠️ THỨ TỰ KIỂM QUAN TRỌNG. Một trang bị robots chặn cũng có `verdict: FAIL`;
 * xếp theo verdict trước là mọi trang bị chặn rơi vào "chưa vào" — đúng về kết
 * quả, sai về việc cần làm. "Chưa vào" là chờ; "bị chặn" là sửa cấu hình.
 * Hai chuyện đó phải tách ra trước, verdict xét sau cùng.
 */
export function xepNhom(kq: KetQuaSoiUrl): NhomChiMuc {
  if (
    kq.robotsTxtState === "DISALLOWED" ||
    kq.indexingState === "BLOCKED_BY_META_TAG" ||
    kq.indexingState === "BLOCKED_BY_HTTP_HEADER" ||
    kq.indexingState === "BLOCKED_BY_ROBOTS_TXT"
  ) {
    return "bi-chan";
  }
  if (
    kq.pageFetchState &&
    kq.pageFetchState !== "SUCCESSFUL" &&
    kq.pageFetchState !== "PAGE_FETCH_STATE_UNSPECIFIED"
  ) {
    return "loi-tai";
  }
  return kq.verdict === "PASS" ? "da-vao" : "chua-vao";
}

export function tomTatChiMuc(
  ketQua: readonly KetQuaSoiUrl[],
  goc: string,
): TomTatChiMuc {
  const dong = ketQua.map((kq) => {
    const nhom = xepNhom(kq);
    return {
      duongDan: rutGon(kq.url, goc),
      nhom,
      lyDo: kq.coverageState || moTaMacDinh(nhom),
      crawlGanNhat: kq.lastCrawlTime ?? null,
      canonicalLech: canonicalLech(kq),
    };
  });
  // Trang CHƯA vào lên đầu — đó là thứ cần nhìn. Trang đã vào thì chỉ cần
  // đếm; liệt kê chúng trước là bắt người đọc cuộn qua thứ đã ổn.
  const thuTu: Record<NhomChiMuc, number> = {
    "bi-chan": 0,
    "loi-tai": 1,
    "chua-vao": 2,
    "da-vao": 3,
  };
  dong.sort((a, b) => thuTu[a.nhom] - thuTu[b.nhom] || a.duongDan.localeCompare(b.duongDan));

  return {
    tong: dong.length,
    daVao: dong.filter((d) => d.nhom === "da-vao").length,
    chuaVao: dong.filter((d) => d.nhom === "chua-vao").length,
    biChan: dong.filter((d) => d.nhom === "bi-chan").length,
    loiTai: dong.filter((d) => d.nhom === "loi-tai").length,
    dong,
  };
}

/**
 * Google đã chọn canonical khác địa chỉ ta khai chưa.
 *
 * Chỉ so khi CẢ HAI có giá trị. Trang chưa crawl thì `googleCanonical` rỗng —
 * so với rỗng ra "lệch" là báo động giả cho mọi trang mới.
 */
export function canonicalLech(kq: KetQuaSoiUrl): boolean {
  if (!kq.googleCanonical || !kq.userCanonical) return false;
  return chuanHoa(kq.googleCanonical) !== chuanHoa(kq.userCanonical);
}

function chuanHoa(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

/**
 * Google có crawl lại SAU một mốc thời gian không.
 *
 * Dùng để trả lời "Google đã đọc bản mới chưa" — ví dụ sau khi đổi tên site.
 * `null` khi chưa từng crawl: đó là "chưa biết", không phải "chưa".
 */
export function daCrawlSau(
  lastCrawlTime: string | null | undefined,
  moc: Date,
): boolean | null {
  if (!lastCrawlTime) return null;
  const t = new Date(lastCrawlTime).getTime();
  if (Number.isNaN(t)) return null;
  return t > moc.getTime();
}

function rutGon(url: string, goc: string): string {
  try {
    const u = new URL(url);
    const g = new URL(goc);
    if (u.host === g.host) return u.pathname + u.search || "/";
    return url;
  } catch {
    return url;
  }
}

function moTaMacDinh(nhom: NhomChiMuc): string {
  switch (nhom) {
    case "da-vao":
      return "Đã vào chỉ mục";
    case "chua-vao":
      return "Chưa vào chỉ mục";
    case "bi-chan":
      return "Bị chặn";
    case "loi-tai":
      return "Google không tải được trang";
  }
}

/** Lấy danh sách `<loc>` từ một sitemap XML — chỉ sitemap phẳng, không sitemap index. */
export function docSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}
