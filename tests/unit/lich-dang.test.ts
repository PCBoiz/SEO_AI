import { describe, expect, it } from "vitest";
import {
  getModuleDefinition,
  parseModuleInput,
  toModuleDefinitionView,
} from "@/domain/modules/module-definition";
import type { ModuleJob } from "@/domain/modules/module-job";
import { articlePipelineModuleKeys } from "@/domain/modules/registry";
import {
  BUOC_LICH_DANG,
  KET_SAU_MS,
  cauHinhLichSchema,
  chonChuDe,
  chuDeDaDung,
  congNgay,
  dungDauVao,
  gioVN,
  giongNhau,
  luotDangDo,
  nenBatDauLuotMoi,
  ngayVN,
  poolCuaLuot,
  tachDanhSachChuDe,
  tinhTienDo,
  type CauHinhLich,
  type LuotLich,
} from "@/domain/lich-dang/lich-dang";

const CAU_HINH: CauHinhLich = {
  bat: true,
  gioChay: 6,
  ai: { provider: "deepseek", model: "deepseek-v4-flash" },
  chuyenMuc: "Thị trường",
  audienceBrief: "Môi giới bất động sản Hạ Long, khách mua để ở và đầu tư.",
  location: "Hạ Long, Quảng Ninh",
  language: "Tiếng Việt",
  tone: "Chuyên nghiệp, rõ ràng",
  chuDe: ["Giá biệt thự đảo Hạ Long Xanh 2026", "Tiến độ phân khu Paradise Bay"],
  dungSearchConsole: true,
};

describe("các bước của một lượt", () => {
  it("= luồng bài viết bỏ #13 (llms.txt/sitemap), cộng chọn ảnh Drive + đăng lên website", () => {
    expect([...BUOC_LICH_DANG]).toEqual([
      ...articlePipelineModuleKeys.filter((k) => k !== "RIS_GEO_FILES"),
      "RIS_CHON_ANH",
      "RIS_VHGG_PUBLISH",
    ]);
  });

  it("bước đăng không đọc đầu ra của #13 — bỏ nó không mất gì", () => {
    expect(getModuleDefinition("RIS_VHGG_PUBLISH").consumes ?? []).not.toContain("RIS_GEO_FILES");
  });

  it("mọi bước dựng từ cấu hình thật đều LỌT QUA schema .strict() của chính module đó", () => {
    const pool = poolCuaLuot(CAU_HINH, { name: "Hạ Long Xanh 360", website: "https://halongxanh360.vn" }, {
      chuDe: CAU_HINH.chuDe[0]!,
      ngay: "2026-09-12",
    });
    for (const key of BUOC_LICH_DANG) {
      const def = getModuleDefinition(key);
      const view = toModuleDefinitionView(def);
      const dauVao = dungDauVao(
        {
          key,
          fieldKeys: view.form.map((f) => f.key),
          asLinesKeys: view.form.filter((f) => f.asLines).map((f) => f.key),
        },
        pool,
        {
          projectId: "p1",
          idempotencyKey: "0f9b5c1e-2d3a-5b4c-8d9e-0a1b2c3d4e5f",
          ai: CAU_HINH.ai,
          upstreamJobIds: ["6f1c2d3e-4a5b-4c6d-8e7f-8091a2b3c4d5"],
        },
      );
      expect(() => parseModuleInput(def, dauVao), key).not.toThrow();
    }
  });

  it("bước đăng nhận đúng chuyên mục và NGÀY CỦA LƯỢT, tiêu đề để trống", () => {
    const view = toModuleDefinitionView(getModuleDefinition("RIS_VHGG_PUBLISH"));
    const dauVao = dungDauVao(
      { key: view.key, fieldKeys: view.form.map((f) => f.key), asLinesKeys: [] },
      poolCuaLuot(CAU_HINH, { name: "x", website: "https://x.vn" }, { chuDe: "abc def", ngay: "2026-09-12" }),
      { projectId: "p1", idempotencyKey: "k", ai: CAU_HINH.ai, upstreamJobIds: [] },
    );
    expect(dauVao).toMatchObject({ chuyenMuc: "Thị trường", ngayDang: "2026-09-12" });
    expect(dauVao).not.toHaveProperty("title");
    expect(dauVao).not.toHaveProperty("upstreamJobIds");
  });
});

describe("giờ Việt Nam", () => {
  it("17:30 UTC ngày 11 = 00:30 ngày 12 ở Việt Nam", () => {
    expect(ngayVN(new Date("2026-09-11T17:30:00Z"))).toBe("2026-09-12");
    expect(gioVN(new Date("2026-09-11T17:30:00Z"))).toBe(0);
    expect(gioVN(new Date("2026-09-12T16:59:00Z"))).toBe(23);
  });
  it("cộng ngày qua tháng", () => {
    expect(congNgay("2026-09-30", 1)).toBe("2026-10-01");
    expect(congNgay("2026-09-01", -2)).toBe("2026-08-30");
  });
});

describe("danh sách chủ đề", () => {
  it("bỏ dòng trống, gộp khoảng trắng, bỏ trùng không phân biệt hoa thường", () => {
    expect(tachDanhSachChuDe("  Giá  biệt thự \n\n giá biệt thự\nTiến độ\r\n")).toEqual([
      "Giá biệt thự",
      "Tiến độ",
    ]);
  });
  it("cấu hình từ chối chủ đề dài quá 160 ký tự (bước On-Page dùng nó làm tên trang)", () => {
    expect(cauHinhLichSchema.safeParse({ ...CAU_HINH, chuDe: ["x".repeat(161)] }).success).toBe(false);
    expect(cauHinhLichSchema.safeParse(CAU_HINH).success).toBe(true);
  });
});

describe("chọn chủ đề", () => {
  const luot = (chuDe: string, ketQua?: LuotLich["ketQua"]): LuotLich => ({
    ngay: "2026-09-10",
    lan: 0,
    chuDe,
    nguon: "danh-sach",
    batDauLuc: "",
    ketQua,
  });

  it("lấy chủ đề đầu tiên chưa đăng", () => {
    const daDung = chuDeDaDung([luot("giá biệt thự đảo hạ long xanh 2026", "da-dang")]);
    expect(chonChuDe(CAU_HINH, daDung, [])).toEqual({
      chuDe: "Tiến độ phân khu Paradise Bay",
      nguon: "danh-sach",
    });
  });

  it("hỏng MỘT lần thì hôm sau thử lại chủ đề đó; hỏng HAI lần thì bỏ qua", () => {
    const c = CAU_HINH.chuDe[0]!;
    expect(chonChuDe(CAU_HINH, chuDeDaDung([luot(c, "dung")]), [])?.chuDe).toBe(c);
    expect(chonChuDe(CAU_HINH, chuDeDaDung([luot(c, "dung"), luot(c, "het-han")]), [])?.chuDe).toBe(
      CAU_HINH.chuDe[1],
    );
  });

  it("hết danh sách: lấy truy vấn Search Console vị trí 11–30, ≥4 chữ, nhiều lượt hiển thị nhất", () => {
    const daDung = CAU_HINH.chuDe;
    const gsc = [
      { truyVan: "vinhomes hạ long", viTri: 15, impressions: 900 }, // < 4 chữ
      { truyVan: "căn hộ hạ long xanh view vịnh", viTri: 5, impressions: 800 }, // đã trang 1
      { truyVan: "mua shophouse hạ long xanh trả góp", viTri: 18, impressions: 120 },
      { truyVan: "pháp lý dự án hạ long xanh sổ hồng", viTri: 24, impressions: 300 },
      { truyVan: "căn hộ hạ long xanh giá rẻ", viTri: 40, impressions: 999 }, // quá xa
    ];
    expect(chonChuDe(CAU_HINH, daDung, gsc)).toEqual({
      chuDe: "pháp lý dự án hạ long xanh sổ hồng",
      nguon: "search-console",
    });
  });

  it("truy vấn gần trùng chủ đề đã đăng bị bỏ — không viết hai bài tranh nhau một truy vấn", () => {
    const daDung = [...CAU_HINH.chuDe, "giá biệt thự hạ long xanh 2026"];
    const gsc = [{ truyVan: "biệt thự hạ long xanh giá 2026", viTri: 14, impressions: 500 }];
    expect(giongNhau("giá biệt thự hạ long xanh 2026", "biệt thự hạ long xanh giá 2026")).toBe(true);
    expect(chonChuDe(CAU_HINH, daDung, gsc)).toBeNull();
  });

  it("tắt Search Console thì hết danh sách là dừng", () => {
    expect(chonChuDe({ ...CAU_HINH, dungSearchConsole: false }, CAU_HINH.chuDe, [
      { truyVan: "pháp lý dự án hạ long xanh sổ hồng", viTri: 24, impressions: 300 },
    ])).toBeNull();
  });
});

describe("tiến độ một lượt", () => {
  const BUOC = ["A", "B", "C"];
  const khoa = (b: number, lan: 0 | 1) => `k-${b}-${lan}`;
  const T0 = new Date("2026-09-12T00:00:00Z");
  const job = (b: number, lan: 0 | 1, status: ModuleJob["status"], p: Partial<ModuleJob> = {}): ModuleJob =>
    ({
      id: `job-${b}-${lan}`,
      idempotencyKey: khoa(b, lan),
      moduleKey: BUOC[b]!,
      status,
      output: status === "succeeded" ? { buoc: b } : null,
      errorMessage: status === "failed" ? `hỏng ${b}` : null,
      updatedAt: T0,
      ...p,
    }) as ModuleJob;

  it("chưa có gì → tạo bước 0 lần 0, không upstream", () => {
    expect(tinhTienDo(BUOC, khoa, [], T0).hanhDong).toEqual({ loai: "tao", buoc: 0, lan: 0, upstreamJobIds: [] });
  });

  it("bước 0 xong → tạo bước 1, mang mã job bước 0", () => {
    expect(tinhTienDo(BUOC, khoa, [job(0, 0, "succeeded")], T0).hanhDong).toEqual({
      loai: "tao",
      buoc: 1,
      lan: 0,
      upstreamJobIds: ["job-0-0"],
    });
  });

  it("bước đang chạy → chờ; kẹt quá 15 phút → đánh dấu kẹt", () => {
    const jobs = [job(0, 0, "succeeded"), job(1, 0, "running")];
    expect(tinhTienDo(BUOC, khoa, jobs, new Date(T0.getTime() + 60_000)).hanhDong).toEqual({
      loai: "cho",
      buoc: 1,
      jobId: "job-1-0",
    });
    expect(tinhTienDo(BUOC, khoa, jobs, new Date(T0.getTime() + KET_SAU_MS + 1)).hanhDong).toEqual({
      loai: "danh-dau-ket",
      buoc: 1,
      jobId: "job-1-0",
    });
  });

  it("hỏng lần 0 → thử lại lần 1; hỏng cả lần 1 → dừng lượt, kèm lý do", () => {
    const hong0 = [job(0, 0, "succeeded"), job(1, 0, "failed")];
    expect(tinhTienDo(BUOC, khoa, hong0, T0).hanhDong).toEqual({
      loai: "tao",
      buoc: 1,
      lan: 1,
      upstreamJobIds: ["job-0-0"],
    });
    const hong1 = [...hong0, job(1, 1, "timed_out", { errorMessage: "hết giờ" })];
    expect(tinhTienDo(BUOC, khoa, hong1, T0).hanhDong).toEqual({ loai: "dung", buoc: 1, loi: "hết giờ" });
  });

  it("lần thử 1 thành công thì bước đó tính là xong, dùng mã job lần 1", () => {
    const jobs = [
      job(0, 0, "failed"),
      job(0, 1, "succeeded"),
      job(1, 0, "succeeded"),
      job(2, 0, "succeeded", { output: { postUrl: "https://x.vn/tin-tuc/a" } }),
    ];
    const { hanhDong, cacBuoc } = tinhTienDo(BUOC, khoa, jobs, T0);
    expect(hanhDong).toEqual({
      loai: "xong",
      jobIds: ["job-0-1", "job-1-0", "job-2-0"],
      dauRaCuoi: { postUrl: "https://x.vn/tin-tuc/a" },
    });
    expect(cacBuoc.map((b) => b.trangThai)).toEqual(["xong", "xong", "xong"]);
  });
});

describe("lượt đang dở", () => {
  it("lấy lượt chưa chốt mới nhất", () => {
    const l = (ngay: string, ketQua?: LuotLich["ketQua"], lan = 0): LuotLich => ({
      ngay,
      lan,
      chuDe: ngay,
      nguon: "danh-sach",
      batDauLuc: "",
      ketQua,
    });
    expect(luotDangDo([l("2026-09-10", "da-dang"), l("2026-09-11"), l("2026-09-09")])?.ngay).toBe("2026-09-11");
    expect(luotDangDo([l("2026-09-10", "da-dang")])).toBeNull();
    expect(luotDangDo([l("2026-09-11", undefined, 0), l("2026-09-11", undefined, 2)])?.lan).toBe(2);
  });

  it("lịch tự chạy: một lượt mỗi ngày, chỉ sau giờ đã đặt (giờ Việt Nam)", () => {
    const l = (ngay: string, ketQua?: LuotLich["ketQua"]): LuotLich => ({
      ngay,
      lan: 0,
      chuDe: ngay,
      nguon: "danh-sach",
      batDauLuc: "",
      ketQua,
    });
    const cauHinh = { bat: true, gioChay: 6 };
    const luc0530 = new Date("2026-09-11T22:30:00Z"); // 05:30 VN ngày 12
    const luc0605 = new Date("2026-09-11T23:05:00Z"); // 06:05 VN ngày 12
    expect(nenBatDauLuotMoi(cauHinh, [], luc0530)).toBe(false);
    expect(nenBatDauLuotMoi(cauHinh, [], luc0605)).toBe(true);
    // Hôm nay đã có lượt — kể cả lượt hỏng — thì không mở lượt nữa.
    expect(nenBatDauLuotMoi(cauHinh, [l("2026-09-12", "dung")], luc0605)).toBe(false);
    expect(nenBatDauLuotMoi(cauHinh, [l("2026-09-11", "da-dang")], luc0605)).toBe(true);
    expect(nenBatDauLuotMoi({ ...cauHinh, bat: false }, [], luc0605)).toBe(false);
  });
});

describe("khoá bước tất định", () => {
  it("là UUID hợp lệ theo z.uuid() — bảng job đòi vậy", async () => {
    const { z } = await import("zod");
    const { khoaBuocLich, uuidTatDinh } = await import("@/domain/lich-dang/khoa-buoc");
    for (const ten of ["a", "lich-dang:p1:2026-09-12#0:buoc0:lan0", "x".repeat(500), ""]) {
      expect(z.uuid().safeParse(uuidTatDinh(ten)).success, ten.slice(0, 20)).toBe(true);
    }
    expect(khoaBuocLich("p1", "2026-09-12", 0, 3, 1)).toBe(khoaBuocLich("p1", "2026-09-12", 0, 3, 1));
    const khac = new Set([
      khoaBuocLich("p1", "2026-09-12", 0, 3, 1),
      khoaBuocLich("p1", "2026-09-12", 0, 3, 0),
      khoaBuocLich("p1", "2026-09-12", 1, 3, 1),
      khoaBuocLich("p1", "2026-09-13", 0, 3, 1),
      khoaBuocLich("p2", "2026-09-12", 0, 3, 1),
    ]);
    expect(khac.size).toBe(5);
  });
});
