import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `layAnhChoWeb` — đoạn nối Drive → ảnh cho website khách.
 *
 * Trước vòng 78 không phép thử nào chạm vào hàm này: đường "ba cỡ ảnh"
 * (`taiNhieuCo`) chỉ chạy được khi có Drive thật. Ở đây giả đúng một thứ là
 * Drive; phần còn lại (ưu tiên ảnh, đặt tên, alt, bộ nhớ đệm, một ảnh hỏng
 * không làm hỏng cả lượt) là mã thật.
 */
const giu = vi.hoisted(() => ({
  drive: undefined as unknown,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/modules/module-engine.server", () => ({
  dungDriveChoModule: async () => giu.drive,
  getModuleJobRepository: () => {
    throw new Error("không dùng trong phép thử này");
  },
}));

import { layAnhChoWeb } from "@/lib/dung-web/tu-job.server";

const goc = (id: string, ten: string, thuMucCon = "") => ({ id, ten, thuMucCon, rong: null, cao: null });
const co = (rong: number) => ({ bytes: Buffer.from(`anh-${rong}`), rong, cao: Math.round((rong * 2) / 3) });

let dem = 0;
/** Mỗi lượt thử một khoá khác nhau — bộ nhớ đệm trong module sống qua các ca. */
const duAn = () => `p${++dem}`;

describe("layAnhChoWeb — ảnh Drive cho website", () => {
  beforeEach(() => {
    giu.drive = undefined;
  });

  it("Drive có taiNhieuCo: tải một lần, bản lớn nhất là ảnh chính, các bản nhỏ hơn vào bienThe (từ lớn tới nhỏ)", async () => {
    const goiTai: string[] = [];
    giu.drive = {
      lietKe: async () => [goc("a1", "Mặt tiền.JPG"), goc("a2", "san_vuon.png", "phu")],
      tai: async () => {
        throw new Error("không được gọi khi đã có taiNhieuCo");
      },
      taiNhieuCo: async (id: string, cac: readonly number[]) => {
        goiTai.push(`${id}:${cac.join(",")}`);
        // Trả lộn xộn để chắc là mã tự xếp.
        return { ten: id, co: [co(800), co(1600), co(1200)] };
      },
    };
    const anh = await layAnhChoWeb("ws", duAn());
    expect(goiTai).toEqual(["a1:1600,1200,800", "a2:1600,1200,800"]);
    expect(anh.map((a) => a.ten)).toEqual(["mat-tien.webp", "san-vuon.webp"]);
    expect(anh[0]!.alt).toBe("Mặt tiền");
    expect(anh[1]!.alt).toBe("san vuon");
    expect(anh[0]!.bytes.toString()).toBe("anh-1600");
    expect(anh[0]!.bienThe!.map((b) => [b.rong, b.bytes.toString()])).toEqual([
      [1200, "anh-1200"],
      [800, "anh-800"],
    ]);
  });

  it("ảnh gốc nhỏ (Drive chỉ trả một cỡ) thì không có bienThe; Drive không có taiNhieuCo thì đi đường cũ", async () => {
    giu.drive = {
      lietKe: async () => [goc("a1", "nho.jpg")],
      tai: async () => {
        throw new Error("x");
      },
      taiNhieuCo: async () => ({ ten: "nho.jpg", co: [co(640)] }),
    };
    const [motCo] = await layAnhChoWeb("ws", duAn());
    expect(motCo!.bytes.toString()).toBe("anh-640");
    expect(motCo!.bienThe).toBeUndefined();

    giu.drive = {
      lietKe: async () => [goc("b1", "cu.jpg")],
      tai: async () => ({ bytes: Buffer.from("cu"), mime: "image/webp", ten: "cu.jpg" }),
    };
    const [duongCu] = await layAnhChoWeb("ws", duAn());
    expect(duongCu!.bytes.toString()).toBe("cu");
    expect(duongCu!.bienThe).toBeUndefined();
  });

  it("một ảnh tải hỏng thì bỏ tấm đó, giữ phần còn lại; ảnh được chọn làm mở đầu đứng đầu", async () => {
    giu.drive = {
      lietKe: async () => [goc("a1", "mot.jpg"), goc("a2", "hai.jpg"), goc("a3", "ba.jpg", "phu")],
      tai: async () => {
        throw new Error("x");
      },
      taiNhieuCo: async (id: string) => {
        if (id === "a2") throw new Error("Drive 500");
        return { ten: id, co: [co(1600), co(800)] };
      },
    };
    const anh = await layAnhChoWeb("ws", duAn(), 8, "a3");
    expect(anh.map((a) => a.ten)).toEqual(["ba.webp", "mot.webp"]);
  });

  it("nhớ kết quả trong ít phút: lượt sau cùng dự án không gọi Drive nữa; chưa nối Drive thì rỗng và không nhớ", async () => {
    let lanLietKe = 0;
    giu.drive = {
      lietKe: async () => {
        lanLietKe++;
        return [goc("a1", "x.jpg")];
      },
      tai: async () => {
        throw new Error("x");
      },
      taiNhieuCo: async () => ({ ten: "x.jpg", co: [co(1600)] }),
    };
    const p = duAn();
    expect((await layAnhChoWeb("ws", p)).length).toBe(1);
    expect((await layAnhChoWeb("ws", p)).length).toBe(1);
    expect(lanLietKe).toBe(1);

    giu.drive = undefined;
    expect(await layAnhChoWeb("ws", duAn())).toEqual([]);
  });
});
