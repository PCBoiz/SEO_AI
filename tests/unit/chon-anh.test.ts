import { describe, expect, it, vi } from "vitest";
import type { AnhTrongDrive, DriveChoModule } from "@/domain/modules/module-definition";
import { chonAnhModule, docDongAnh, docLuaChon, ghiDongAnh, locUngVien } from "@/domain/modules/definitions/chon-anh";
import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";
import { parseModuleInput } from "@/domain/modules/module-definition";

const GOC = {
  projectId: "p1",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  ai: { provider: "deepseek" as const, model: "x" },
};

const ANH: AnhTrongDrive[] = [
  { id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "song-le-hoi-ben-du-thuyen.webp", thuMucCon: "", rong: 2560, cao: 1358, moTa: "Phối cảnh đêm lễ hội bên bến du thuyền" },
  { id: "2AbCdEfGhIjKlMnOpQrStUv", ten: "song-le-hoi-ben-du-thuyen.jpg", thuMucCon: "anh-goc-chat-luong-cao", rong: 2560, cao: 1358 },
  { id: "3AbCdEfGhIjKlMnOpQrStUv", ten: "tien-do-0826-len-tang.webp", thuMucCon: "", rong: 1568, cao: 962, moTa: "Ba khối công trình đang lên tầng, tháng 08/2026" },
  { id: "4AbCdEfGhIjKlMnOpQrStUv", ten: "tmb-tong-tien-ich.webp", thuMucCon: "", rong: 2560, cao: 1920 },
];

function driveGia(loiTai?: string): DriveChoModule & { daTai: string[] } {
  const daTai: string[] = [];
  return {
    daTai,
    async lietKe() {
      return ANH;
    },
    async tai(id) {
      daTai.push(id);
      if (loiTai && id.startsWith("3")) throw new Error(loiTai);
      return { bytes: Buffer.from(`anh-${id}`), mime: "image/webp", ten: ANH.find((a) => a.id === id)!.ten };
    },
  };
}

describe("chọn ảnh — lọc ứng viên và đọc lựa chọn của AI", () => {
  it("cùng tên ở gốc và thư mục ảnh gốc → giữ bản ở gốc", () => {
    const uv = locUngVien(ANH);
    expect(uv.map((a) => a.id)).toEqual(["1AbCdEfGhIjKlMnOpQrStUv", "3AbCdEfGhIjKlMnOpQrStUv", "4AbCdEfGhIjKlMnOpQrStUv"]);
  });

  it("đọc JSON bao dung: bỏ ```; số ngoài 1..n, trùng, không nguyên → bỏ; tối đa 2", () => {
    expect(docLuaChon('```json\n{"chon":[{"so":2,"alt":"a"},{"so":2},{"so":9},{"so":1.5},{"so":1}]}\n```', 3)).toEqual([
      { so: 2, alt: "a" },
      { so: 1, alt: undefined },
    ]);
    expect(docLuaChon("Tôi chọn ảnh 1 và 2", 3)).toEqual([]);
    expect(docLuaChon('{"chon":[3,1,2]}', 3)).toEqual([{ so: 3 }, { so: 1 }]);
  });

  it("ghi/đọc dòng `id | tên | alt` là nghịch đảo của nhau; dấu | trong alt không phá cấu trúc", () => {
    const d = ghiDongAnh([{ id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "a.webp", alt: "x | y" }]);
    expect(docDongAnh(d)).toEqual([{ id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "a.webp", alt: "x y" }]);
    expect(docDongAnh("rác\nkhong-phai-id | a | b")).toEqual([]);
  });
});

describe("chọn ảnh — module", () => {
  it("không nối Drive → danh sách rỗng, không gọi AI", async () => {
    const generate = vi.fn();
    const out = await chonAnhModule.execute({
      input: parseModuleInput(chonAnhModule, { ...GOC, primaryKeyword: "tiến độ tháng 8" }),
      upstream: {},
      integrations: {},
      generate,
    });
    expect(out.danhSach).toBe("");
    expect(out.ghiChu).toContain("chưa nối thư mục");
    expect(generate).not.toHaveBeenCalled();
  });

  it("AI chọn từ danh sách đánh số; alt ưu tiên mô tả CSV; bản trùng ở thư mục gốc bị loại khỏi danh sách", async () => {
    let prompt = "";
    const out = await chonAnhModule.execute({
      input: parseModuleInput(chonAnhModule, { ...GOC, primaryKeyword: "tiến độ xây dựng tháng 8" }),
      upstream: { RIS_CONTENT_HEADLINE: "1. Tiến độ Vinhomes Hạ Long Xanh tháng 8/2026\n2. Khác" },
      integrations: {},
      drive: driveGia(),
      async generate(r) {
        prompt = r.prompt;
        return '{"chon":[{"so":2,"alt":"AI bịa thêm chi tiết"},{"so":1,"alt":"Lễ hội"}]}';
      },
    });
    expect(prompt).toContain("Tiêu đề bài: Tiến độ Vinhomes Hạ Long Xanh tháng 8/2026");
    expect(prompt).toContain("#2 | tien do 0826 len tang | mô tả: Ba khối công trình đang lên tầng, tháng 08/2026");
    expect(prompt).not.toContain("anh-goc-chat-luong-cao"); // bản trùng đã bị lọc
    const anh = docDongAnh(out.danhSach);
    expect(anh.map((a) => a.ten)).toEqual(["tien-do-0826-len-tang.webp", "song-le-hoi-ben-du-thuyen.webp"]);
    // Alt lấy từ CSV (người viết), không phải câu AI thêm.
    expect(anh[0]!.alt).toBe("Ba khối công trình đang lên tầng, tháng 08/2026");
    expect(out.ghiChu).toContain("Chọn 2/3 ảnh");
  });

  it("AI trả rỗng hoặc rác → không ảnh, ghi chú rõ", async () => {
    const out = await chonAnhModule.execute({
      input: parseModuleInput(chonAnhModule, { ...GOC, primaryKeyword: "pháp lý" }),
      upstream: {},
      integrations: {},
      drive: driveGia(),
      async generate() {
        return "không có ảnh nào hợp";
      },
    });
    expect(out.danhSach).toBe("");
    expect(out.ghiChu).toContain("không tấm nào hợp");
  });
});

describe("bước đăng — gửi ảnh kèm", () => {
  function upstreamCoBai(danhSach: string): Record<string, string> {
    return {
      RIS_CONTENT_HEADLINE: "Tiến độ tháng 8",
      RIS_CONTENT_INTRO: "Mở đầu.",
      RIS_CONTENT_SECTIONS: "## Phần\nNội dung.",
      RIS_CHON_ANH: `## Ảnh đã chọn\n${danhSach}\n\n## Ghi chú\nChọn 2/3 ảnh`,
    };
  }

  async function chay(drive: DriveChoModule | undefined, danhSach: string) {
    const goi: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      goi.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return new Response(JSON.stringify({ trangThai: "cho", thongBao: "ok", luuO: "db", soAnh: 2 }), { status: 201 });
    });
    try {
      const out = await vinhomesPublishModule.execute({
        input: parseModuleInput(vinhomesPublishModule, { ...GOC, chuyenMuc: "Tiến độ" }),
        upstream: upstreamCoBai(danhSach),
        integrations: { custom_site: { config: { siteUrl: "https://x.vn" }, secret: "k" } },
        drive,
        async generate() {
          throw new Error("không gọi AI");
        },
      });
      return { out, goi };
    } finally {
      vi.unstubAllGlobals();
    }
  }

  it("có Drive: tải đúng các id, gửi base64 + alt, tấm đầu là bìa", async () => {
    const drive = driveGia();
    const { out, goi } = await chay(
      drive,
      ghiDongAnh([
        { id: "3AbCdEfGhIjKlMnOpQrStUv", ten: "tien-do-0826-len-tang.webp", alt: "Lên tầng" },
        { id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "song-le-hoi-ben-du-thuyen.webp", alt: "Lễ hội" },
      ]),
    );
    expect(drive.daTai).toEqual(["3AbCdEfGhIjKlMnOpQrStUv", "1AbCdEfGhIjKlMnOpQrStUv"]);
    const anh = goi[0]!.body.anh as Array<{ mime: string; base64: string; alt: string }>;
    expect(anh).toHaveLength(2);
    expect(anh[0]).toMatchObject({ mime: "image/webp", alt: "Lên tầng" });
    expect(Buffer.from(anh[0]!.base64, "base64").toString()).toBe("anh-3AbCdEfGhIjKlMnOpQrStUv");
    expect(out.result).toContain("Ảnh kèm: 2 (tien-do-0826-len-tang.webp, song-le-hoi-ben-du-thuyen.webp)");
  });

  it("một tấm tải hỏng → bỏ tấm đó, bài vẫn đăng với tấm còn lại, ghi chú lý do", async () => {
    const { out, goi } = await chay(
      driveGia("Google trả 403"),
      ghiDongAnh([
        { id: "3AbCdEfGhIjKlMnOpQrStUv", ten: "tien-do.webp", alt: "a" },
        { id: "1AbCdEfGhIjKlMnOpQrStUv", ten: "le-hoi.webp", alt: "b" },
      ]),
    );
    expect((goi[0]!.body.anh as unknown[]).length).toBe(1);
    expect(out.result).toContain("⚠️ Bỏ tien-do.webp: Google trả 403");
  });

  it("không có Drive / không có danh sách → không có trường `anh`, kết quả nói rõ", async () => {
    const { out, goi } = await chay(undefined, "");
    expect(goi[0]!.body).not.toHaveProperty("anh");
    expect(out.result).toContain("Ảnh kèm: không");
  });
});
