import { and, desc, eq } from "drizzle-orm";
import type {
  TinNhanRecord,
  TroChuyenRecord,
  TroChuyenRepository,
} from "@/domain/tro-chuyen/kho";
import type { ApplicationDatabase } from "@/infrastructure/database/sqlite-adapter";
import { tinNhanTroChuyen, troChuyen } from "@/lib/db/schema";

export class SqliteTroChuyenRepository implements TroChuyenRepository {
  constructor(private readonly database: ApplicationDatabase) {}

  private cuaChu(workspaceId: string, userId: string, id: string) {
    return and(
      eq(troChuyen.id, id),
      eq(troChuyen.workspaceId, workspaceId),
      eq(troChuyen.userId, userId),
    );
  }

  async tao(record: TroChuyenRecord): Promise<void> {
    this.database.insert(troChuyen).values(record).run();
  }

  async lietKe(
    workspaceId: string,
    userId: string,
    gioiHan: number,
  ): Promise<TroChuyenRecord[]> {
    return this.database
      .select()
      .from(troChuyen)
      .where(and(eq(troChuyen.workspaceId, workspaceId), eq(troChuyen.userId, userId)))
      .orderBy(desc(troChuyen.updatedAt))
      .limit(gioiHan)
      .all();
  }

  async lay(workspaceId: string, userId: string, id: string): Promise<TroChuyenRecord | null> {
    return this.database.select().from(troChuyen).where(this.cuaChu(workspaceId, userId, id)).get() ?? null;
  }

  async capNhat(
    workspaceId: string,
    userId: string,
    id: string,
    thayDoi: { tieuDe?: string; projectId?: string | null; updatedAt: Date },
  ): Promise<void> {
    this.database
      .update(troChuyen)
      .set({
        ...(thayDoi.tieuDe !== undefined ? { tieuDe: thayDoi.tieuDe } : {}),
        ...(thayDoi.projectId !== undefined ? { projectId: thayDoi.projectId } : {}),
        updatedAt: thayDoi.updatedAt,
      })
      .where(this.cuaChu(workspaceId, userId, id))
      .run();
  }

  async xoa(workspaceId: string, userId: string, id: string): Promise<boolean> {
    // Kiểm chủ TRƯỚC, rồi xoá tin nhắn bằng tay: không dựa vào khoá ngoại
    // cascade (SQLite chỉ thực thi khi bật PRAGMA foreign_keys).
    if (!(await this.lay(workspaceId, userId, id))) return false;
    this.database.delete(tinNhanTroChuyen).where(eq(tinNhanTroChuyen.troChuyenId, id)).run();
    this.database.delete(troChuyen).where(this.cuaChu(workspaceId, userId, id)).run();
    return true;
  }

  async themTin(record: TinNhanRecord): Promise<void> {
    this.database.insert(tinNhanTroChuyen).values(record).run();
  }

  async lietKeTin(troChuyenId: string, gioiHan: number): Promise<TinNhanRecord[]> {
    const moiTruoc = this.database
      .select()
      .from(tinNhanTroChuyen)
      .where(eq(tinNhanTroChuyen.troChuyenId, troChuyenId))
      .orderBy(desc(tinNhanTroChuyen.createdAt))
      .limit(gioiHan)
      .all();
    return moiTruoc.reverse();
  }
}
