import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  DANH_MUC_THANH_PHAN,
  danhMucChoAi,
  laMaThanhPhan,
  thanhPhanChoNganh,
  timThanhPhan,
} from "@/domain/dung-web/danh-muc-thanh-phan";
import { docJson } from "@/domain/dung-web/doc-json";
import { coMauKhoi } from "@/domain/dung-web/khoi/mau-khoi";
import { chuanHoaKienTruc, kiemKienTruc, moTaKienTruc } from "@/domain/dung-web/kien-truc";
import {
  FONT_TIENG_VIET,
  docHeThietKe,
  kiemHeThietKe,
  tuongPhan,
} from "@/domain/dung-web/he-thiet-ke";
import "@/domain/modules/registry";
import { getModuleDefinition, listModuleDefinitions } from "@/domain/modules/module-definition";
import { pipelinePresets, websiteDraftModuleKeys } from "@/domain/modules/registry";
import { danhSachViec } from "@/domain/modules/ngon-ngu-nguoi-dung";

/* ─────────────────────────── Danh mục ─────────────────────────────────── */

describe("danh mục thành phần halongxanh360", () => {
  it("mã duy nhất, chữ thường gạch ngang, mỗi khối có vai trò và mô tả", () => {
    const ma = DANH_MUC_THANH_PHAN.map((t) => t.ma);
    expect(new Set(ma).size).toBe(ma.length);
    for (const t of DANH_MUC_THANH_PHAN) {
      expect(t.ma).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(t.moTa.length).toBeGreaterThan(10);
      if (t.duLieu === "props") expect(t.props, t.ma).toBeTruthy();
    }
  });

  it("tệp gốc tồn tại trong kho website khi kho nằm cạnh (bỏ qua nếu không có)", () => {
    const goc = path.resolve(process.cwd(), "..", "vinhomes_ha_long_xanh", "src", "components");
    if (!existsSync(goc)) return;
    for (const t of DANH_MUC_THANH_PHAN) {
      if (!t.tep) continue; // khối viết riêng cho trình dựng
      expect(existsSync(path.join(goc, t.tep)), `${t.ma} → ${t.tep}`).toBe(true);
    }
  });

  it("ngành chung không kéo theo khối gắn với bất động sản", () => {
    const chung = thanhPhanChoNganh("chung");
    expect(chung.every((t) => t.nganh === "chung")).toBe(true);
    expect(chung.map((t) => t.ma)).not.toContain("gia-thuc-tra");
    expect(thanhPhanChoNganh("bat-dong-san").map((t) => t.ma)).toContain("gia-thuc-tra");
  });

  it("danh mục cho AI: một dòng một mã, không đưa khối kỹ thuật (khung, hiệu ứng)", () => {
    const van = danhMucChoAi("chung");
    expect(van).toContain("- hero-anh [mo-dau]");
    expect(van).not.toContain("- khung ");
    expect(van).not.toContain("- reveal ");
  });

  it("CHỈ mời khối có khuôn dựng — mời rồi bỏ là dựng ra một lời hứa suông", () => {
    for (const nganh of ["chung", "bat-dong-san"] as const) {
      const ma = danhMucChoAi(nganh, coMauKhoi)
        .split("\n")
        .filter(Boolean)
        .map((d) => d.slice(2, d.indexOf(" [")));
      expect(ma.length).toBeGreaterThan(8);
      for (const m of ma) expect(coMauKhoi(m), m).toBe(true);
    }
    // Không lọc thì danh mục rộng hơn — đó là lý do phải lọc.
    expect(danhMucChoAi("bat-dong-san").length).toBeGreaterThan(danhMucChoAi("bat-dong-san", coMauKhoi).length);
  });

  it("tìm theo mã: không phân biệt hoa thường, khoảng trắng", () => {
    expect(timThanhPhan(" Hero-Anh ")?.ma).toBe("hero-anh");
    expect(laMaThanhPhan("khong-co")).toBe(false);
  });
});

/* ─────────────────────────── docJson ──────────────────────────────────── */

describe("docJson", () => {
  it("ưu tiên khối fence, rồi tới { … } đầu–cuối; hỏng thì null", () => {
    expect(docJson('Đây là:\n```json\n{"a":1}\n```\nxong')).toEqual({ a: 1 });
    expect(docJson('Kết quả: {"a":{"b":2}} hết.')).toEqual({ a: { b: 2 } });
    expect(docJson("không có gì")).toBeNull();
    expect(docJson("{hỏng")).toBeNull();
  });
});

/* ─────────────────────────── Kiến trúc ────────────────────────────────── */

function kienTrucMau(sua: (k: Record<string, unknown>) => void = () => {}): string {
  const k: Record<string, unknown> = {
    tenWebsite: "Biệt thự Hạ Long",
    nganh: "chung",
    khoiChung: ["site-header", "site-footer"],
    trang: [
      {
        duong: "/",
        tieuDe: "Trang chủ",
        mucDich: "Cho khách thấy có gì và để lại số.",
        khoi: [
          { ma: "hero-anh", noiDung: "Ảnh vịnh, câu chào." },
          { ma: "danh-sach-san-pham", noiDung: "Ba dòng sản phẩm." },
          { ma: "dang-ky-form", noiDung: "Để lại số." },
        ],
      },
      {
        duong: "/lien-he",
        tieuDe: "Liên hệ",
        mucDich: "Gọi hoặc để lại số.",
        khoi: [
          { ma: "doi-ngu-tu-van", noiDung: "Ai tư vấn." },
          { ma: "dang-ky-form", noiDung: "Biểu mẫu." },
        ],
      },
    ],
    canVietMoi: [],
    duLieuCan: ["số điện thoại"],
  };
  sua(k);
  return "```json\n" + JSON.stringify(k) + "\n```";
}

describe("kiến trúc website — hợp đồng kiểm ở code", () => {
  it("bản hợp lệ: không lỗi, chuẩn hoá không cảnh báo, mô tả có đủ trang", () => {
    const van = kienTrucMau();
    expect(kiemKienTruc(van)).toEqual([]);
    const c = chuanHoaKienTruc(van)!;
    expect(c.canhBao).toEqual([]);
    expect(c.kienTruc.trang).toHaveLength(2);
    const moTa = moTaKienTruc(c.kienTruc);
    expect(moTa).toContain("## / — Trang chủ");
    expect(moTa).toContain("[hero-anh] Mảng mở đầu một tấm ảnh thật");
  });

  it("mã có trong danh mục nhưng CHƯA có khuôn dựng cũng bị loại", () => {
    const van = kienTrucMau((k) => {
      (k.trang as Array<{ khoi: Array<{ ma: string; noiDung: string }> }>)[0]!.khoi.push({
        ma: "so-do-phan-khu",
        noiDung: "Sơ đồ bấm chọn",
      });
    });
    expect(kiemKienTruc(van).some((l) => l.message.includes("so-do-phan-khu"))).toBe(true);
    expect(chuanHoaKienTruc(van)!.kienTruc.trang[0]!.khoi.map((x) => x.ma)).not.toContain("so-do-phan-khu");
  });

  it("mã khối lạ → lỗi nhắc model; sau chuẩn hoá thì chuyển sang cần viết mới", () => {
    const van = kienTrucMau((k) => {
      (k.trang as Array<{ khoi: Array<{ ma: string; noiDung: string }> }>)[0]!.khoi.push({ ma: "bang-gia-vang", noiDung: "Giá vàng hôm nay" });
    });
    const loi = kiemKienTruc(van);
    expect(loi.some((l) => l.message.includes("bang-gia-vang"))).toBe(true);
    const c = chuanHoaKienTruc(van)!;
    expect(c.kienTruc.trang[0]!.khoi.map((x) => x.ma)).not.toContain("bang-gia-vang");
    expect(c.kienTruc.canVietMoi.map((m) => m.ten)).toContain("bang-gia-vang");
    expect(c.canhBao[0]).toContain("cần viết mới");
  });

  it("thiếu trang chủ → lỗi; chuẩn hoá lấy trang đầu làm trang chủ", () => {
    const van = kienTrucMau((k) => {
      (k.trang as Array<{ duong: string }>)[0]!.duong = "/gioi-thieu";
    });
    expect(kiemKienTruc(van).some((l) => l.message.includes("trang chủ"))).toBe(true);
    const c = chuanHoaKienTruc(van)!;
    expect(c.kienTruc.trang[0]!.duong).toBe("/");
  });

  it("đường dẫn trùng / sai dạng / quá 8 trang → lỗi", () => {
    const trung = kienTrucMau((k) => {
      (k.trang as Array<{ duong: string }>)[1]!.duong = "/";
    });
    expect(kiemKienTruc(trung).some((l) => l.message.includes("trùng"))).toBe(true);
    const saiDang = kienTrucMau((k) => {
      (k.trang as Array<{ duong: string }>)[1]!.duong = "/Liên Hệ";
    });
    expect(kiemKienTruc(saiDang).length).toBeGreaterThan(0);
    const nhieu = kienTrucMau((k) => {
      const t = k.trang as Array<Record<string, unknown>>;
      for (let i = 0; i < 8; i++) t.push({ ...t[1]!, duong: `/t${i}` });
    });
    expect(kiemKienTruc(nhieu).some((l) => l.message.includes("8 trang"))).toBe(true);
  });

  it("không phải JSON → một lỗi rõ ràng; chuẩn hoá trả null", () => {
    expect(kiemKienTruc("Tôi nghĩ website nên có ba trang.")[0]!.message).toContain("JSON");
    expect(chuanHoaKienTruc("không")).toBeNull();
  });
});

/* ─────────────────────────── Hệ thiết kế ──────────────────────────────── */

function thietKeMau(sua: (h: Record<string, unknown>) => void = () => {}): string {
  const h: Record<string, unknown> = {
    mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#c9a86a" },
    font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
    khoangCach: "thoang",
    goc: "vuong",
    giong: ["điềm đạm", "rõ ràng"],
    lyDo: "Khách xem trên điện thoại buổi tối, nền tối chữ sáng dễ đọc.",
  };
  sua(h);
  return JSON.stringify(h);
}

describe("hệ thiết kế — màu hex, font có tiếng Việt, tương phản đủ", () => {
  it("bản hợp lệ qua kiểm", () => {
    expect(kiemHeThietKe(thietKeMau())).toEqual([]);
    expect(docHeThietKe(thietKeMau())?.font.than).toBe("Be Vietnam Pro");
  });

  it("font ngoài danh sách → lỗi nêu danh sách", () => {
    const loi = kiemHeThietKe(thietKeMau((h) => ((h.font as Record<string, string>).than = "Comic Sans MS")));
    expect(loi[0]!.message).toContain("tiếng Việt");
    expect(FONT_TIENG_VIET).toContain("Be Vietnam Pro");
  });

  it("chữ xám trên nền xám → lỗi tương phản, có số đo", () => {
    const loi = kiemHeThietKe(thietKeMau((h) => ((h.mau as Record<string, string>).chu = "#5a6a66")));
    expect(loi[0]!.message).toMatch(/tương phản \d+\.\d:1/);
    expect(tuongPhan("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("màu không phải hex 6 số → lỗi", () => {
    const loi = kiemHeThietKe(thietKeMau((h) => ((h.mau as Record<string, string>).nen = "xanh rêu")));
    expect(loi[0]!.message).toContain("hex");
  });
});

/* ─────────────────────────── Ba module ────────────────────────────────── */

const co = {
  projectId: "p1",
  idempotencyKey: "6f1d2c3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f",
  ai: { provider: "deepseek" as const, model: "deepseek-chat" },
};

describe("module #24–26 — chạy với model giả", () => {
  it("đăng ký đủ ba module, đúng số, nhóm Website, có tên chế độ Đơn giản, có preset", () => {
    for (const [ma, so] of [["RIS_WEB_Y_DINH", 24], ["RIS_WEB_KIEN_TRUC", 25], ["RIS_WEB_THIET_KE", 26]] as const) {
      const d = getModuleDefinition(ma);
      expect(d.moduleNumber).toBe(so);
      expect(d.category).toBe("Website");
    }
    expect(listModuleDefinitions().map((m) => m.key)).toContain("RIS_WEB_KIEN_TRUC");
    expect(pipelinePresets.find((p) => p.id === "website_draft")?.moduleKeys).toEqual(websiteDraftModuleKeys);
    const viec = danhSachViec().filter((v) => v.nhom === "Dựng website");
    expect(viec.map((v) => v.maModule).sort()).toEqual([
      "RIS_WEB_KIEN_TRUC",
      "RIS_WEB_THIET_KE",
      "RIS_WEB_VIET_CHU",
      "RIS_WEB_Y_DINH",
    ]);
  });

  it("#24 Ý định: đưa mô tả vào lời nhắc, trả văn bản", async () => {
    const d = getModuleDefinition("RIS_WEB_Y_DINH");
    const input = d.inputSchema.parse({ ...co, audienceBrief: "Tôi bán biệt thự ở Hạ Long, muốn khách để lại số.", siteName: "Hạ Long Xanh 360" });
    let promptNhan = "";
    const out = await d.execute({
      input,
      upstream: {},
      integrations: {},
      generate: async ({ prompt }) => {
        promptNhan = prompt;
        return "## Vấn đề\n- Khách chưa biết giá thật.";
      },
    });
    expect(promptNhan).toContain("biệt thự ở Hạ Long");
    expect(promptNhan).toContain("## Không làm");
    expect((out as { yDinh: string }).yDinh).toContain("Vấn đề");
  });

  it("#25 Kiến trúc: thiếu Ý định thì báo rõ; có upstream thì dùng, mã lạ bị chuyển sang cần viết mới", async () => {
    const d = getModuleDefinition("RIS_WEB_KIEN_TRUC");
    const input = d.inputSchema.parse({ ...co, nganh: "chung", soTrangToiDa: "3" });
    await expect(d.execute({ input, upstream: {}, integrations: {}, generate: async () => "" })).rejects.toThrow(/Ý định/);

    let promptNhan = "";
    const out = (await d.execute({
      input,
      upstream: { RIS_WEB_Y_DINH: "## Vấn đề\n- Khách cần giá." },
      integrations: {},
      generate: async ({ prompt, validate }) => {
        promptNhan = prompt;
        const van = kienTrucMau((k) => {
          (k.trang as Array<{ khoi: Array<{ ma: string; noiDung: string }> }>)[1]!.khoi.push({ ma: "may-tinh-lai", noiDung: "Tính lãi vay" });
        });
        // Engine thật sẽ nhắc lại một lần khi validate có lỗi; ở đây mô phỏng model vẫn trả bản cũ.
        expect(validate?.(van).length).toBeGreaterThan(0);
        return van;
      },
    })) as { moTa: string; json: string; ghiChu: string };
    expect(promptNhan).toContain("Khách cần giá");
    expect(promptNhan).toContain("tối đa 3 trang");
    expect(promptNhan).toContain("- hero-anh [mo-dau]");
    expect(promptNhan).not.toContain("gia-thuc-tra"); // ngành chung
    expect(out.ghiChu).toContain("1 khối cần viết mới");
    expect(out.ghiChu).toContain("⚠️");
    expect(docJson(out.json)).toMatchObject({ tenWebsite: "Biệt thự Hạ Long" });
  });

  it("#25 nói cho model biết dự án có bao nhiêu ảnh thật", async () => {
    const d = getModuleDefinition("RIS_WEB_KIEN_TRUC");
    const input = d.inputSchema.parse({ ...co, nganh: "chung" });
    const upstream = { RIS_WEB_Y_DINH: "## Vấn đề\n- x" };
    const chay = async (drive?: { lietKe: () => Promise<unknown[]>; tai: () => Promise<never> }) => {
      let nhac = "";
      await d.execute({
        input,
        upstream,
        integrations: {},
        drive: drive as never,
        generate: async ({ prompt }) => {
          nhac = prompt;
          return kienTrucMau();
        },
      });
      return nhac;
    };
    expect(await chay()).toContain("CHƯA có tấm ảnh nào");
    const coAnh = await chay({ lietKe: async () => [{}, {}, {}], tai: async () => { throw new Error("x"); } });
    expect(coAnh).toContain("có 3 tấm ảnh thật");
    // Drive lỗi thì coi như không có ảnh, không làm hỏng cả bước.
    const driveHong = await chay({ lietKe: async () => { throw new Error("Drive 500"); }, tai: async () => { throw new Error("x"); } });
    expect(driveHong).toContain("CHƯA có tấm ảnh nào");
  });

  it("#26 Hệ thiết kế: giữ màu thương hiệu dù model đổi; JSON đọc lại được", async () => {
    const d = getModuleDefinition("RIS_WEB_THIET_KE");
    const input = d.inputSchema.parse({ ...co, mauThuongHieu: "#1A6B4A", goiY: "xanh rêu" });
    const out = (await d.execute({
      input,
      upstream: { RIS_WEB_Y_DINH: "## Vấn đề\n- x", RIS_WEB_KIEN_TRUC: "## Kiến trúc\n# Web" },
      integrations: {},
      generate: async ({ prompt }) => {
        expect(prompt).toContain("#1A6B4A");
        expect(prompt).toContain("Fraunces");
        return thietKeMau();
      },
    })) as { moTa: string; json: string };
    const h = docHeThietKe(out.json)!;
    expect(h.mau.nhan).toBe("#1a6b4a");
    expect(out.moTa).toContain("tương phản");
  });

  it("#26: màu thương hiệu sai dạng bị chặn ngay ở schema", () => {
    const d = getModuleDefinition("RIS_WEB_THIET_KE");
    expect(() => d.inputSchema.parse({ ...co, mauThuongHieu: "xanh" })).toThrow();
  });
});
