import { describe, expect, it } from "vitest";
import { ConfigurationError } from "@/domain/shared/app-error";
import {
  getOAuthProviderConfiguration,
  getOAuthProviderStatuses,
  quyenTuDongHoaConThieu,
} from "@/infrastructure/config/oauth-environment";

describe("OAuth environment", () => {
  it("treats blank and documented placeholder credentials as unconfigured", () => {
    const statuses = getOAuthProviderStatuses({
      GOOGLE_OAUTH_CLIENT_ID: "<GOOGLE_WEB_CLIENT_ID>",
      GOOGLE_OAUTH_CLIENT_SECRET: "<GOOGLE_WEB_CLIENT_SECRET>",
      MAKE_OAUTH_CLIENT_ID: "",
      MAKE_OAUTH_CLIENT_SECRET: "",
      MAKE_OAUTH_SCOPES: "<MAKE_APPROVED_SCOPES_SPACE_SEPARATED>",
    });

    expect(statuses).toEqual([
      { id: "google", configured: false, automationScopesConfigured: true },
      { id: "make", configured: false, automationScopesConfigured: false },
    ]);
  });

  it("uses exact callback and incremental Google automation scopes", () => {
    const configuration = getOAuthProviderConfiguration("google", "connect", {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      GOOGLE_OAUTH_CLIENT_ID: "google-client",
      GOOGLE_OAUTH_CLIENT_SECRET: "google-secret",
    });

    expect(configuration.redirectUri).toBe(
      "http://127.0.0.1:3000/api/v1/oauth/google/callback",
    );
    expect(configuration.scopes).toContain(
      "https://www.googleapis.com/auth/drive.readonly",
    );
    expect(configuration.scopes).toContain(
      "https://www.googleapis.com/auth/spreadsheets",
    );
    // `drive.file` chỉ thấy tệp do app tạo — ảnh chủ dự án tải lên bằng app
    // Drive sẽ vô hình. Ca này giữ để không ai "thu hẹp quyền cho an toàn" rồi
    // làm tính năng ảnh Drive câm lặng.
    expect(configuration.scopes).not.toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
  });

  it("fails closed when Make automation scopes were not verified", () => {
    expect(() =>
      getOAuthProviderConfiguration("make", "connect", {
        MAKE_OAUTH_CLIENT_ID: "make-client",
        MAKE_OAUTH_CLIENT_SECRET: "make-secret",
      }),
    ).toThrow(ConfigurationError);
  });
});

describe("quyenTuDongHoaConThieu", () => {
  const DU = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ];

  it("không báo thiếu khi đã cấp đủ", () => {
    expect(quyenTuDongHoaConThieu("google", DU)).toEqual([]);
  });

  it("GỌI TÊN quyền còn thiếu chứ không đếm số", () => {
    // Đây là ca dựng lại đúng lỗi thật gặp ngày 09/09: token cũ có 5 quyền,
    // giao diện ghi "Đã kết nối · 5 scope đã cấp" MÀU XANH, còn mọi lệnh gọi
    // Search Console trả 403. Đếm scope không phát hiện được — đếm chỉ cho
    // biết nhiều hay ít, không cho biết thiếu cái nào.
    const nam = DU.filter((q) => !q.endsWith("webmasters.readonly"));
    expect(nam).toHaveLength(5);
    expect(quyenTuDongHoaConThieu("google", nam)).toEqual(["Search Console"]);
  });

  it("báo đủ cả ba khi chưa cấp gì", () => {
    expect(quyenTuDongHoaConThieu("google", [])).toEqual([
      "Google Drive",
      "Google Sheets",
      "Search Console",
    ]);
  });

  it("make chưa khai quyền bắt buộc nào nên không bao giờ thiếu", () => {
    expect(quyenTuDongHoaConThieu("make", [])).toEqual([]);
  });
});
