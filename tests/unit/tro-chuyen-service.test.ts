import { describe, expect, it } from "vitest";
import {
  TIEU_DE_MOI,
  TroChuyenService,
  chonKhoa,
  type KhoaCoTheDung,
  type PhuThuocTroChuyen,
} from "@/application/tro-chuyen/tro-chuyen-service";
import type { AiGenerateRequest, AiModelProvider } from "@/domain/ai/ai-model-provider";
import { AppError } from "@/domain/shared/app-error";
import type { TinNhanRecord, TroChuyenRecord, TroChuyenRepository } from "@/domain/tro-chuyen/kho";

/** Kho trong bộ nhớ, cùng hợp đồng với kho SQLite/Neon (kiểm riêng ở phép thử tích hợp). */
class KhoGia implements TroChuyenRepository {
  cuoc: TroChuyenRecord[] = [];
  tin: TinNhanRecord[] = [];
  async tao(r: TroChuyenRecord): Promise<void> {
    this.cuoc.push({ ...r });
  }
  async lietKe(ws: string, u: string, n: number): Promise<TroChuyenRecord[]> {
    return this.cuoc
      .filter((c) => c.workspaceId === ws && c.userId === u)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, n);
  }
  async lay(ws: string, u: string, id: string): Promise<TroChuyenRecord | null> {
    return this.cuoc.find((c) => c.id === id && c.workspaceId === ws && c.userId === u) ?? null;
  }
  async capNhat(ws: string, u: string, id: string, t: { tieuDe?: string; projectId?: string | null; updatedAt: Date }): Promise<void> {
    const c = await this.lay(ws, u, id);
    if (!c) return;
    if (t.tieuDe !== undefined) c.tieuDe = t.tieuDe;
    if (t.projectId !== undefined) c.projectId = t.projectId;
    c.updatedAt = t.updatedAt;
  }
  async xoa(ws: string, u: string, id: string): Promise<boolean> {
    const c = await this.lay(ws, u, id);
    if (!c) return false;
    this.cuoc = this.cuoc.filter((x) => x !== c);
    this.tin = this.tin.filter((t) => t.troChuyenId !== id);
    return true;
  }
  async themTin(r: TinNhanRecord): Promise<void> {
    this.tin.push({ ...r });
  }
  async lietKeTin(id: string, n: number): Promise<TinNhanRecord[]> {
    return this.tin
      .filter((t) => t.troChuyenId === id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-n);
  }
}

const khoa = (provider: KhoaCoTheDung["provider"], trangThai: KhoaCoTheDung["trangThai"] = "active"): KhoaCoTheDung => ({
  provider,
  model: `${provider}-model`,
  trangThai,
});

function dung(tuyChon: { khoa?: KhoaCoTheDung[]; dongHoDungYen?: boolean } = {}) {
  const kho = new KhoGia();
  const cacYeuCau: AiGenerateRequest[] = [];
  const trangThai: { loiAi: Error | null } = { loiAi: null };
  let dem = 0;
  let t = Date.parse("2026-09-15T01:00:00Z");
  const nhaCungCap: AiModelProvider = {
    id: "deepseek",
    model: "deepseek-v4-flash",
    mode: "live",
    async generate(req) {
      cacYeuCau.push(req);
      if (trangThai.loiAi) throw trangThai.loiAi;
      return {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        mode: "live",
        text: `Trả lời lượt ${cacYeuCau.length}`,
        usage: { inputTokens: 100, outputTokens: 20 },
        durationMs: 1200,
      };
    },
  };
  const p: PhuThuocTroChuyen = {
    kho,
    lietKeKhoa: async () => tuyChon.khoa ?? [khoa("deepseek")],
    dungNhaCungCap: async () => nhaCungCap,
    layDuAn: async (id) => (id === "p1" ? { ten: "Minh Anh Land (tên giả)", website: "https://minh-anh.example" } : null),
    moTaLoiAi: () => "Nhà cung cấp AI đang quá tải.",
    homNay: () => "15/09/2026",
    taoId: () => `id-${++dem}`,
    bayGio: () => (tuyChon.dongHoDungYen ? new Date(t) : new Date((t += 1_000))),
  };
  return { svc: new TroChuyenService(p), kho, cacYeuCau, trangThai };
}

const CHU = { workspaceId: "ws1", userId: "u1" };
const NGUOI_KHAC = { workspaceId: "ws1", userId: "u2" };

describe("TroChuyenService", () => {
  it("gửi tin: lưu tin, đặt tiêu đề từ tin đầu, gọi AI với ngày + dự án + lịch sử, lưu câu trả lời kèm token", async () => {
    const { svc, cacYeuCau } = dung();
    const cuoc = await svc.tao(CHU, { projectId: "p1" });
    expect(cuoc.tieuDe).toBe(TIEU_DE_MOI);

    const kq = await svc.gui(CHU, cuoc.id, { noiDung: "  Nên có những trang nào?\nchi tiết  " });
    expect(kq.cuoc.tieuDe).toBe("Nên có những trang nào?");
    expect(kq.tinTroLy).toMatchObject({
      vai: "tro-ly",
      noiDung: "Trả lời lượt 1",
      provider: "deepseek",
      inputTokens: 100,
      outputTokens: 20,
      durationMs: 1200,
    });
    expect(cacYeuCau[0]!.systemPrompt).toContain("15/09/2026");
    expect(cacYeuCau[0]!.systemPrompt).toContain("Minh Anh Land (tên giả)");
    expect(cacYeuCau[0]!.messages).toEqual([{ role: "user", content: "Nên có những trang nào?\nchi tiết" }]);

    await svc.gui(CHU, cuoc.id, { noiDung: "Viết trang chủ" });
    expect(cacYeuCau[1]!.messages!.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect((await svc.mo(CHU, cuoc.id)).tin.map((x) => x.vai)).toEqual(["nguoi-dung", "tro-ly", "nguoi-dung", "tro-ly"]);
    // Tiêu đề không bị tin thứ hai ghi đè.
    expect((await svc.danhSach(CHU))[0]!.tieuDe).toBe("Nên có những trang nào?");
  });

  it("đồng hồ không nhích: câu trả lời vẫn đứng SAU tin người dùng", async () => {
    const { svc } = dung({ dongHoDungYen: true });
    const cuoc = await svc.tao(CHU, {});
    const kq = await svc.gui(CHU, cuoc.id, { noiDung: "Xin chào" });
    expect(kq.tinTroLy.createdAt.getTime()).toBeGreaterThan(kq.tinNguoiDung.createdAt.getTime());
  });

  it("AI lỗi: tin người dùng VẪN được lưu, lỗi 502 nói rõ; Gửi lại không tạo tin trùng", async () => {
    const { svc, kho, trangThai } = dung();
    const cuoc = await svc.tao(CHU, {});
    trangThai.loiAi = new Error("503 upstream");
    const loi = await svc.gui(CHU, cuoc.id, { noiDung: "Xin chào" }).catch((e: unknown) => e);
    expect(loi).toBeInstanceOf(AppError);
    expect(loi).toMatchObject({ code: "AI_CHAT_FAILED", status: 502 });
    expect((loi as AppError).message).toContain("Nhà cung cấp AI đang quá tải.");
    expect((loi as AppError).message).toContain("đã được lưu");
    expect(kho.tin.map((x) => x.vai)).toEqual(["nguoi-dung"]);

    trangThai.loiAi = null;
    const kq = await svc.gui(CHU, cuoc.id, { guiLai: true });
    expect(kq.tinNguoiDung.noiDung).toBe("Xin chào");
    expect(kho.tin.map((x) => x.vai)).toEqual(["nguoi-dung", "tro-ly"]);
    await expect(svc.gui(CHU, cuoc.id, { guiLai: true })).rejects.toMatchObject({ code: "KHONG_CO_GI_DE_GUI_LAI" });
  });

  it("chưa có khoá, hoặc chọn nhà cung cấp chưa có khoá: từ chối và KHÔNG lưu tin", async () => {
    const a = dung({ khoa: [] });
    const c1 = await a.svc.tao(CHU, {});
    await expect(a.svc.gui(CHU, c1.id, { noiDung: "Xin chào" })).rejects.toMatchObject({ code: "AI_USER_KEY_MISSING" });
    expect(a.kho.tin).toHaveLength(0);

    const b = dung();
    const c2 = await b.svc.tao(CHU, {});
    await expect(b.svc.gui(CHU, c2.id, { noiDung: "Xin chào", provider: "anthropic" })).rejects.toMatchObject({
      code: "AI_USER_KEY_MISSING",
    });
    expect(b.kho.tin).toHaveLength(0);
  });

  it("tin trống hay quá dài bị từ chối trước khi đụng tới AI", async () => {
    const { svc, cacYeuCau } = dung();
    const cuoc = await svc.tao(CHU, {});
    await expect(svc.gui(CHU, cuoc.id, { noiDung: "   " })).rejects.toMatchObject({ code: "TIN_NHAN_KHONG_HOP_LE" });
    await expect(svc.gui(CHU, cuoc.id, { noiDung: "a".repeat(4_001) })).rejects.toMatchObject({ code: "TIN_NHAN_KHONG_HOP_LE" });
    expect(cacYeuCau).toHaveLength(0);
  });

  it("người khác cùng workspace không mở, gửi, xoá được; dự án ngoài workspace không gắn được", async () => {
    const { svc } = dung();
    const cuoc = await svc.tao(CHU, {});
    await expect(svc.mo(NGUOI_KHAC, cuoc.id)).rejects.toMatchObject({ code: "TRO_CHUYEN_NOT_FOUND" });
    await expect(svc.gui(NGUOI_KHAC, cuoc.id, { noiDung: "x" })).rejects.toMatchObject({ code: "TRO_CHUYEN_NOT_FOUND" });
    await expect(svc.xoa(NGUOI_KHAC, cuoc.id)).rejects.toMatchObject({ code: "TRO_CHUYEN_NOT_FOUND" });
    expect(await svc.danhSach(NGUOI_KHAC)).toEqual([]);
    await expect(svc.tao(CHU, { projectId: "p-khac" })).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    await svc.xoa(CHU, cuoc.id);
    expect(await svc.danhSach(CHU)).toEqual([]);
  });
});

describe("chonKhoa", () => {
  it("khoá đã xác minh trước, rồi rẻ trước; chọn đích danh mà không có thì null — không âm thầm đổi nhà", () => {
    expect(chonKhoa([khoa("anthropic"), khoa("deepseek", "unverified")])?.provider).toBe("anthropic");
    expect(chonKhoa([khoa("openai"), khoa("deepseek")])?.provider).toBe("deepseek");
    expect(chonKhoa([khoa("openai")], "openai")?.provider).toBe("openai");
    expect(chonKhoa([khoa("openai")], "gemini")).toBeNull();
    expect(chonKhoa([])).toBeNull();
  });
});
