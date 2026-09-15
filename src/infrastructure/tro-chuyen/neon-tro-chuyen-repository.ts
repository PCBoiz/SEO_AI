import { and, desc, eq } from "drizzle-orm";
import type {
  TinNhanRecord,
  TroChuyenRecord,
  TroChuyenRepository,
} from "@/domain/tro-chuyen/kho";
import type { NeonApplicationDatabase } from "@/infrastructure/database/neon-adapter";
import { pgTinNhanTroChuyen, pgTroChuyen } from "@/lib/db/postgres-schema";

export class NeonTroChuyenRepository implements TroChuyenRepository {
  constructor(private readonly database: NeonApplicationDatabase) {}

  private cuaChu(workspaceId: string, userId: string, id: string) {
    return and(
      eq(pgTroChuyen.id, id),
      eq(pgTroChuyen.workspaceId, workspaceId),
      eq(pgTroChuyen.userId, userId),
    );
  }

  async tao(record: TroChuyenRecord): Promise<void> {
    await this.database.insert(pgTroChuyen).values(record);
  }

  async lietKe(
    workspaceId: string,
    userId: string,
    gioiHan: number,
  ): Promise<TroChuyenRecord[]> {
    return this.database
      .select()
      .from(pgTroChuyen)
      .where(and(eq(pgTroChuyen.workspaceId, workspaceId), eq(pgTroChuyen.userId, userId)))
      .orderBy(desc(pgTroChuyen.updatedAt))
      .limit(gioiHan);
  }

  async lay(workspaceId: string, userId: string, id: string): Promise<TroChuyenRecord | null> {
    const rows = await this.database
      .select()
      .from(pgTroChuyen)
      .where(this.cuaChu(workspaceId, userId, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async capNhat(
    workspaceId: string,
    userId: string,
    id: string,
    thayDoi: { tieuDe?: string; projectId?: string | null; updatedAt: Date },
  ): Promise<void> {
    await this.database
      .update(pgTroChuyen)
      .set({
        ...(thayDoi.tieuDe !== undefined ? { tieuDe: thayDoi.tieuDe } : {}),
        ...(thayDoi.projectId !== undefined ? { projectId: thayDoi.projectId } : {}),
        updatedAt: thayDoi.updatedAt,
      })
      .where(this.cuaChu(workspaceId, userId, id));
  }

  async xoa(workspaceId: string, userId: string, id: string): Promise<boolean> {
    if (!(await this.lay(workspaceId, userId, id))) return false;
    await this.database.delete(pgTinNhanTroChuyen).where(eq(pgTinNhanTroChuyen.troChuyenId, id));
    await this.database.delete(pgTroChuyen).where(this.cuaChu(workspaceId, userId, id));
    return true;
  }

  async themTin(record: TinNhanRecord): Promise<void> {
    await this.database.insert(pgTinNhanTroChuyen).values(record);
  }

  async lietKeTin(troChuyenId: string, gioiHan: number): Promise<TinNhanRecord[]> {
    const moiTruoc = await this.database
      .select()
      .from(pgTinNhanTroChuyen)
      .where(eq(pgTinNhanTroChuyen.troChuyenId, troChuyenId))
      .orderBy(desc(pgTinNhanTroChuyen.createdAt))
      .limit(gioiHan);
    return moiTruoc.reverse();
  }
}
