import "server-only";

import { chonProperty, docLyDoGoogle } from "@/domain/seo/search-console";
import {
  docSitemap,
  tomTatChiMuc,
  type KetQuaSoiUrl,
  type TomTatChiMuc,
} from "@/domain/seo/lap-chi-muc";
import { logger } from "@/infrastructure/observability/logger";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { layAccessTokenGoogle } from "@/lib/auth/google-token.server";

/* ══════════════════════════════════════════════════════════════════════════
   TRẠNG THÁI LẬP CHỈ MỤC GOOGLE — từng địa chỉ trong sitemap

   Câu "Google index trang mình chưa" trước đây trả lời bằng cách chủ dự án mở
   Search Console, bấm từng địa chỉ, chụp màn hình gửi sang. Ba mươi mốt địa
   chỉ là ba mươi mốt lần bấm. Kết quả là không ai làm, và câu hỏi đó cứ treo.

   URL Inspection API trả lời từng địa chỉ bằng máy: vào chỉ mục chưa, Google
   crawl lần cuối lúc nào, có bị chặn không, Google chọn canonical nào. Hạn mức
   2.000 lượt/ngày mỗi property (tài liệu Google, "Usage limits") — 31 địa chỉ
   với đệm 30 phút thì còn xa.

   ⚠️ CHẬM. Mỗi lượt soi mất ~1–3 giây phía Google. 31 địa chỉ chạy 5 luồng song
   song là ~10–20 giây. Khối này BẮT BUỘC nằm trong `Suspense` riêng, và không
   được nằm chung với khối số liệu — nếu không thì bốn thẻ số phải chờ nó.
   ══════════════════════════════════════════════════════════════════════════ */

const QUYEN = "https://www.googleapis.com/auth/webmasters.readonly";
const DIEM_SOI = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const DIEM_SITES = "https://www.googleapis.com/webmasters/v3/sites";
const FETCH_TIMEOUT_MS = 20_000;
const SONG_SONG = 5;
/** Trần địa chỉ mỗi lần — đủ cho sitemap 31 mục, và giữ hạn mức khi site lớn lên. */
const TOI_DA_URL = 60;

export type KetQuaChiMuc =
  | { trangThai: "ok"; tomTat: TomTatChiMuc; property: string; soiLuc: string }
  | { trangThai: "chua-ket-noi" }
  | { trangThai: "thieu-quyen" }
  | { trangThai: "khong-thay-property"; website: string }
  | { trangThai: "khong-doc-duoc-sitemap"; website: string; lyDo: string }
  | { trangThai: "loi"; lyDo: string };

export async function layTrangThaiChiMuc(
  identity: AuthenticatedIdentity,
  website: string,
): Promise<KetQuaChiMuc> {
  const khoa = `${identity.workspaceId}|${website}`;
  const dem = docDem(khoa);
  if (dem) return dem;

  const ketQua = await soiThat(identity, website);
  if (ketQua.trangThai === "ok") ghiDem(khoa, ketQua);
  return ketQua;
}

async function soiThat(
  identity: AuthenticatedIdentity,
  website: string,
): Promise<KetQuaChiMuc> {
  const token = await layAccessTokenGoogle(identity, [QUYEN]);
  if (token.trangThai === "chua-ket-noi") return { trangThai: "chua-ket-noi" };
  if (token.trangThai === "thieu-quyen") return { trangThai: "thieu-quyen" };
  if (token.trangThai !== "ok") return { trangThai: "loi", lyDo: token.lyDo };

  // 1. Property — dùng lại đúng cách chọn của khối số liệu, để hai khối không
  //    bao giờ nhìn vào hai property khác nhau.
  let property: string | null;
  try {
    const r = await fetch(DIEM_SITES, {
      headers: { authorization: `Bearer ${token.accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoi(r) };
    const body = (await r.json()) as {
      siteEntry?: { siteUrl?: string; permissionLevel?: string }[];
    };
    const danhSach = (body.siteEntry ?? [])
      .filter((e) => e.permissionLevel !== "siteUnverifiedUser")
      .map((e) => e.siteUrl)
      .filter((s): s is string => typeof s === "string");
    property = chonProperty(website, danhSach);
  } catch (error) {
    return { trangThai: "loi", lyDo: error instanceof Error ? error.message : String(error) };
  }
  if (!property) return { trangThai: "khong-thay-property", website };

  // 2. Danh sách địa chỉ — đọc sitemap THẬT trên trang, không đọc mã nguồn.
  //    Thứ Google thấy mới là thứ cần soi.
  let urls: string[];
  try {
    const goc = website.replace(/\/+$/, "");
    const r = await fetch(`${goc}/sitemap.xml`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": "AntigravityOS/1.0 (+kiem lap chi muc)" },
    });
    if (!r.ok) {
      return {
        trangThai: "khong-doc-duoc-sitemap",
        website,
        lyDo: `${goc}/sitemap.xml trả HTTP ${r.status}`,
      };
    }
    urls = docSitemap(await r.text()).slice(0, TOI_DA_URL);
    if (urls.length === 0) {
      return { trangThai: "khong-doc-duoc-sitemap", website, lyDo: "Sitemap không có <loc> nào" };
    }
  } catch (error) {
    return {
      trangThai: "khong-doc-duoc-sitemap",
      website,
      lyDo: error instanceof Error ? error.message : String(error),
    };
  }

  // 3. Soi từng địa chỉ, giới hạn song song để không chạm 600 lượt/phút và
  //    không mở vài chục kết nối cùng lúc.
  try {
    const ketQua = await chayTheoLo(urls, SONG_SONG, (url) =>
      soiMotUrl(token.accessToken, property as string, url),
    );
    return {
      trangThai: "ok",
      property,
      soiLuc: new Date().toISOString(),
      tomTat: tomTatChiMuc(ketQua, website),
    };
  } catch (error) {
    return { trangThai: "loi", lyDo: error instanceof Error ? error.message : String(error) };
  }
}

async function soiMotUrl(
  accessToken: string,
  property: string,
  url: string,
): Promise<KetQuaSoiUrl> {
  const r = await fetch(DIEM_SOI, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property, languageCode: "vi" }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!r.ok) {
    // Một địa chỉ lỗi KHÔNG làm hỏng cả bảng: ghi thành một dòng "không soi
    // được" và đi tiếp. Ném lỗi ở đây là một trang 404 trong sitemap làm mất
    // kết quả của ba mươi trang kia.
    const lyDo = await moTaLoi(r);
    logger.warn({ url, status: r.status }, "URL inspection failed");
    return {
      url,
      verdict: "VERDICT_UNSPECIFIED",
      coverageState: `Không soi được: ${lyDo}`,
    };
  }
  const body = (await r.json()) as {
    inspectionResult?: { indexStatusResult?: Partial<KetQuaSoiUrl> };
  };
  const k = body.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: (k.verdict as KetQuaSoiUrl["verdict"]) ?? "VERDICT_UNSPECIFIED",
    coverageState: k.coverageState ?? "",
    robotsTxtState: k.robotsTxtState,
    indexingState: k.indexingState,
    pageFetchState: k.pageFetchState,
    lastCrawlTime: k.lastCrawlTime,
    googleCanonical: k.googleCanonical,
    userCanonical: k.userCanonical,
  };
}

async function chayTheoLo<T, R>(
  danhSach: readonly T[],
  songSong: number,
  viec: (muc: T) => Promise<R>,
): Promise<R[]> {
  const ketQua: R[] = new Array(danhSach.length);
  let i = 0;
  async function congNhan(): Promise<void> {
    while (i < danhSach.length) {
      const j = i++;
      ketQua[j] = await viec(danhSach[j]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(songSong, danhSach.length) }, congNhan));
  return ketQua;
}

async function moTaLoi(r: Response): Promise<string> {
  const than = await r.text().catch(() => "");
  const doc = docLyDoGoogle(than);
  if (doc.apiChuaBat) return "API Search Console chưa bật trong Google Cloud";
  return `HTTP ${r.status}${doc.lyDo ? ` (${doc.lyDo})` : ""}`;
}

/* Đệm trong tiến trình, 30 phút — cùng lý do và cùng giới hạn với khối số liệu
   (xem `search-console.server.ts`). Soi 31 địa chỉ là 31 lượt gọi và ~15 giây;
   không đệm thì mỗi lần F5 là chờ lại từ đầu. */
const DEM_SONG_MS = 30 * 60_000;
const boNhoDem = new Map<string, { luc: number; ketQua: KetQuaChiMuc }>();

function docDem(khoa: string): KetQuaChiMuc | null {
  const co = boNhoDem.get(khoa);
  if (!co) return null;
  if (Date.now() - co.luc > DEM_SONG_MS) {
    boNhoDem.delete(khoa);
    return null;
  }
  return co.ketQua;
}

function ghiDem(khoa: string, ketQua: KetQuaChiMuc): void {
  if (boNhoDem.size >= 32) {
    const cuNhat = boNhoDem.keys().next().value;
    if (cuNhat !== undefined) boNhoDem.delete(cuNhat);
  }
  boNhoDem.set(khoa, { luc: Date.now(), ketQua });
}

export function xoaDemChiMuc(workspaceId: string): void {
  for (const khoa of [...boNhoDem.keys()]) {
    if (khoa.startsWith(`${workspaceId}|`)) boNhoDem.delete(khoa);
  }
}
