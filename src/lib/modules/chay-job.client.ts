/**
 * Tạo một job module và CHỜ nó xong — phía trình duyệt.
 *
 * Rút từ `pipeline-runner.tsx` để thẻ dựng web trong Trò chuyện dùng chung;
 * hai trần và cách báo lỗi giữ nguyên bài học ở đó:
 * - vòng chờ phải có trần thời gian (job kẹt "running" thì không quay mãi);
 * - hỏi trạng thái trượt liên tiếp (phiên hết hạn → 401 mãi) phải dừng và
 *   nói đúng nguyên nhân, không nuốt lỗi rồi quay tiếp.
 */
export interface JobXem {
  id: string;
  status: "queued" | "dispatching" | "running" | "succeeded" | "failed" | "timed_out";
  output: Record<string, unknown> | null;
  errorMessage: string | null;
}

interface VoLoi {
  error?: { message?: string; details?: { issues?: Array<{ path: string; message: string }> } };
}

export const NHIP_HOI_MS = 2_500;
/** 15 phút — gấp đôi bước lâu nhất đã biết (xem ghi chú ở pipeline-runner). */
export const TRAN_CHO_MS = 15 * 60_000;
const TRAN_LOI_LIEN_TIEP = 10;

const cho = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function taoVaChoJob(
  moduleKey: string,
  input: Record<string, unknown>,
  tuyChon: { tenBuoc?: string; onJobId?: (id: string) => void; nhipMs?: number; tranMs?: number } = {},
): Promise<JobXem> {
  const ten = tuyChon.tenBuoc ?? moduleKey;
  const r = await fetch(`/api/v1/modules/${encodeURIComponent(moduleKey)}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });
  if (!r.ok) {
    const vo = (await r.json().catch(() => ({}))) as VoLoi;
    throw new Error(vo.error?.details?.issues?.[0]?.message ?? vo.error?.message ?? `Không tạo được job cho bước "${ten}".`);
  }
  let { job } = (await r.json()) as { job: JobXem };
  tuyChon.onJobId?.(job.id);

  const hetHanLuc = Date.now() + (tuyChon.tranMs ?? TRAN_CHO_MS);
  let loiLienTiep = 0;
  while (["queued", "dispatching", "running"].includes(job.status)) {
    if (Date.now() > hetHanLuc) {
      throw new Error(`Bước "${ten}" chạy quá ${Math.round((tuyChon.tranMs ?? TRAN_CHO_MS) / 60_000)} phút mà chưa xong — nó có thể vẫn chạy ở máy chủ; xem ở màn Nội dung đầu ra.`);
    }
    await cho(tuyChon.nhipMs ?? NHIP_HOI_MS);
    const hoi = await fetch(`/api/v1/modules/${encodeURIComponent(moduleKey)}/jobs/${job.id}`, { cache: "no-store" });
    if (!hoi.ok) {
      loiLienTiep += 1;
      if (loiLienTiep >= TRAN_LOI_LIEN_TIEP) {
        throw new Error(
          `Không hỏi được trạng thái bước "${ten}" sau ${TRAN_LOI_LIEN_TIEP} lần (HTTP ${hoi.status}). ` +
            (hoi.status === 401 || hoi.status === 403 ? "Phiên đăng nhập có thể đã hết hạn — tải lại trang." : "Kiểm tra mạng rồi thử lại."),
        );
      }
      continue;
    }
    loiLienTiep = 0;
    job = ((await hoi.json()) as { job: JobXem }).job;
  }
  return job;
}
