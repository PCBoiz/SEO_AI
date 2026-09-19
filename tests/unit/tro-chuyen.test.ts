import { describe, expect, it } from "vitest";
import {
  GIOI_HAN_TRO_CHUYEN,
  catLichSu,
  dungLoiDanTroLy,
  kiemTinNhan,
  tieuDeTuTinDau,
  type TinNhan,
} from "@/domain/tro-chuyen/tro-chuyen";

const nd = (noiDung: string): TinNhan => ({ vai: "nguoi-dung", noiDung });
const tl = (noiDung: string): TinNhan => ({ vai: "tro-ly", noiDung });

describe("kiemTinNhan", () => {
  it("trống, toàn khoảng trắng, hay không phải chữ thì từ chối kèm lý do", () => {
    expect(kiemTinNhan("")).toMatchObject({ ok: false });
    expect(kiemTinNhan("   \n ")).toMatchObject({ ok: false });
    expect(kiemTinNhan(undefined)).toMatchObject({ ok: false });
  });

  it("quá 4.000 ký tự thì từ chối, nói rõ trần; trong trần thì cắt khoảng trắng hai đầu", () => {
    const dai = kiemTinNhan("a".repeat(GIOI_HAN_TRO_CHUYEN.kyTuMoiTin + 1));
    expect(dai.ok).toBe(false);
    expect(dai.ok ? "" : dai.lyDo).toContain("4.000");
    expect(kiemTinNhan("  Làm website 3 trang  ")).toEqual({ ok: true, noiDung: "Làm website 3 trang" });
  });
});

describe("catLichSu", () => {
  it("giữ các tin MỚI NHẤT vừa trần ký tự, đúng thứ tự thời gian", () => {
    const tin = [nd("a".repeat(10)), tl("b".repeat(10)), nd("c".repeat(10)), tl("d".repeat(10)), nd("e".repeat(10))];
    expect(catLichSu(tin, 35).map((t) => t.noiDung[0])).toEqual(["c", "d", "e"]);
  });

  it("sau khi cắt, tin trợ lý đứng đầu bị bỏ — lượt đầu phải là người dùng", () => {
    const tin = [nd("a".repeat(10)), tl("b".repeat(10)), nd("c".repeat(10))];
    expect(catLichSu(tin, 20)).toEqual([nd("c".repeat(10))]);
    expect(catLichSu(tin, 10_000, 2)).toEqual([nd("c".repeat(10))]);
  });

  it("hai tin liền nhau cùng vai (gửi lại sau lượt lỗi) được gộp làm một, không sửa mảng gốc", () => {
    const tin = [nd("x"), nd("y"), tl("z")];
    expect(catLichSu(tin)).toEqual([nd("x\n\ny"), tl("z")]);
    expect(tin[0]).toEqual(nd("x"));
  });

  it("tin mới nhất luôn được giữ, kể cả khi riêng nó vượt trần", () => {
    expect(catLichSu([nd("a".repeat(50))], 10)).toEqual([nd("a".repeat(50))]);
  });
});

describe("tieuDeTuTinDau", () => {
  it("lấy dòng đầu, gọn khoảng trắng; dài thì cắt còn 60 ký tự kèm dấu …", () => {
    expect(tieuDeTuTinDau("  Làm   website\nsàn môi giới")).toBe("Làm website");
    const dai = tieuDeTuTinDau("x".repeat(100));
    expect(dai.length).toBe(GIOI_HAN_TRO_CHUYEN.tieuDeToiDa);
    expect(dai.endsWith("…")).toBe(true);
    expect(tieuDeTuTinDau("   ")).toBe("Cuộc trò chuyện mới");
  });
});

describe("dungLoiDanTroLy", () => {
  it("có ngày hôm nay, luật không bịa số, dạy ra khối lệnh dựng web, và không tự nhận đã làm", () => {
    const loi = dungLoiDanTroLy({ homNay: "15/09/2026" });
    expect(loi).toContain("Hôm nay là 15/09/2026");
    expect(loi).toContain("KHÔNG BỊA SỐ LIỆU");
    expect(loi).toContain("/pipelines?luong=website_draft");
    // Từ 18/09: trợ lý dựng được website qua khối ```antigravity — lời dặn
    // phải có khối mẫu đọc được (JSON hợp lệ, đúng hành động).
    expect(loi).toContain("```antigravity");
    const mau = /```antigravity\n([^\n]+)\n```/.exec(loi)?.[1] ?? "";
    expect(JSON.parse(mau)).toMatchObject({ hanhDong: "dung-website" });
    expect(loi).toContain("KHÔNG nói \"tôi đã dựng xong\"");
    expect(loi).not.toContain("Dự án người dùng đang nói tới");
  });

  it("có dự án thì kèm tên, website, ngôn ngữ, giọng văn; trường trống thì bỏ dòng", () => {
    const loi = dungLoiDanTroLy({
      homNay: "15/09/2026",
      duAn: { ten: "Minh Anh Land (tên giả)", website: "https://minh-anh.example", ngonNgu: null, giongVan: "Điềm đạm" },
    });
    expect(loi).toContain("- Tên: Minh Anh Land (tên giả)");
    expect(loi).toContain("- Website: https://minh-anh.example");
    expect(loi).toContain("- Giọng văn: Điềm đạm");
    expect(loi).not.toContain("Ngôn ngữ nội dung");
  });
});
