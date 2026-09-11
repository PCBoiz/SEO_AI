import "server-only";

import { docLyDoGoogle } from "@/domain/seo/search-console";
import { logger } from "@/infrastructure/observability/logger";
import { layAccessTokenGoogle, type ChuToken } from "@/lib/auth/google-token.server";

/* ══════════════════════════════════════════════════════════════════════════
   GOOGLE DRIVE — CHỈ ĐỌC: kiểm một thư mục, liệt kê ảnh, lấy ảnh thu nhỏ.

   Việc nó phục vụ: chủ dự án tải ảnh (công trường, sự kiện, căn mẫu) lên một
   thư mục Drive bằng điện thoại; Antigravity thấy ngay để dùng cho bài.

   Hai lệnh gọi HTTP trơn, không thư viện `googleapis` — cùng lý do như
   `sheets.server.ts`.
   ══════════════════════════════════════════════════════════════════════════ */

export const QUYEN_DRIVE = "https://www.googleapis.com/auth/drive.readonly";
const GOC = "https://www.googleapis.com/drive/v3/files";
const FETCH_TIMEOUT_MS = 15_000;
const MIME_THU_MUC = "application/vnd.google-apps.folder";
/** Mã Drive hợp lệ — kiểm TRƯỚC khi nhét vào câu truy vấn `q`. */
const MA_DRIVE = /^[A-Za-z0-9_-]{15,}$/;

export type KetQuaDrive<T> =
  | { trangThai: "ok"; duLieu: T }
  | { trangThai: "chua-ket-noi" }
  | { trangThai: "thieu-quyen"; quyenConThieu: string[] }
  | { trangThai: "can-ket-noi-lai"; lyDo: string }
  | { trangThai: "loi"; lyDo: string };

export interface ThuMuc {
  id: string;
  ten: string;
}

export interface AnhDrive {
  id: string;
  ten: string;
  mimeType: string;
  taoLuc: string;
  rong: number | null;
  cao: number | null;
  coThuNho: boolean;
}

/** Kiểm thư mục tồn tại, là THƯ MỤC, và tài khoản đọc được. */
export async function layThuMuc(chu: ChuToken, folderId: string): Promise<KetQuaDrive<ThuMuc>> {
  if (!MA_DRIVE.test(folderId)) return { trangThai: "loi", lyDo: "Mã thư mục không hợp lệ." };
  const token = await layAccessTokenGoogle(chu, [QUYEN_DRIVE]);
  if (token.trangThai !== "ok") return token;

  const r = await goi(
    `${GOC}/${folderId}?fields=id,name,mimeType,trashed&supportsAllDrives=true`,
    token.accessToken,
  );
  if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoi(r, "đọc thư mục") };
  const f = (await r.json()) as { id?: string; name?: string; mimeType?: string; trashed?: boolean };
  if (f.mimeType !== MIME_THU_MUC) {
    return { trangThai: "loi", lyDo: "Link này trỏ tới một TỆP, không phải thư mục. Mở thư mục chứa ảnh rồi chép link của thư mục." };
  }
  if (f.trashed) return { trangThai: "loi", lyDo: "Thư mục đang nằm trong thùng rác Drive." };
  return { trangThai: "ok", duLieu: { id: f.id ?? folderId, ten: f.name ?? "(không tên)" } };
}

/** Ảnh trong thư mục, mới nhất trước. Không đi vào thư mục con. */
export async function lietKeAnh(
  chu: ChuToken,
  folderId: string,
  toiDa = 30,
): Promise<KetQuaDrive<AnhDrive[]>> {
  if (!MA_DRIVE.test(folderId)) return { trangThai: "loi", lyDo: "Mã thư mục không hợp lệ." };
  const token = await layAccessTokenGoogle(chu, [QUYEN_DRIVE]);
  if (token.trangThai !== "ok") return token;

  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
  const thamSo = new URLSearchParams({
    q,
    orderBy: "createdTime desc",
    pageSize: String(toiDa),
    fields: "files(id,name,mimeType,createdTime,imageMediaMetadata(width,height),thumbnailLink)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const r = await goi(`${GOC}?${thamSo}`, token.accessToken);
  if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoi(r, "liệt kê ảnh") };
  const body = (await r.json()) as {
    files?: {
      id: string;
      name: string;
      mimeType: string;
      createdTime: string;
      imageMediaMetadata?: { width?: number; height?: number };
      thumbnailLink?: string;
    }[];
  };
  return {
    trangThai: "ok",
    duLieu: (body.files ?? []).map((f) => ({
      id: f.id,
      ten: f.name,
      mimeType: f.mimeType,
      taoLuc: f.createdTime,
      rong: f.imageMediaMetadata?.width ?? null,
      cao: f.imageMediaMetadata?.height ?? null,
      coThuNho: Boolean(f.thumbnailLink),
    })),
  };
}

/**
 * Ảnh thu nhỏ của MỘT tệp — CHỈ khi tệp nằm trong `folderId`.
 *
 * ⚠️ KIỂM THƯ MỤC CHA LÀ BẮT BUỘC, KHÔNG PHẢI THÊM CHO ĐỦ.
 *
 * Đường này đọc bằng token của người đã nối thư mục, và nó nhận `fileId` từ
 * địa chỉ yêu cầu. Bỏ bước kiểm cha thì bất kỳ ai trong workspace đoán/biết
 * được mã một tệp đều xem được TỆP ĐÓ trong Drive của chủ dự án — hợp đồng,
 * giấy tờ, bất cứ thứ gì — qua cửa "xem ảnh thu nhỏ".
 *
 * Lấy bản thu nhỏ Google tự sinh (`thumbnailLink`), không tải ảnh gốc: ảnh điện
 * thoại 3–5 MB, ba mươi ô là trăm megabyte cho một lần mở trang. Và bản thu nhỏ
 * luôn là JPEG/PNG — ảnh HEIC của iPhone trình duyệt không hiện được, nhưng
 * bản thu nhỏ của nó thì được.
 */
export async function layThuNho(
  chu: ChuToken,
  folderId: string,
  fileId: string,
  canhDai = 400,
): Promise<KetQuaDrive<{ bytes: ArrayBuffer; contentType: string }>> {
  if (!MA_DRIVE.test(folderId) || !MA_DRIVE.test(fileId)) {
    return { trangThai: "loi", lyDo: "Mã không hợp lệ." };
  }
  const token = await layAccessTokenGoogle(chu, [QUYEN_DRIVE]);
  if (token.trangThai !== "ok") return token;

  const r = await goi(
    `${GOC}/${fileId}?fields=id,parents,mimeType,thumbnailLink&supportsAllDrives=true`,
    token.accessToken,
  );
  if (!r.ok) return { trangThai: "loi", lyDo: await moTaLoi(r, "đọc ảnh") };
  const f = (await r.json()) as { parents?: string[]; mimeType?: string; thumbnailLink?: string };
  if (!f.parents?.includes(folderId)) {
    logger.warn({ fileId }, "Drive thumbnail requested for file outside configured folder");
    return { trangThai: "loi", lyDo: "Tệp không thuộc thư mục ảnh của dự án." };
  }
  if (!f.mimeType?.startsWith("image/")) return { trangThai: "loi", lyDo: "Tệp không phải ảnh." };
  if (!f.thumbnailLink) return { trangThai: "loi", lyDo: "Google chưa tạo xong ảnh thu nhỏ — thử lại sau ít phút." };

  // Hậu tố `=s220` quyết định cỡ; đổi sang cỡ cần. Không có hậu tố thì thêm vào.
  const link = /=s\d+/.test(f.thumbnailLink)
    ? f.thumbnailLink.replace(/=s\d+/, `=s${canhDai}`)
    : `${f.thumbnailLink}=s${canhDai}`;
  let anh: Response;
  try {
    anh = await fetch(link, {
      headers: { authorization: `Bearer ${token.accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    return { trangThai: "loi", lyDo: error instanceof Error ? error.message : String(error) };
  }
  if (!anh.ok) return { trangThai: "loi", lyDo: `Không tải được ảnh thu nhỏ (HTTP ${anh.status}).` };
  return {
    trangThai: "ok",
    duLieu: {
      bytes: await anh.arrayBuffer(),
      contentType: anh.headers.get("content-type") ?? "image/jpeg",
    },
  };
}

async function goi(url: string, accessToken: string): Promise<Response> {
  return fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

async function moTaLoi(r: Response, viec: string): Promise<string> {
  const than = await r.text().catch(() => "");
  logger.warn({ status: r.status, chiTiet: than.slice(0, 400) }, `Drive API ${viec} failed`);
  const doc = docLyDoGoogle(than);
  if (doc.apiChuaBat) {
    return "API Google Drive chưa bật trong dự án Google Cloud — bật ở console.cloud.google.com/apis/library/drive.googleapis.com";
  }
  if (r.status === 404) {
    return "Không thấy thư mục/tệp — hoặc đã bị xoá, hoặc tài khoản Google đang nối không có quyền xem nó.";
  }
  if (r.status === 403) return "Google từ chối (403) — tài khoản đang nối không có quyền xem mục này.";
  return `Google trả HTTP ${r.status} khi ${viec}${doc.lyDo ? ` (${doc.lyDo})` : ""}.`;
}
