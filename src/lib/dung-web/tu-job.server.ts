import "server-only";
import "@/domain/modules/registry";
import { flattenModuleOutput, getModuleDefinition } from "@/domain/modules/module-definition";
import { dungDriveChoModule, getModuleJobRepository } from "@/lib/modules/module-engine.server";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { dungCayTep, lamSlug, type AnhChoWeb, type KetQuaDungCay, type ThongTinTrang } from "@/domain/dung-web/dung-cay-tep";
import { docHopDongTuDauRa, type HopDongWeb } from "@/domain/dung-web/tu-dau-ra";

/**
 * Gom kết quả các bước dựng web của một dự án thành cây tệp tải về được.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KHÔNG LƯU CÂY TỆP VÀO CƠ SỞ DỮ LIỆU.
 *
 * Cây tệp là HÀM THUẦN của (kiến trúc + hệ thiết kế + chữ), mà cả ba đã nằm
 * sẵn trong bảng job. Lưu thêm bản dựng là lưu thứ suy ra được — và lưu xong
 * thì có hai nguồn sự thật: sửa chữ ở #27 mà bản lưu vẫn là bản cũ, không ai
 * biết bản nào đúng. Dựng lại tốn vài mili giây.
 *
 * Cũng vì thế mà tuyến tải về không cần bảng mới, không cần migration.
 *
 * Phần GỘP nằm ở `domain/dung-web/tu-dau-ra.ts` (thuần, kiểm được); ở đây chỉ
 * còn việc đọc bảng job.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type { HopDongWeb };
export { THIET_KE_MAC_DINH } from "@/domain/dung-web/tu-dau-ra";

/** Đầu ra THÀNH CÔNG mới nhất của mỗi module trong dự án, đã làm phẳng. */
export async function docDauRaMoiNhat(
  identity: AuthenticatedIdentity,
  projectId: string,
): Promise<Map<string, string>> {
  const jobs = await getModuleJobRepository().listLatestSucceededByProject(identity.workspaceId, projectId);
  const ra = new Map<string, string>();
  for (const job of jobs) {
    if (!job.output) continue;
    try {
      ra.set(job.moduleKey, flattenModuleOutput(getModuleDefinition(job.moduleKey), job.output));
    } catch {
      // Module chưa đăng ký (dữ liệu cũ) — bỏ qua.
    }
  }
  return ra;
}

/** Đọc hợp đồng dựng web của dự án. `null` = chưa chạy bước Kiến trúc. */
export async function docHopDongWeb(
  identity: AuthenticatedIdentity,
  projectId: string,
): Promise<HopDongWeb | null> {
  return docHopDongTuDauRa(await docDauRaMoiNhat(identity, projectId));
}

/** Nhiều hơn thế thì tệp nén phình ra mà trang cũng không đẹp hơn. */
export const SO_ANH_TOI_DA = 8;

/**
 * Lấy ảnh THẬT của dự án từ thư mục Google Drive đã nối.
 *
 * ⚠️ ĐÂY LÀ NGUỒN ẢNH DUY NHẤT, VÀ ĐÓ LÀ QUYẾT ĐỊNH CÓ LÝ DO.
 *
 * Ngày 12/09 chủ dự án phát hiện ba tấm ảnh AI đã "gỡ" vẫn chạy trên trang
 * thật, và chốt: không đưa ảnh AI lên trang nữa. Website dựng cho khách theo
 * đúng luật đó — hoặc ảnh của chính họ, hoặc không ảnh.
 *
 * Chưa nối Drive thì trả rỗng: trang vẫn dựng được, chỉ là toàn chữ.
 */
/**
 * Nhớ ảnh đã tải trong ÍT PHÚT.
 *
 * Mỗi tấm là một lượt gọi Drive + một lần thu nhỏ bằng sharp (~1–2 giây).
 * Bấm "Tải mã nguồn" rồi "Xem thử" là tải lại đúng ngần ấy ảnh lần thứ hai,
 * cho cùng một kết quả. Nhớ 5 phút là đủ cho một lượt làm việc, và đủ ngắn
 * để chủ dự án thêm ảnh mới vào Drive rồi thấy nó ở lần sau.
 */
const KHO_ANH = new Map<string, { luc: number; anh: AnhChoWeb[] }>();
const ANH_SONG_MS = 5 * 60_000;

export async function layAnhChoWeb(
  workspaceId: string,
  projectId: string,
  toiDa = SO_ANH_TOI_DA,
): Promise<AnhChoWeb[]> {
  const khoa = `${workspaceId}|${projectId}|${toiDa}`;
  const daCo = KHO_ANH.get(khoa);
  if (daCo && Date.now() - daCo.luc < ANH_SONG_MS) return daCo.anh;

  const drive = await dungDriveChoModule(workspaceId, projectId);
  if (!drive) return [];
  let danhSach;
  try {
    danhSach = await drive.lietKe();
  } catch {
    return [];
  }
  // Ảnh ở thư mục GỐC trước (chủ dự án để ảnh chính ở đó), rồi tới thư mục con.
  const uuTien = [...danhSach].sort((a, b) => (a.thuMucCon === "" ? 0 : 1) - (b.thuMucCon === "" ? 0 : 1));
  const ra: AnhChoWeb[] = [];
  for (const a of uuTien.slice(0, toiDa)) {
    try {
      const tai = await drive.tai(a.id);
      ra.push({
        ten: `${lamSlug(a.ten.replace(/\.[a-z0-9]+$/i, ""))}.webp`,
        // Mô tả trong `danh-sach-anh.csv` nếu chủ dự án có ghi; không thì tên
        // tệp đọc được. Alt rỗng là ảnh vô hình với người khiếm thị và Google.
        alt: a.moTa?.trim() || a.ten.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
        bytes: tai.bytes,
      });
    } catch {
      // Một ảnh hỏng không được làm hỏng cả bản dựng.
    }
  }
  // Chỉ nhớ khi có ảnh: chưa nối Drive thì lần sau hỏi lại ngay, để vừa nối
  // xong là thấy.
  if (ra.length > 0) {
    KHO_ANH.set(khoa, { luc: Date.now(), anh: ra });
    // Giữ tối đa vài dự án — đây là bộ nhớ đệm, không phải kho.
    if (KHO_ANH.size > 8) KHO_ANH.delete(KHO_ANH.keys().next().value!);
  }
  return ra;
}

/**
 * Đếm ảnh trong thư mục Drive của dự án — KHÔNG tải về.
 *
 * `null` = dự án chưa nối thư mục Drive. Phân biệt với `0` (đã nối nhưng
 * thư mục rỗng): hai chuyện đó cần hai câu nhắc khác hẳn nhau.
 */
export async function demAnhDrive(workspaceId: string, projectId: string): Promise<number | null> {
  const drive = await dungDriveChoModule(workspaceId, projectId);
  if (!drive) return null;
  try {
    return (await drive.lietKe()).length;
  } catch {
    return null;
  }
}

export interface KetQuaDungWeb extends KetQuaDungCay {
  hopDong: HopDongWeb;
  /** Tên tệp nén đề xuất. */
  tenTepNen: string;
  soAnh: number;
}

export async function dungWebChoDuAn(
  identity: AuthenticatedIdentity,
  projectId: string,
  thongTin: ThongTinTrang,
  /** Bỏ qua ảnh khi chỉ cần biết trạng thái — tải ảnh mất vài giây. */
  keCaAnh = true,
): Promise<KetQuaDungWeb | null> {
  const hopDong = await docHopDongWeb(identity, projectId);
  if (!hopDong) return null;
  const anh = keCaAnh ? await layAnhChoWeb(identity.workspaceId, projectId) : [];
  const kq = dungCayTep(hopDong.kienTruc, hopDong.thietKe, thongTin, hopDong.chu, anh);
  return { ...kq, hopDong, tenTepNen: `${lamSlug(hopDong.kienTruc.tenWebsite)}.zip`, soAnh: anh.length };
}
