import { describe, expect, it } from "vitest";
import { aiModelCatalog, NGAY_TRA_DANH_MUC } from "@/domain/ai/ai-model-catalog";
import { getAiProviderStatuses } from "@/infrastructure/config/ai-environment";

/**
 * Danh mục model và mặc định của từng hãng phải đi cùng nhau: đổi một bên mà
 * quên bên kia là màn Khoá AI bày một tên, còn lượt gọi dùng tên khác.
 */
describe("aiModelCatalog", () => {
  it("mỗi hãng có ít nhất 2 lựa chọn, id không trùng, có ngày tra", () => {
    expect(NGAY_TRA_DANH_MUC).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    for (const [hang, ds] of Object.entries(aiModelCatalog)) {
      expect(ds.length, hang).toBeGreaterThanOrEqual(2);
      expect(new Set(ds.map((m) => m.id)).size, hang).toBe(ds.length);
      for (const m of ds) {
        expect(m.id, hang).toMatch(/^[a-z0-9.-]+$/);
        expect(m.label.trim().length, m.id).toBeGreaterThan(0);
      }
    }
  });

  it("model mặc định của từng hãng (ai-environment) nằm trong danh mục", () => {
    for (const st of getAiProviderStatuses({})) {
      const ids = aiModelCatalog[st.id].map((m) => m.id);
      expect(ids, `${st.id}: mặc định ${st.model}`).toContain(st.model);
    }
  });

  it("tên đã nghỉ hưu không còn trong danh mục", () => {
    const tatCa = Object.values(aiModelCatalog).flatMap((ds) => ds.map((m) => m.id));
    // deepseek-v4-flash: model đã nghỉ (20/09/2026), tên chỉ còn được chuyển tiếp.
    // gpt-5 / gpt-5-mini / gpt-5-nano: tắt 11/12/2026.
    for (const cu of ["deepseek-v4-flash", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1-nano"]) {
      expect(tatCa, cu).not.toContain(cu);
    }
  });
});
