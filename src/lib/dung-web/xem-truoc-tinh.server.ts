import "server-only";

import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { dungCayTep, type KetQuaDungCay } from "@/domain/dung-web/dung-cay-tep";
import { SO_ANH_TOI_DA, docHopDongWeb, layAnhChoWeb } from "./tu-job.server";
import { docThongTinWeb } from "./thong-tin-web.server";

/**
 * Bản dựng dùng cho XEM THỬ TĨNH — cây tệp + vài thứ giao diện cần.
 *
 * Khác bản tải về/đẩy GitHub ở hai chỗ, đều cố ý:
 * - Chưa có số điện thoại thật thì dùng SỐ GIỮ CHỖ `0000 000 000` thay vì từ
 *   chối: chủ dự án cần NHÌN trang trước, rồi mới quyết có điền số hay không.
 *   Giao diện nói rõ số đang là số mẫu. Số thật chỉ bắt buộc lúc đưa lên mạng.
 * - Không tải font tự lưu (`layFontChoWeb`): bản xem thử nạp font từ Google
 *   bằng thẻ link — đỡ vài giây tải font mỗi lần mở, và không phải phục vụ
 *   `public/fonts/`.
 *
 * NHỚ 20 GIÂY theo dự án: một lần xem là một trang + tám ảnh + icon, tức ~10
 * yêu cầu nối đuôi; dựng lại cây mỗi yêu cầu là mười lần đọc bảng job cho cùng
 * một kết quả. Hai mươi giây đủ cho một lượt xem, đủ ngắn để chạy lại bước
 * viết chữ rồi thấy bản mới. `?moi=1` bỏ qua bộ nhớ (nút "Xem lại").
 */
export const SO_GIU_CHO = "0000 000 000";

export interface BanXemTruoc extends KetQuaDungCay {
  tenWebsite: string;
  trang: Array<{ duong: string; tieuDe: string }>;
  /** Trang đang dùng số giữ chỗ (chưa lưu số thật). */
  soGiuCho: boolean;
  luc: number;
}

const KHO = new Map<string, { luc: number; hua: Promise<BanXemTruoc | null> }>();
const SONG_MS = 20_000;

export async function banXemTruoc(
  identity: AuthenticatedIdentity,
  projectId: string,
  tuyChon: { moi?: boolean } = {},
): Promise<BanXemTruoc | null> {
  const khoa = `${identity.workspaceId}|${projectId}`;
  const daCo = KHO.get(khoa);
  if (daCo && !tuyChon.moi && Date.now() - daCo.luc < SONG_MS) return daCo.hua;

  const hua = (async (): Promise<BanXemTruoc | null> => {
    // Dự án phải thuộc workspace của người gọi — kiểm TRƯỚC mọi việc khác.
    const duAn = await getProjectService().get(identity, projectId);
    const hopDong = await docHopDongWeb(identity, projectId);
    if (!hopDong) return null;
    const daLuu = await docThongTinWeb(projectId).catch(() => null);
    const anh = await layAnhChoWeb(identity.workspaceId, projectId, SO_ANH_TOI_DA, daLuu?.anhMoDau || undefined);
    const kq = dungCayTep(
      hopDong.kienTruc,
      hopDong.thietKe,
      { dienThoai: daLuu?.dienThoai || SO_GIU_CHO, zalo: daLuu?.zalo ?? "", diaChi: duAn.website },
      hopDong.chu,
      anh,
      null,
    );
    return {
      ...kq,
      tenWebsite: hopDong.kienTruc.tenWebsite,
      trang: hopDong.kienTruc.trang.map((t) => ({ duong: t.duong, tieuDe: t.tieuDe })),
      soGiuCho: !daLuu?.dienThoai,
      luc: Date.now(),
    };
  })();
  KHO.set(khoa, { luc: Date.now(), hua });
  // Hỏng thì không giữ: lần sau thử lại từ đầu thay vì trả lỗi cũ suốt 20 giây.
  hua.catch(() => KHO.delete(khoa));
  if (KHO.size > 16) KHO.delete(KHO.keys().next().value!);
  return hua;
}

/** Quên bản đã nhớ của một dự án — gọi sau khi một bước dựng web chạy xong. */
export function quenBanXemTruoc(workspaceId: string, projectId: string): void {
  KHO.delete(`${workspaceId}|${projectId}`);
}
