import { describe, expect, it } from "vitest";
import { suyBoKhoi, tenBoKhoi } from "@/domain/dung-web/bo-khoi";

describe("suy bộ khối cho bước Kiến trúc", () => {
  it("ngành nghề hoặc mô tả có dấu hiệu bất động sản → bộ bất động sản", () => {
    expect(suyBoKhoi("Môi giới bất động sản", "")).toBe("bat-dong-san");
    expect(suyBoKhoi(null, "Sàn môi giới ở Hạ Long, chuyên căn hộ và đất nền quanh Vinhomes Global Gate.")).toBe("bat-dong-san");
    expect(suyBoKhoi("Kinh doanh", "Bán biệt thự nghỉ dưỡng")).toBe("bat-dong-san");
    expect(suyBoKhoi(undefined, "moi gioi nha dat quang ninh")).toBe("bat-dong-san");
  });

  it("không có dấu hiệu → ngành chung; chữ trống không đổi kết quả", () => {
    expect(suyBoKhoi("Nha khoa", "Phòng khám mở tới 22h")).toBe("chung");
    expect(suyBoKhoi("", "", null, undefined)).toBe("chung");
    // "môi giới" một mình (bảo hiểm, việc làm…) không đủ.
    expect(suyBoKhoi("Môi giới bảo hiểm", "")).toBe("chung");
  });

  it("tên bộ khối nói rõ mở thêm gì", () => {
    expect(tenBoKhoi("bat-dong-san")).toContain("bảng hàng");
    expect(tenBoKhoi("chung")).toBe("Ngành chung");
  });
});
