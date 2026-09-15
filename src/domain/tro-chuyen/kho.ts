import type { VaiTro } from "./tro-chuyen";

/** Một cuộc trò chuyện — riêng của MỘT người trong MỘT workspace. */
export interface TroChuyenRecord {
  id: string;
  workspaceId: string;
  userId: string;
  /** Dự án làm ngữ cảnh; `null` = trò chuyện chung. */
  projectId: string | null;
  tieuDe: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TinNhanRecord {
  id: string;
  troChuyenId: string;
  vai: VaiTro;
  noiDung: string;
  /** Chỉ tin của trợ lý có: nhà cung cấp, model, token, thời gian — nền cho hạn mức sau này. */
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  createdAt: Date;
}

/**
 * Kho trò chuyện. MỌI hàm đọc/sửa cuộc trò chuyện đều nhận `workspaceId` VÀ
 * `userId`: người khác trong cùng workspace không đọc được trò chuyện của mình.
 * Tin nhắn chỉ được đọc/ghi sau khi cuộc trò chuyện đã được kiểm chủ.
 */
export interface TroChuyenRepository {
  tao(record: TroChuyenRecord): Promise<void>;
  lietKe(workspaceId: string, userId: string, gioiHan: number): Promise<TroChuyenRecord[]>;
  lay(workspaceId: string, userId: string, id: string): Promise<TroChuyenRecord | null>;
  capNhat(
    workspaceId: string,
    userId: string,
    id: string,
    thayDoi: { tieuDe?: string; projectId?: string | null; updatedAt: Date },
  ): Promise<void>;
  xoa(workspaceId: string, userId: string, id: string): Promise<boolean>;
  themTin(record: TinNhanRecord): Promise<void>;
  /** `gioiHan` tin MỚI NHẤT, trả theo thứ tự cũ → mới. */
  lietKeTin(troChuyenId: string, gioiHan: number): Promise<TinNhanRecord[]>;
}
