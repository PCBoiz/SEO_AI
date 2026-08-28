import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import { layCauHinhTrang } from "@/infrastructure/config/vinhomes-site-environment";

// Đích đến của module đăng bài sang trang tự code.
//
// Ba nhánh dưới đây tương ứng ba tình huống thật, và nhánh thứ ba là lý do tệp
// kiểm này tồn tại: cấu hình nửa vời mà lặng lẽ rơi về biến môi trường nghĩa là
// bài của khách này lên trang của khách kia, và job vẫn báo thành công.

const BIEN_MOI_TRUONG = {
  VINHOMES_SITE_URL: "https://cu.example.com",
  VINHOMES_INGEST_TOKEN: "khoa-tu-bien-moi-truong",
};

describe("Cấu hình trang tự code", () => {
  it("dùng kết nối của DỰ ÁN khi đã cấu hình, không dùng biến môi trường", () => {
    const cauHinh = layCauHinhTrang(
      {
        config: { siteUrl: "https://halongxanh360.vn" },
        secret: "khoa-cua-du-an",
      },
      BIEN_MOI_TRUONG,
    );

    expect(cauHinh).toEqual({
      siteUrl: "https://halongxanh360.vn",
      ingestUrl: "https://halongxanh360.vn/api/ingest",
      token: "khoa-cua-du-an",
    });
  });

  it("rơi về biến môi trường khi dự án chưa cấu hình gì", () => {
    const cauHinh = layCauHinhTrang(undefined, BIEN_MOI_TRUONG);

    // Nhánh này giữ cho những luồng đang chạy bằng biến môi trường không gãy
    // giữa chừng lúc đổi sang kết nối theo dự án.
    expect(cauHinh.siteUrl).toBe("https://cu.example.com");
    expect(cauHinh.token).toBe("khoa-tu-bien-moi-truong");
  });

  it("DỪNG HẲN khi dự án mới điền một nửa, thay vì lặng lẽ đăng sang trang khác", () => {
    // Chỉ có địa chỉ, thiếu khoá.
    expect(() =>
      layCauHinhTrang(
        { config: { siteUrl: "https://halongxanh360.vn" }, secret: "" },
        BIEN_MOI_TRUONG,
      ),
    ).toThrow(ConfigurationError);

    // Chỉ có khoá, thiếu địa chỉ.
    expect(() =>
      layCauHinhTrang({ config: {}, secret: "khoa-cua-du-an" }, BIEN_MOI_TRUONG),
    ).toThrow(ConfigurationError);
  });

  it("từ chối địa chỉ không phải HTTPS, vì khoá đi kèm mỗi lần gọi", () => {
    expect(() =>
      layCauHinhTrang(
        { config: { siteUrl: "http://halongxanh360.vn" }, secret: "khoa" },
        BIEN_MOI_TRUONG,
      ),
    ).toThrow(ConfigurationError);
  });

  it("vẫn cho localhost qua HTTP, để chạy thử ở máy", () => {
    const cauHinh = layCauHinhTrang(
      { config: { siteUrl: "http://localhost:3000" }, secret: "khoa" },
      BIEN_MOI_TRUONG,
    );

    expect(cauHinh.ingestUrl).toBe("http://localhost:3000/api/ingest");
  });

  it("cắt đường dẫn thừa ở cuối địa chỉ trang", () => {
    // Người dùng rất dễ dán cả đường dẫn ("…/tin-tuc") hoặc dấu / ở cuối. Không
    // cắt thì cổng nhận bài thành ".../tin-tuc/api/ingest" và trả 404 — một lỗi
    // trông như hỏng hạ tầng trong khi chỉ là thừa vài ký tự.
    const cauHinh = layCauHinhTrang(
      { config: { siteUrl: "https://halongxanh360.vn/tin-tuc/" }, secret: "k" },
      BIEN_MOI_TRUONG,
    );

    expect(cauHinh.ingestUrl).toBe("https://halongxanh360.vn/api/ingest");
  });
});
