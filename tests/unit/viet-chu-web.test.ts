import { describe, expect, it } from "vitest";
import "@/domain/modules/registry";
import { getModuleDefinition } from "@/domain/modules/module-definition";
import { kienTrucSchema, type KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema } from "@/domain/dung-web/he-thiet-ke";
import { docChuTrang, khoiCanChu, kiemChuTrang, moTaTruongChoAi } from "@/domain/dung-web/noi-dung-khoi";
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { docJson } from "@/domain/dung-web/doc-json";

const KIEN_TRUC: KienTrucWeb = kienTrucSchema.parse({
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Khách gọi ngay trong đêm.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu lớn: khám trong ngày." },
        { ma: "lien-he-noi", noiDung: "Nút gọi nổi." },
        { ma: "cau-hoi-thuong-gap", noiDung: "Hỏi đáp hay gặp." },
      ],
    },
    {
      duong: "/bang-gia",
      tieuDe: "Bảng giá",
      mucDich: "Xem giá thật trước khi tới.",
      khoi: [
        { ma: "gia-thuc-tra", noiDung: "Bảng giá đầy đủ." },
        { ma: "khoi-chot", noiDung: "Chốt: gọi để tư vấn." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: [],
});

const trangChu = KIEN_TRUC.trang[0]!;

describe("chữ cho từng khối — đọc và chuẩn hoá", () => {
  it("chỉ hỏi chữ cho khối THẬT SỰ có ô nhập", () => {
    // `lien-he-noi` chỉ là hai cái nút — không có gì để viết.
    expect(khoiCanChu(trangChu)).toEqual([0, 2]);
    const spec = moTaTruongChoAi(trangChu);
    expect(spec).toContain('"0"  [hero-anh]');
    expect(spec).toContain('"2"  [cau-hoi-thuong-gap]');
    expect(spec).not.toContain("lien-he-noi");
    expect(spec).toContain("ý đồ: Câu lớn: khám trong ngày.");
  });

  it("đọc JSON: cắt độ dài, gộp khoảng trắng, bỏ ô lạ", () => {
    const kq = docChuTrang(
      JSON.stringify({
        "0": { tieuDe: "  Khám\n  trong ngày  ", dan: "x".repeat(900), nut: "Đặt lịch", oLa: "bỏ đi" },
        "2": { muc: [{ tieuDe: "Đau không?", than: "Có tê." }] },
        "9": { tieuDe: "khối không tồn tại" },
      }),
      trangChu,
    )!;
    expect(kq.noiDung["0"]!.tieuDe).toBe("Khám trong ngày");
    expect((kq.noiDung["0"]!.dan as string).length).toBe(600);
    expect(kq.noiDung["0"]!.oLa).toBeUndefined();
    expect(kq.noiDung["9"]).toBeUndefined();
    expect(kq.thieu).toEqual([]);
  });

  it("mục viết kiểu “Tiêu đề — thân” hay {tieuDe,than} đều nhận", () => {
    const kq = docChuTrang(
      JSON.stringify({ "0": { tieuDe: "A" }, "2": { muc: ["Có đau không? — Có tê tại chỗ.", { ten: "Bảo hiểm?", moTa: "Tuỳ gói." }] } }),
      trangChu,
    )!;
    expect(kq.noiDung["2"]!.muc).toEqual([
      { tieuDe: "Có đau không?", than: "Có tê tại chỗ." },
      { tieuDe: "Bảo hiểm?", than: "Tuỳ gói." },
    ]);
  });

  it("thiếu khối thì báo để nhắc model, không ném lỗi", () => {
    const kq = docChuTrang(JSON.stringify({ "0": { tieuDe: "A" } }), trangChu)!;
    expect(kq.thieu).toEqual([2]);
    const loi = kiemChuTrang(trangChu)(JSON.stringify({ "0": { tieuDe: "A" } }));
    expect(loi[0]!.message).toContain('"2" (cau-hoi-thuong-gap)');
    expect(kiemChuTrang(trangChu)(JSON.stringify({ "0": { tieuDe: "A" }, "2": { muc: ["Q — A"] } }))).toEqual([]);
    expect(kiemChuTrang(trangChu)("không phải json")[0]!.message).toContain("JSON");
  });
});

const co = {
  projectId: "p1",
  idempotencyKey: "6f1d2c3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
  ai: { provider: "deepseek" as const, model: "deepseek-chat" },
};

describe("module #27 — viết chữ cho website", () => {
  it("thiếu kiến trúc thì nói rõ phải chạy bước nào", async () => {
    const d = getModuleDefinition("RIS_WEB_VIET_CHU");
    const input = d.inputSchema.parse({ ...co });
    await expect(d.execute({ input, upstream: {}, integrations: {}, generate: async () => "" })).rejects.toThrow(/Kiến trúc/);
  });

  it("mỗi trang một lượt gọi; sự thật vào lời nhắc; JSON ra khoá theo trang#khối", async () => {
    const d = getModuleDefinition("RIS_WEB_VIET_CHU");
    const input = d.inputSchema.parse({
      ...co,
      suThat: "Điện thoại 0912 345 678. Trám răng 350.000đ.",
      tone: "Điềm đạm",
    });
    const loiNhac: string[] = [];
    const out = (await d.execute({
      input,
      upstream: { RIS_WEB_KIEN_TRUC: "## JSON kiến trúc\n```json\n" + JSON.stringify(KIEN_TRUC) + "\n```" },
      integrations: {},
      generate: async ({ prompt }) => {
        loiNhac.push(prompt);
        return prompt.includes("/bang-gia")
          ? JSON.stringify({ "0": { dan: "Giá đã gồm thuốc tê.", muc: ["Trám răng — 350.000đ"] }, "1": { tieuDe: "Gọi trước khi tới" } })
          : JSON.stringify({ "0": { tieuDe: "Khám trong ngày", dan: "Mở tới 22h." }, "2": { muc: ["Đau không? — Có tê."] } });
      },
    })) as { chu: string; json: string; ghiChu: string };

    expect(loiNhac).toHaveLength(2);
    expect(loiNhac[0]).toContain("0912 345 678");
    expect(loiNhac[0]).toContain("CHỈ được dùng con số");
    expect(loiNhac[0]).toContain('"0"  [hero-anh]');

    const gop = docJson(out.json) as Record<string, unknown>;
    expect(Object.keys(gop).sort()).toEqual(["/#0", "/#2", "/bang-gia#0", "/bang-gia#1"]);
    expect(out.chu).toContain("## / — Trang chủ");
    expect(out.chu).toContain("Khám trong ngày");
    expect(out.ghiChu).toContain("4 khối");
    expect(out.ghiChu).not.toContain("⚠️ Chưa có ô");
  });

  it("không có “sự thật” thì cảnh báo và dặn model đừng bịa số", async () => {
    const d = getModuleDefinition("RIS_WEB_VIET_CHU");
    const input = d.inputSchema.parse({ ...co });
    let loiNhac = "";
    const out = (await d.execute({
      input,
      upstream: { RIS_WEB_KIEN_TRUC: "```json\n" + JSON.stringify(KIEN_TRUC) + "\n```" },
      integrations: {},
      generate: async ({ prompt }) => {
        loiNhac = prompt;
        return JSON.stringify({ "0": { tieuDe: "A" }, "1": { tieuDe: "B" }, "2": { muc: ["Q — A"] } });
      },
    })) as { ghiChu: string };
    expect(loiNhac).toContain("CHƯA cung cấp con số");
    expect(out.ghiChu).toContain("⚠️ Chưa có ô");
  });

  it("chữ của #27 đi thẳng vào mã sinh ra", () => {
    const chu = {
      "/#0": { tieuDe: "Khám trong ngày", dan: "Mở tới 22h.", nut: "Đặt lịch" },
      "/bang-gia#0": { dan: "Giá đã gồm thuốc tê.", muc: [{ tieuDe: "Trám răng", than: "350.000đ" }] },
    };
    const { cay } = dungCayTep(
      KIEN_TRUC,
      heThietKeSchema.parse({
        mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
        font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
        khoangCach: "vua",
        goc: "vuong",
        giong: ["rõ ràng", "điềm đạm"],
        lyDo: "x",
      }),
      { dienThoai: "0912 345 678" },
      chu,
    );
    const theo = new Map(cay.tep.map((t) => [t.duongDan, t.noiDung]));
    expect(theo.get("src/components/khoi/hero-anh.tsx")).toContain('{"Khám trong ngày"}');
    expect(theo.get("src/components/khoi/gia-thuc-tra.tsx")).toContain('{"350.000đ"}');
  });
});
