import "server-only";
import "@/domain/modules/registry";
import { flattenModuleOutput, getModuleDefinition } from "@/domain/modules/module-definition";
import { dungDriveChoModule, getModuleJobRepository } from "@/lib/modules/module-engine.server";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { dungCayTep, lamSlug, type AnhChoWeb, type KetQuaDungCay, type ThongTinTrang } from "@/domain/dung-web/dung-cay-tep";
import { docHopDongTuDauRa, type HopDongWeb } from "@/domain/dung-web/tu-dau-ra";
import { uuTienAnh } from "@/domain/dung-web/thu-tu-anh";
import type { FontChoWeb } from "@/domain/dung-web/font-web";
import { layFontChoWeb } from "./font-web";

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
  /**
   * Id ảnh trên Drive chủ dự án CHỌN làm ảnh mở đầu. Không có thì tấm đầu ở
   * thư mục gốc — tức là thứ tự Drive trả về, không phải thứ tự chủ dự án
   * muốn: ảnh mở đầu là thứ khách nhìn đầu tiên, để máy chọn bừa là sai.
   */
  anhMoDau?: string,
): Promise<AnhChoWeb[]> {
  const khoa = `${workspaceId}|${projectId}|${toiDa}|${anhMoDau ?? ""}`;
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
  // Ảnh được CHỌN làm mở đầu lên trước hết, rồi thư mục gốc, rồi thư mục con.
  const uuTien = uuTienAnh(danhSach, anhMoDau);
  // Tải SONG SONG, giữ thứ tự: mỗi tấm 1–2 giây (Drive + thu nhỏ), tám tấm
  // nối đuôi là 8–16 giây nằm trong một hàm Vercel có trần. Một ảnh hỏng
  // không được làm hỏng cả bản dựng — bỏ tấm đó, giữ phần còn lại.
  const ketQua = await Promise.allSettled(
    uuTien.slice(0, toiDa).map(async (a): Promise<AnhChoWeb> => {
      const tai = await drive.tai(a.id);
      return {
        ten: `${lamSlug(a.ten.replace(/\.[a-z0-9]+$/i, ""))}.webp`,
        // Mô tả trong `danh-sach-anh.csv` nếu chủ dự án có ghi; không thì tên
        // tệp đọc được. Alt rỗng là ảnh vô hình với người khiếm thị và Google.
        alt: a.moTa?.trim() || a.ten.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
        bytes: tai.bytes,
      };
    }),
  );
  const ra: AnhChoWeb[] = ketQua.flatMap((k) => (k.status === "fulfilled" ? [k.value] : []));
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
 * Tên + id ảnh trong Drive của dự án — KHÔNG tải về. Thẻ dùng để đếm và để
 * cho chọn ảnh mở đầu.
 *
 * `null` = dự án chưa nối thư mục Drive. Phân biệt với danh sách rỗng (đã nối
 * nhưng thư mục trống): hai chuyện đó cần hai câu nhắc khác hẳn nhau.
 */
export async function lietKeAnhDrive(
  workspaceId: string,
  projectId: string,
): Promise<Array<{ id: string; ten: string; thuMucCon: string }> | null> {
  const drive = await dungDriveChoModule(workspaceId, projectId);
  if (!drive) return null;
  try {
    return (await drive.lietKe()).map((a) => ({ id: a.id, ten: a.ten, thuMucCon: a.thuMucCon }));
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
  /** Id ảnh Drive làm ảnh mở đầu (xem `layAnhChoWeb`). */
  anhMoDau?: string,
  /** Hợp đồng đã đọc sẵn (tuyến trạng thái đọc một lần cho cả hai việc). */
  hopDongSan?: HopDongWeb,
): Promise<KetQuaDungWeb | null> {
  const hopDong = hopDongSan ?? (await docHopDongWeb(identity, projectId));
  if (!hopDong) return null;
  // Ảnh và font tải song song; hỏi trạng thái (keCaAnh = false) thì không tải gì.
  const [anh, font]: [AnhChoWeb[], FontChoWeb | null] = keCaAnh
    ? await Promise.all([
        layAnhChoWeb(identity.workspaceId, projectId, SO_ANH_TOI_DA, anhMoDau),
        layFontChoWeb(hopDong.thietKe),
      ])
    : [[], null];
  const kq = dungCayTep(hopDong.kienTruc, hopDong.thietKe, thongTin, hopDong.chu, anh, font);
  return { ...kq, hopDong, tenTepNen: `${lamSlug(hopDong.kienTruc.tenWebsite)}.zip`, soAnh: anh.length };
}
