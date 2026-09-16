import type { TinNhanRecord, TroChuyenRecord } from "./kho";

/** Dạng gửi về trình duyệt — ngày là chuỗi ISO, không có workspace/user. */
export interface TroChuyenXem {
  id: string;
  projectId: string | null;
  tieuDe: string;
  updatedAt: string;
}

export interface TinNhanXem {
  id: string;
  vai: TinNhanRecord["vai"];
  noiDung: string;
  model: string | null;
  createdAt: string;
  /**
   * Lượng dùng thật của lượt đó, do nhà cung cấp trả về (null = họ không trả).
   * Gửi xuống trình duyệt vì mỗi lượt hỏi tiêu tiền của chính người dùng — màn
   * hình phải nói ra. KHÔNG quy thành tiền: xem `domain/tro-chuyen/dung-luong.ts`.
   */
  provider: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
}

export function xemCuoc(r: TroChuyenRecord): TroChuyenXem {
  return { id: r.id, projectId: r.projectId, tieuDe: r.tieuDe, updatedAt: r.updatedAt.toISOString() };
}

export function xemTin(r: TinNhanRecord): TinNhanXem {
  return {
    id: r.id,
    vai: r.vai,
    noiDung: r.noiDung,
    model: r.model,
    createdAt: r.createdAt.toISOString(),
    provider: r.provider,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    durationMs: r.durationMs,
  };
}
