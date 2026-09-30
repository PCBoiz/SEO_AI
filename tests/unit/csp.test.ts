import { describe, expect, it } from "vitest";
import { dungCsp, gocSentry } from "@/domain/bao-mat/csp";

const NONCE = "abc123==";

describe("dungCsp — chính sách cho bản chạy thật", () => {
  const csp = dungCsp({ nonce: NONCE, laDev: false });

  it("script chỉ chạy khi mang nonce; không nới `unsafe-eval` ở bản thật", () => {
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`);
    expect(csp).not.toContain("unsafe-eval");
  });

  it("style cho phép nội tuyến và KHÔNG kèm nonce", () => {
    // Hễ style-src có nonce thì trình duyệt bỏ qua 'unsafe-inline' — đặt cả
    // hai là tự vô hiệu hoá thứ vừa cho phép, và 53 chỗ `style={{…}}` vỡ.
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/style-src[^;]*nonce/);
  });

  it("khoá các đường tấn công kinh điển", () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("không mở gốc ngoài nào khi chưa đặt Sentry", () => {
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/connect-src[^;]*https:\/\//);
  });
});

describe("dungCsp — chế độ nhà phát triển", () => {
  const csp = dungCsp({ nonce: NONCE, laDev: true });

  it("nới đúng hai thứ HMR cần, không hơn", () => {
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toMatch(/connect-src 'self' ws: wss:/);
    // `upgrade-insecure-requests` ở máy sẽ đổi http://localhost thành https://
    // và làm hỏng hết.
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("gocSentry — chỉ mở đúng gốc suy từ DSN", () => {
  it("lấy gốc từ DSN thật", () => {
    expect(gocSentry("https://abc123@o12345.ingest.sentry.io/6789")).toBe("https://o12345.ingest.sentry.io");
  });

  it("không đặt / rỗng / hỏng → không mở gốc nào", () => {
    expect(gocSentry(undefined)).toBeNull();
    expect(gocSentry("   ")).toBeNull();
    expect(gocSentry("khong-phai-dia-chi")).toBeNull();
  });

  it("có DSN thì connect-src có đúng gốc ấy, không có đường dẫn kèm theo", () => {
    const csp = dungCsp({ nonce: NONCE, laDev: false, sentryDsn: "https://k@o1.ingest.sentry.io/42" });
    expect(csp).toContain("connect-src 'self' https://o1.ingest.sentry.io");
    expect(csp).not.toContain("/42");
  });
});
