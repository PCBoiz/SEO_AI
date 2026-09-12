import "server-only";
import "@/domain/modules/registry";
import { flattenModuleOutput, getModuleDefinition } from "@/domain/modules/module-definition";
import { getModuleJobRepository } from "@/lib/modules/module-engine.server";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { dungCayTep, lamSlug, type KetQuaDungCay, type ThongTinTrang } from "@/domain/dung-web/dung-cay-tep";
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

export interface KetQuaDungWeb extends KetQuaDungCay {
  hopDong: HopDongWeb;
  /** Tên tệp nén đề xuất. */
  tenTepNen: string;
}

export async function dungWebChoDuAn(
  identity: AuthenticatedIdentity,
  projectId: string,
  thongTin: ThongTinTrang,
): Promise<KetQuaDungWeb | null> {
  const hopDong = await docHopDongWeb(identity, projectId);
  if (!hopDong) return null;
  const kq = dungCayTep(hopDong.kienTruc, hopDong.thietKe, thongTin, hopDong.chu);
  return { ...kq, hopDong, tenTepNen: `${lamSlug(hopDong.kienTruc.tenWebsite)}.zip` };
}
