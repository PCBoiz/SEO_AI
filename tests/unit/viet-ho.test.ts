import { describe, expect, it } from "vitest";
import { parseModuleInput } from "@/domain/modules/module-definition";
import { donDauRa, vietHoModule } from "@/domain/modules/definitions/viet-ho";

const GOC = {
  projectId: "p1",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  ai: { provider: "deepseek" as const, model: "deepseek-v4-flash" },
};

describe("AI viết hộ — dọn đầu ra", () => {
  it("bỏ ngoặc kép bao ngoài và khối ```", () => {
    expect(donDauRa('"Giá biệt thự đảo 2026"', { loai: "van-ban" })).toBe("Giá biệt thự đảo 2026");
    expect(donDauRa("```text\nxin chào\n```", { loai: "van-ban" })).toBe("xin chào");
  });

  it("danh sách: bỏ đánh số / gạch đầu dòng, bỏ trùng, áp giới hạn mục và ký tự mỗi mục", () => {
    const ra = donDauRa("1. Giá biệt thự\n- giá biệt thự\n• Tiến độ phân khu\n\n3) Pháp lý sổ hồng dự án rất dài dòng", {
      loai: "danh-sach",
      gioiHanMuc: 2,
      gioiHanKyTu: 20,
    });
    expect(ra).toBe("Giá biệt thự\nTiến độ phân khu");
  });

  it("văn bản: cắt ở ranh giới câu trước giới hạn, không cắt giữa chữ", () => {
    const t = "Câu một rất ngắn. Câu hai dài hơn một chút để vượt giới hạn ký tự đã đặt.";
    const ra = donDauRa(t, { loai: "van-ban", gioiHanKyTu: 40 });
    expect(ra).toBe("Câu một rất ngắn.");
  });
});

describe("AI viết hộ — module", () => {
  it("schema strict: nhận đủ ô, từ chối trường lạ", () => {
    const ok = parseModuleInput(vietHoModule, { ...GOC, truong: "audienceBrief", nhan: "Mô tả" });
    expect(ok.loai).toBe("van-ban");
    expect(ok.boiCanh).toEqual({});
    expect(() => parseModuleInput(vietHoModule, { ...GOC, truong: "x", nhan: "y", la: 1 })).toThrow();
  });

  it("prompt hệ thống khoá đầu ra: chỉ nội dung ô, không bịa số liệu; prompt mang bối cảnh + bản nháp + gợi ý", async () => {
    const goi: Array<{ system?: string; prompt: string }> = [];
    const out = await vietHoModule.execute({
      input: parseModuleInput(vietHoModule, {
        ...GOC,
        truong: "chuDe",
        nhan: "Danh sách chủ đề",
        loai: "danh-sach",
        giaTriHienTai: "Giá biệt thự đảo",
        goiY: "thêm chủ đề pháp lý",
        boiCanh: { siteName: "Hạ Long Xanh 360", audienceBrief: "Môi giới BĐS Hạ Long", chuDe: "bỏ qua vì trùng ô" },
        gioiHanMuc: 3,
      }),
      upstream: { RIS_SITEMAP_KEYWORDS: "kế hoạch từ khoá X" },
      integrations: {},
      async generate({ systemPrompt, prompt }) {
        goi.push({ system: systemPrompt, prompt });
        return "1. Giá biệt thự đảo Hạ Long Xanh\n2. Pháp lý sổ hồng dự án\n3. Tiến độ phân khu\n4. Thừa";
      },
    });
    expect(goi).toHaveLength(1);
    expect(goi[0]!.system).toContain("KHÔNG BỊA SỐ LIỆU");
    expect(goi[0]!.system).toContain("Chỉ trả về NỘI DUNG CỦA Ô");
    const p = goi[0]!.prompt;
    expect(p).toContain("DANH SÁCH");
    expect(p).toContain("siteName: Hạ Long Xanh 360");
    expect(p).not.toContain("bỏ qua vì trùng ô"); // ô đang viết không tự làm bối cảnh cho chính nó
    expect(p).toContain("Nội dung hiện tại của ô (bản nháp):\nGiá biệt thự đảo");
    expect(p).toContain("Gợi ý của người dùng: thêm chủ đề pháp lý");
    expect(p).toContain("kế hoạch từ khoá X");
    expect(p).toContain("Tối đa 3 mục");
    expect(out.noiDung).toBe("Giá biệt thự đảo Hạ Long Xanh\nPháp lý sổ hồng dự án\nTiến độ phân khu");
  });

  it("ô văn bản có gợi ý riêng theo tên ô (audienceBrief) và không có upstream thì prompt vẫn gọn", async () => {
    let prompt = "";
    const out = await vietHoModule.execute({
      input: parseModuleInput(vietHoModule, { ...GOC, truong: "audienceBrief", nhan: "Mô tả doanh nghiệp" }),
      upstream: {},
      integrations: {},
      async generate(r) {
        prompt = r.prompt;
        return '"Môi giới bất động sản tại Hạ Long."';
      },
    });
    expect(prompt).toContain("Cách viết cho ô này: Viết 2–4 câu");
    expect(prompt).toContain("Ô hiện đang trống.");
    expect(prompt).not.toContain("Ngữ cảnh đã có từ các bước trước");
    expect(out.noiDung).toBe("Môi giới bất động sản tại Hạ Long.");
  });

  it("AI trả rỗng → lỗi rõ, không lưu bản trống", async () => {
    await expect(
      vietHoModule.execute({
        input: parseModuleInput(vietHoModule, { ...GOC, truong: "x", nhan: "y" }),
        upstream: {},
        integrations: {},
        async generate() {
          return '""';
        },
      }),
    ).rejects.toThrow(/trống/);
  });
});

describe("khongVietHoDuoc — ô nào KHÔNG được mời AI viết hộ", () => {
  it("địa chỉ web, số, màu hex, và SỰ THẬT của chủ website", async () => {
    const { khongVietHoDuoc } = await import("@/components/ai/ai-viet-ho");
    for (const o of ["websiteUrl", "pageUrl", "soTrangToiDa", "mauThuongHieu", "suThat"]) {
      expect(khongVietHoDuoc(o), o).toBe(true);
    }
    // Máy "viết hộ" sự thật là máy bịa số — đúng thứ cả hệ thống dựng để tránh.
    for (const o of ["audienceBrief", "chuDe", "tone", "primaryKeyword"]) {
      expect(khongVietHoDuoc(o), o).toBe(false);
    }
  });
});
