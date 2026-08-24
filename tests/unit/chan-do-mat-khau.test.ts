import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ghiNhanDung,
  ghiNhanSai,
  kiemTraChan,
  layDiaChiIp,
} from "@/lib/auth/chan-do-mat-khau";

// Mỗi bài dùng một địa chỉ IP riêng: sổ đếm nằm trong bộ nhớ dùng chung cả
// module, nên dùng chung IP là các bài đè lên nhau.
let dem = 0;
const ipMoi = () => `10.0.0.${++dem}`;

describe("chặn dò mật khẩu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cho qua khi chưa sai lần nào", () => {
    expect(kiemTraChan(ipMoi()).biChan).toBe(false);
  });

  it("cho sai 7 lần, chặn ở lần thứ 8", () => {
    const ip = ipMoi();
    for (let i = 0; i < 7; i++) {
      ghiNhanSai(ip);
      expect(kiemTraChan(ip).biChan).toBe(false);
    }
    ghiNhanSai(ip);
    expect(kiemTraChan(ip).biChan).toBe(true);
  });

  it("tự mở lại sau 15 phút", () => {
    const ip = ipMoi();
    for (let i = 0; i < 8; i++) ghiNhanSai(ip);
    expect(kiemTraChan(ip).biChan).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    expect(kiemTraChan(ip).biChan).toBe(false);
  });

  it("KHÔNG chặn địa chỉ khác — đây là điều quan trọng nhất", () => {
    // Nếu đếm theo email thay vì theo IP, kẻ tấn công chỉ cần gửi email của
    // chủ tài khoản liên tục là khoá được chính chủ ra ngoài.
    const keTanCong = ipMoi();
    const nguoiThat = ipMoi();
    for (let i = 0; i < 20; i++) ghiNhanSai(keTanCong);

    expect(kiemTraChan(keTanCong).biChan).toBe(true);
    expect(kiemTraChan(nguoiThat).biChan).toBe(false);
  });

  it("quên các lần sai cũ hơn cửa sổ đếm", () => {
    const ip = ipMoi();
    for (let i = 0; i < 7; i++) ghiNhanSai(ip);

    // Gõ sai vài lần hôm qua không được cộng dồn vào hôm nay.
    vi.advanceTimersByTime(16 * 60 * 1000);
    ghiNhanSai(ip);
    expect(kiemTraChan(ip).biChan).toBe(false);
  });

  it("đăng nhập đúng thì xoá sổ đếm", () => {
    const ip = ipMoi();
    for (let i = 0; i < 7; i++) ghiNhanSai(ip);
    ghiNhanDung(ip);
    for (let i = 0; i < 7; i++) ghiNhanSai(ip);
    expect(kiemTraChan(ip).biChan).toBe(false);
  });

  it("nói còn phải chờ bao lâu", () => {
    const ip = ipMoi();
    for (let i = 0; i < 8; i++) ghiNhanSai(ip);
    const kq = kiemTraChan(ip);
    expect(kq.conLaiGiay).toBeGreaterThan(14 * 60);
    expect(kq.conLaiGiay).toBeLessThanOrEqual(15 * 60);
  });
});

describe("lấy địa chỉ IP", () => {
  it("lấy phần tử ĐẦU của x-forwarded-for", () => {
    // Danh sách là "khách, proxy1, proxy2" — lấy nhầm phần tử cuối là đếm theo
    // địa chỉ của chính lớp chuyển tiếp, tức là chặn nhầm toàn bộ người dùng.
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" });
    expect(layDiaChiIp(h)).toBe("1.2.3.4");
  });

  it("rơi về x-real-ip khi không có x-forwarded-for", () => {
    expect(layDiaChiIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
  });

  it("không có gì thì trả về chuỗi cố định, không ném lỗi", () => {
    expect(layDiaChiIp(new Headers())).toBe("khong-ro");
  });
});
