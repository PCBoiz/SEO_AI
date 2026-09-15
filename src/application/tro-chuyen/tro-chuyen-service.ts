import type { AiModelProvider, AiProviderId } from "@/domain/ai/ai-model-provider";
import { AppError, NotFoundError, ValidationError } from "@/domain/shared/app-error";
import type { TinNhanRecord, TroChuyenRecord, TroChuyenRepository } from "@/domain/tro-chuyen/kho";
import {
  GIOI_HAN_TRO_CHUYEN,
  catLichSu,
  dungLoiDanTroLy,
  kiemTinNhan,
  tieuDeTuTinDau,
  type NguCanhDuAn,
} from "@/domain/tro-chuyen/tro-chuyen";

export interface NguoiTroChuyen {
  workspaceId: string;
  userId: string;
}

export interface KhoaCoTheDung {
  provider: AiProviderId;
  /** Model sẽ dùng: model người dùng chọn ở trang Khoá AI, không có thì mặc định. */
  model: string;
  trangThai: "active" | "unverified" | "error";
}

export interface PhuThuocTroChuyen {
  kho: TroChuyenRepository;
  lietKeKhoa(userId: string): Promise<KhoaCoTheDung[]>;
  dungNhaCungCap(userId: string, provider: AiProviderId, model: string): Promise<AiModelProvider | null>;
  /** Dự án trong workspace của người đó; không có (hoặc khác workspace) → null. */
  layDuAn(projectId: string): Promise<NguCanhDuAn | null>;
  /** Câu lỗi AI đã làm sạch (không lộ khoá, không lộ thân phản hồi thô). */
  moTaLoiAi(loi: unknown): string;
  homNay(): string;
  taoId(): string;
  bayGio(): Date;
}

export const TIEU_DE_MOI = "Cuộc trò chuyện mới";

/** Rẻ trước: DeepSeek thường dưới 2.000đ một website (đo ở luồng dựng web). */
const THU_TU_UU_TIEN: readonly AiProviderId[] = ["deepseek", "anthropic", "openai", "gemini"];

/**
 * Chọn khoá cho một lượt. Người dùng chọn nhà cung cấp nào thì dùng đúng cái đó
 * (không có → null, KHÔNG âm thầm đổi sang nhà khác và tính tiền ở tài khoản
 * khác). Không chọn: khoá đã xác minh trước, rồi theo thứ tự rẻ → đắt.
 */
export function chonKhoa(khoa: readonly KhoaCoTheDung[], yeuCau?: string | null): KhoaCoTheDung | null {
  if (yeuCau) return khoa.find((k) => k.provider === yeuCau) ?? null;
  const xep = [...khoa].sort(
    (a, b) =>
      (a.trangThai === "active" ? 0 : 1) - (b.trangThai === "active" ? 0 : 1) ||
      THU_TU_UU_TIEN.indexOf(a.provider) - THU_TU_UU_TIEN.indexOf(b.provider),
  );
  return xep[0] ?? null;
}

export class TroChuyenService {
  constructor(private readonly p: PhuThuocTroChuyen) {}

  danhSach(nguoi: NguoiTroChuyen): Promise<TroChuyenRecord[]> {
    return this.p.kho.lietKe(nguoi.workspaceId, nguoi.userId, 50);
  }

  async mo(nguoi: NguoiTroChuyen, id: string): Promise<{ cuoc: TroChuyenRecord; tin: TinNhanRecord[] }> {
    const cuoc = await this.layCuaMinh(nguoi, id);
    return { cuoc, tin: await this.p.kho.lietKeTin(cuoc.id, 200) };
  }

  async tao(nguoi: NguoiTroChuyen, dauVao: { projectId?: string | null }): Promise<TroChuyenRecord> {
    const projectId = dauVao.projectId?.trim() || null;
    if (projectId && !(await this.p.layDuAn(projectId))) {
      throw new NotFoundError("PROJECT_NOT_FOUND", "Không tìm thấy dự án này trong workspace.");
    }
    const bayGio = this.p.bayGio();
    const cuoc: TroChuyenRecord = {
      id: this.p.taoId(),
      workspaceId: nguoi.workspaceId,
      userId: nguoi.userId,
      projectId,
      tieuDe: TIEU_DE_MOI,
      createdAt: bayGio,
      updatedAt: bayGio,
    };
    await this.p.kho.tao(cuoc);
    return cuoc;
  }

  async xoa(nguoi: NguoiTroChuyen, id: string): Promise<void> {
    if (!(await this.p.kho.xoa(nguoi.workspaceId, nguoi.userId, id))) throw khongThay(id);
  }

  /**
   * Gửi một tin và lấy câu trả lời.
   *
   * - Tin người dùng được LƯU TRƯỚC khi gọi AI: AI lỗi (hết tiền, mạng, quá
   *   tải) thì tin vẫn còn, người dùng không phải gõ lại.
   * - `guiLai`: không lưu tin mới, trả lời lại tin người dùng cuối cùng — nút
   *   "Gửi lại" sau một lượt lỗi. Tin cuối không phải của người dùng thì từ chối.
   */
  async gui(
    nguoi: NguoiTroChuyen,
    id: string,
    dauVao: { noiDung?: unknown; provider?: string | null; guiLai?: boolean },
  ): Promise<{ cuoc: TroChuyenRecord; tinNguoiDung: TinNhanRecord; tinTroLy: TinNhanRecord }> {
    const cuoc = await this.layCuaMinh(nguoi, id);

    let tinNguoiDung: TinNhanRecord | null = null;
    let noiDungMoi: string | null = null;
    if (dauVao.guiLai) {
      const gan = await this.p.kho.lietKeTin(cuoc.id, 1);
      tinNguoiDung = gan[0]?.vai === "nguoi-dung" ? gan[0] : null;
      if (!tinNguoiDung) {
        throw new ValidationError("KHONG_CO_GI_DE_GUI_LAI", "Tin cuối đã có câu trả lời — gõ tin mới để hỏi tiếp.");
      }
    } else {
      const kiem = kiemTinNhan(dauVao.noiDung);
      if (!kiem.ok) throw new ValidationError("TIN_NHAN_KHONG_HOP_LE", kiem.lyDo);
      noiDungMoi = kiem.noiDung;
    }

    const khoa = chonKhoa(await this.p.lietKeKhoa(nguoi.userId), dauVao.provider);
    const nhaCungCap = khoa ? await this.p.dungNhaCungCap(nguoi.userId, khoa.provider, khoa.model) : null;
    if (!khoa || !nhaCungCap) {
      throw new ValidationError(
        "AI_USER_KEY_MISSING",
        dauVao.provider
          ? `Chưa có khoá ${dauVao.provider} — chọn khoá khác, hoặc thêm ở trang Khoá AI (/ai-keys).`
          : "Chưa có khoá AI nào — vào trang Khoá AI (/ai-keys) thêm một khoá rồi quay lại. Trò chuyện chạy bằng khoá của bạn.",
      );
    }

    let tieuDe = cuoc.tieuDe;
    if (noiDungMoi !== null) {
      tinNguoiDung = {
        ...rong(),
        id: this.p.taoId(),
        troChuyenId: cuoc.id,
        vai: "nguoi-dung",
        noiDung: noiDungMoi,
        createdAt: this.p.bayGio(),
      };
      await this.p.kho.themTin(tinNguoiDung);
      if (tieuDe === TIEU_DE_MOI) tieuDe = tieuDeTuTinDau(noiDungMoi);
      await this.p.kho.capNhat(nguoi.workspaceId, nguoi.userId, cuoc.id, { tieuDe, updatedAt: tinNguoiDung.createdAt });
    }
    const tinHoi = tinNguoiDung!;

    const lichSu = catLichSu(
      (await this.p.kho.lietKeTin(cuoc.id, GIOI_HAN_TRO_CHUYEN.soTinLichSuToiDa * 2)).map((t) => ({
        vai: t.vai,
        noiDung: t.noiDung,
      })),
    );
    const duAn = cuoc.projectId ? await this.p.layDuAn(cuoc.projectId) : null;

    let ketQua;
    try {
      ketQua = await nhaCungCap.generate({
        prompt: tinHoi.noiDung,
        systemPrompt: dungLoiDanTroLy({ homNay: this.p.homNay(), duAn }),
        maxOutputTokens: GIOI_HAN_TRO_CHUYEN.tokenTraLoiToiDa,
        messages: lichSu.map((t) => ({ role: t.vai === "nguoi-dung" ? "user" : "assistant", content: t.noiDung })),
      });
    } catch (loi) {
      throw new AppError(
        "AI_CHAT_FAILED",
        `${this.p.moTaLoiAi(loi)} Tin nhắn của bạn đã được lưu — bấm "Gửi lại" để thử tiếp.`,
        { status: 502, cause: loi },
      );
    }

    // Luôn SAU tin người dùng ít nhất 1 ms — thứ tự hai tin không được hoà.
    const luc = new Date(Math.max(this.p.bayGio().getTime(), tinHoi.createdAt.getTime() + 1));
    const tinTroLy: TinNhanRecord = {
      id: this.p.taoId(),
      troChuyenId: cuoc.id,
      vai: "tro-ly",
      noiDung: ketQua.text,
      provider: ketQua.provider,
      model: ketQua.model,
      inputTokens: ketQua.usage.inputTokens ?? null,
      outputTokens: ketQua.usage.outputTokens ?? null,
      durationMs: ketQua.durationMs,
      createdAt: luc,
    };
    await this.p.kho.themTin(tinTroLy);
    await this.p.kho.capNhat(nguoi.workspaceId, nguoi.userId, cuoc.id, { updatedAt: luc });
    return { cuoc: { ...cuoc, tieuDe, updatedAt: luc }, tinNguoiDung: tinHoi, tinTroLy };
  }

  private async layCuaMinh(nguoi: NguoiTroChuyen, id: string): Promise<TroChuyenRecord> {
    const cuoc = await this.p.kho.lay(nguoi.workspaceId, nguoi.userId, id);
    if (!cuoc) throw khongThay(id);
    return cuoc;
  }
}

function rong(): Pick<TinNhanRecord, "provider" | "model" | "inputTokens" | "outputTokens" | "durationMs"> {
  return { provider: null, model: null, inputTokens: null, outputTokens: null, durationMs: null };
}

function khongThay(id: string): NotFoundError {
  // Cuộc của người khác cũng trả đúng câu này — không để lộ là nó có tồn tại.
  return new NotFoundError("TRO_CHUYEN_NOT_FOUND", "Không tìm thấy cuộc trò chuyện.", { id });
}
