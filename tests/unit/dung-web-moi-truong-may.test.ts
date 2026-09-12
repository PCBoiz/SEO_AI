import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { taoMoiTruongMay } from "@/infrastructure/dung-web/moi-truong-may";

/**
 * ⚠️ NHỮNG CA Ở ĐÂY KHÔNG CHẠM VÀO `npm install` HAY `next dev`.
 *
 * Hai bước đó mất hàng phút và cần mạng — đưa vào bộ test là biến một lệnh
 * `npm test` chạy 28 giây thành một lệnh không ai chạy nữa. Vòng lặp đầy đủ đã
 * được kiểm bằng `scripts/thu-xem-truoc.ts` (chạy tay, có đo thời gian).
 *
 * Cái đáng test tự động là phần LOGIC — nhất là chốt chặn đường dẫn, vì mã do
 * mô hình sinh ra là dữ liệu KHÔNG TIN ĐƯỢC. Một đường dẫn `../../..` lọt qua
 * là ghi đè tệp thật trên máy người dùng, và đó là loại lỗi không có lần thứ hai
 * để sửa.
 */
describe("MoiTruongMay", () => {
  let goc: string;

  beforeEach(() => {
    goc = mkdtempSync(join(tmpdir(), "thu-moi-truong-"));
  });

  afterEach(() => {
    rmSync(goc, { recursive: true, force: true });
  });

  it("ghi đúng cây tệp vào thư mục của dự án", async () => {
    const mt = taoMoiTruongMay(goc);
    // Không có `node_modules` thì `chuanBi` sẽ chạy npm install — nên ca này
    // tạo sẵn thư mục đó để dừng trước bước cài.
    const noiLam = join(goc, "du-an-1");
    mkdtempSync(join(tmpdir(), "x-"));
    await expectGhiDuoc(mt, noiLam);
  });

  async function expectGhiDuoc(
    mt: ReturnType<typeof taoMoiTruongMay>,
    noiLam: string,
  ) {
    // Tạo `node_modules` giả để `chuanBi` bỏ qua bước cài.
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(noiLam, "node_modules"), { recursive: true });

    await mt.chuanBi("du-an-1", {
      tep: [
        { duongDan: "src/app/page.tsx", noiDung: "export default () => null;" },
        { duongDan: "package.json", noiDung: "{}" },
      ],
    });

    expect(existsSync(join(noiLam, "src/app/page.tsx"))).toBe(true);
    expect(readFileSync(join(noiLam, "package.json"), "utf8")).toBe("{}");
  }

  it("TỪ CHỐI đường dẫn thoát khỏi thư mục làm việc", async () => {
    const mt = taoMoiTruongMay(goc);
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(goc, "du-an-2", "node_modules"), { recursive: true });

    for (const doc of [
      "../thoat.txt",
      "../../thoat.txt",
      "src/../../../thoat.txt",
    ]) {
      await expect(
        mt.chuanBi("du-an-2", { tep: [{ duongDan: doc, noiDung: "x" }] }),
      ).rejects.toThrow(/thoát khỏi thư mục làm việc/);
    }

    // Và không tệp nào bị ghi ra ngoài.
    expect(existsSync(join(goc, "thoat.txt"))).toBe(false);
  });

  it("KHÔNG nhầm dự án có tên là tiền tố của dự án khác", async () => {
    // Ca này bắt một lỗi thật: bản đầu so bằng `dich.startsWith(thuMuc)`, nên
    // thư mục `du-an-2` khớp tiền tố với `du-an-22` và một dự án ghi được đè
    // lên dự án kia. Không lộ ra khi thử tay, vì cần đúng hai tên trong đó tên
    // này là tiền tố của tên kia.
    const mt = taoMoiTruongMay(goc);
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(goc, "du-an-2", "node_modules"), { recursive: true });
    mkdirSync(join(goc, "du-an-22"), { recursive: true });

    await expect(
      mt.chuanBi("du-an-2", {
        tep: [{ duongDan: "../du-an-22/bi-ghi-de.txt", noiDung: "x" }],
      }),
    ).rejects.toThrow(/thoát khỏi thư mục làm việc/);

    expect(existsSync(join(goc, "du-an-22", "bi-ghi-de.txt"))).toBe(false);
  });

  it("từ chối chạy trên Vercel thay vì hỏng giữa chừng", () => {
    const cu = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      expect(() => taoMoiTruongMay(goc)).toThrow(/Vercel/);
    } finally {
      if (cu === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = cu;
    }
  });

  it("thư mục làm việc là ảnh chụp của cây: tệp không còn trong cây thì bị xoá, node_modules và dấu cài đặt giữ nguyên", async () => {
    const mt = taoMoiTruongMay(goc);
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const noiLam = join(goc, "du-an-4");
    mkdirSync(join(noiLam, "node_modules", "goi"), { recursive: true });
    writeFileSync(join(noiLam, "node_modules", "goi", "index.js"), "x");
    await mt.chuanBi("du-an-4", {
      tep: [
        { duongDan: "a.txt", noiDung: "a" },
        { duongDan: "src/khoi/cu.tsx", noiDung: "cũ" },
        { duongDan: "open-next.config.ts", noiDung: "cloudflare" },
      ],
    });
    writeFileSync(join(noiLam, ".antigravity-cai-dat.json"), "{}");
    // Cây mới không còn khối cũ lẫn cấu hình Cloudflare.
    await mt.chuanBi("du-an-4", { tep: [{ duongDan: "a.txt", noiDung: "a2" }, { duongDan: "src/khoi/moi.tsx", noiDung: "mới" }] });
    expect(readFileSync(join(noiLam, "a.txt"), "utf8")).toBe("a2");
    expect(existsSync(join(noiLam, "src", "khoi", "moi.tsx"))).toBe(true);
    expect(existsSync(join(noiLam, "src", "khoi", "cu.tsx"))).toBe(false);
    expect(existsSync(join(noiLam, "open-next.config.ts"))).toBe(false);
    expect(existsSync(join(noiLam, "node_modules", "goi", "index.js"))).toBe(true);
    expect(existsSync(join(noiLam, ".antigravity-cai-dat.json"))).toBe(true);
  });

  it("dọn thư mục dự án khi được yêu cầu", async () => {
    const mt = taoMoiTruongMay(goc);
    const { mkdirSync } = await import("node:fs");
    const noiLam = join(goc, "du-an-3");
    mkdirSync(join(noiLam, "node_modules"), { recursive: true });
    await mt.chuanBi("du-an-3", {
      tep: [{ duongDan: "a.txt", noiDung: "xin chào" }],
    });
    expect(existsSync(join(noiLam, "a.txt"))).toBe(true);

    await mt.don("du-an-3");
    expect(existsSync(noiLam)).toBe(false);
  });
});
