import { describe, expect, it } from "vitest";
import {
  TIEU_DE_COT,
  dongChoBang,
  khachLienHeSchema,
  thoiDiemVN,
} from "@/domain/lead/khach-lien-he";

/**
 * Thân yêu cầu mà `dang-ky-action.ts` bên kho halongxanh360 gửi, chép nguyên
 * hình dạng (11/09). Hai kho không dùng chung mã, nên đây là chỗ DUY NHẤT hợp
 * đồng giữa chúng được kiểm bằng máy. Bên kia đổi trường thì sửa ở đây theo.
 */
const THAN_WEBSITE = {
  dienThoai: "0941328658",
  uuTien: "Giá và chính sách",
  hoTen: "Nguyễn Văn A",
  quanTam: "Liền kề",
  ghiChu: "Gọi sau 18h",
  thoiDiem: "2026-09-11T14:05:00.000Z",
  nguon: "halongxanh360.vn",
};

describe("khachLienHeSchema — hợp đồng với website", () => {
  it("nhận đúng thân mà website đang gửi", () => {
    expect(khachLienHeSchema.safeParse(THAN_WEBSITE).success).toBe(true);
  });

  it("BỎ QUA trường lạ thay vì từ chối — website thêm trường không được làm mất khách", () => {
    // Nếu cổng này strict thì ngày website thêm `utm_source`, MỌI lượt khách
    // trả 400 và số điện thoại rơi mất.
    const r = khachLienHeSchema.safeParse({ ...THAN_WEBSITE, utmSource: "facebook", trang: "/gia" });
    expect(r.success).toBe(true);
    expect(r.success && "utmSource" in r.data).toBe(false);
  });

  it("chỉ số điện thoại là bắt buộc — họ tên tuỳ chọn như form website", () => {
    expect(khachLienHeSchema.safeParse({ dienThoai: "0941328658" }).success).toBe(true);
    expect(khachLienHeSchema.safeParse({ hoTen: "A" }).success).toBe(false);
  });
});

describe("dongChoBang", () => {
  it("đúng thứ tự cột tiêu đề", () => {
    const dong = dongChoBang(khachLienHeSchema.parse(THAN_WEBSITE));
    expect(dong).toHaveLength(TIEU_DE_COT.length);
    expect(dong[1]).toBe("0941328658");
    expect(dong[3]).toBe("Nguyễn Văn A");
    expect(dong[6]).toBe("halongxanh360.vn");
  });

  it("giữ số 0 đầu của số điện thoại", () => {
    // Bảng ghi bằng RAW. Đổi sang USER_ENTERED là Google hiểu "0941…" thành số
    // và cắt số 0 — ca này nhắc rằng chuỗi phải đi nguyên.
    expect(dongChoBang(khachLienHeSchema.parse(THAN_WEBSITE))[1].startsWith("0")).toBe(true);
  });
});

describe("thoiDiemVN", () => {
  it("đổi ISO giờ UTC sang giờ Việt Nam — lệch bảy tiếng là gọi nhầm buổi", () => {
    expect(thoiDiemVN("2026-09-11T14:05:00.000Z")).toBe("2026-09-11 21:05");
  });

  it("đúng ở ranh giới nửa đêm — không ra '24:00'", () => {
    expect(thoiDiemVN("2026-09-11T17:00:00.000Z")).toBe("2026-09-12 00:00");
  });

  it("thiếu hoặc hỏng thì dùng thời điểm hiện tại, không ghi chữ rác vào bảng", () => {
    const bayGio = new Date("2026-09-11T02:00:00.000Z");
    expect(thoiDiemVN("", bayGio)).toBe("2026-09-11 09:00");
    expect(thoiDiemVN("khong-phai-ngay", bayGio)).toBe("2026-09-11 09:00");
  });
});
