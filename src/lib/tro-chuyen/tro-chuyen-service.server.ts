import "server-only";

import { randomUUID } from "node:crypto";
import { TroChuyenService, type KhoaCoTheDung } from "@/application/tro-chuyen/tro-chuyen-service";
import { NotFoundError } from "@/domain/shared/app-error";
import { NeonTroChuyenRepository } from "@/infrastructure/tro-chuyen/neon-tro-chuyen-repository";
import { SqliteTroChuyenRepository } from "@/infrastructure/tro-chuyen/sqlite-tro-chuyen-repository";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getUserAiModelProvider, listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { sanitizeProviderErrorMessage } from "@/lib/ai/sanitize-provider-error";
import { errorResponse } from "@/lib/api-response";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { databaseAdapter } from "@/lib/db";
import { getProjectService } from "@/lib/projects/project-service.server";

/**
 * Bảng trò chuyện CHƯA CÓ trong cơ sở dữ liệu — migration chưa chạy.
 *
 * Vercel tự dựng ngay khi mã được đẩy, còn migration Neon do chủ dự án chạy
 * tay (`npm run db:neon:migrate`). Khoảng giữa hai việc đó màn Trò chuyện
 * không được chết 500: nó phải nói đúng việc cần làm.
 * Neon: mã Postgres 42P01 (undefined_table) nằm ở `cause` — Drizzle bọc lỗi.
 */
export function thieuBangTroChuyen(loi: unknown): boolean {
  const cacLop = [loi, (loi as { cause?: unknown } | null)?.cause];
  return cacLop.some((lop) => {
    const e = lop as { code?: unknown; message?: unknown } | null | undefined;
    if (!e) return false;
    return (
      e.code === "42P01" ||
      /no such table: (tro_chuyen|tin_nhan_tro_chuyen)|relation "(tro_chuyen|tin_nhan_tro_chuyen)" does not exist/i.test(
        String(e.message ?? ""),
      )
    );
  });
}

export const LOI_CHUA_MIGRATE =
  "Trò chuyện chưa sẵn sàng: cơ sở dữ liệu chưa có bảng trò chuyện. Chủ dự án chạy `npm run db:neon:migrate` một lần (VIEC-CAN-LAM.md, A8).";

/** Phản hồi lỗi cho các tuyến trò chuyện: thiếu bảng → 503 kèm việc cần làm. */
export function phanHoiLoiTroChuyen(error: unknown): Response {
  if (thieuBangTroChuyen(error)) {
    return Response.json(
      { error: { code: "TRO_CHUYEN_CHUA_MIGRATE", message: LOI_CHUA_MIGRATE, details: {} } },
      { status: 503 },
    );
  }
  return errorResponse(error);
}

const DINH_DANG_NGAY = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Khoá AI người dùng đã lưu, kèm model sẽ dùng — cho cả dịch vụ và màn hình. */
export async function lietKeKhoaTroChuyen(userId: string): Promise<KhoaCoTheDung[]> {
  const macDinh = listAiProviderStatuses();
  const trangThai = await getAiKeyService().listStatus(userId);
  return trangThai
    .filter((k) => k.configured)
    .map((k) => ({
      provider: k.provider,
      model: k.model?.trim() || macDinh.find((m) => m.id === k.provider)?.model || "",
      trangThai: k.status,
    }));
}

export function getTroChuyenService(identity: AuthenticatedIdentity): TroChuyenService {
  const kho =
    databaseAdapter.kind === "neon"
      ? new NeonTroChuyenRepository(databaseAdapter.db)
      : new SqliteTroChuyenRepository(databaseAdapter.db);
  return new TroChuyenService({
    kho,
    lietKeKhoa: lietKeKhoaTroChuyen,
    async dungNhaCungCap(userId, provider, model) {
      const khoa = await getAiKeyService().getUsableKey(userId, provider);
      if (!khoa) return null;
      return getUserAiModelProvider({
        provider,
        model,
        apiKey: khoa.apiKey,
        // Vercel cắt tuyến gửi tin ở 120 s; chừa chỗ cho đọc/ghi cơ sở dữ liệu.
        timeoutMs: 90_000,
        maxOutputTokens: 2_048,
      });
    },
    async layDuAn(projectId) {
      try {
        const duAn = await getProjectService().get(identity, projectId);
        return { ten: duAn.name, website: duAn.website, ngonNgu: duAn.language, giongVan: duAn.tone };
      } catch (loi) {
        if (loi instanceof NotFoundError) return null;
        throw loi;
      }
    },
    moTaLoiAi: (loi) => sanitizeProviderErrorMessage(loi, "AI chưa trả lời được."),
    homNay: () => DINH_DANG_NGAY.format(new Date()),
    taoId: () => randomUUID(),
    bayGio: () => new Date(),
  });
}
