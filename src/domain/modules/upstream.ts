import type { ModuleJob } from "@/domain/modules/module-job";

/**
 * Chọn các job làm ngữ cảnh "bước trước" cho một job sắp chạy.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LƯỢT CHẠY THẮNG BẢN GHIM (sửa 12/09/2026).
 *
 * Trước đây engine chỉ có một nguồn: bản "chính thức" của mỗi module trong dự
 * án — bản ghim nếu có, không thì bản thành công mới nhất. Đúng cho việc chạy
 * TỪNG module riêng lẻ (ghim là để nói "dùng bản này"). Sai cho việc chạy CẢ
 * LUỒNG: bước 7 vừa viết tiêu đề cho chủ đề B, bước 8 lại nhận tiêu đề chủ đề
 * A đã ghim từ tuần trước — và bài ra là một bài lai hai chủ đề, không có lỗi
 * nào báo.
 *
 * Với lịch đăng tự động thì còn tệ hơn: không có ai ngồi xem để phát hiện, và
 * một lượt chạy tay cùng lúc cũng chen được đầu ra vào lượt tự động.
 *
 * Nên: job nào mang `upstreamJobIds` (các bước đã xong CỦA CHÍNH LƯỢT NÀY) thì
 * các job đó ghi đè bản chính thức theo từng module. Module ngoài lượt (ví dụ
 * kết quả quét website #20) vẫn lấy bản chính thức như cũ.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function chonJobUpstream(
  jobHienTai: Pick<ModuleJob, "moduleKey" | "projectId">,
  banChinhThuc: readonly ModuleJob[],
  cuaLuot: readonly ModuleJob[],
): ModuleJob[] {
  const theoModule = new Map<string, ModuleJob>();
  for (const job of banChinhThuc) {
    if (job.moduleKey === jobHienTai.moduleKey || !job.output) continue;
    theoModule.set(job.moduleKey, job);
  }
  for (const job of cuaLuot) {
    // Chỉ nhận job cùng dự án, đã thành công, có đầu ra. `upstreamJobIds` đi
    // qua đầu vào nên không được tin mù: job của dự án khác không được lọt vào
    // ngữ cảnh (lộ nội dung chéo dự án), job hỏng không được đè bản tốt.
    if (job.projectId !== jobHienTai.projectId) continue;
    if (job.status !== "succeeded" || !job.output) continue;
    if (job.moduleKey === jobHienTai.moduleKey) continue;
    theoModule.set(job.moduleKey, job);
  }
  return [...theoModule.values()];
}
