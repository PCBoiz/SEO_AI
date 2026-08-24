import { afterEach, describe, expect, it, vi } from "vitest";
import {
  wordpressPublishModule,
  type WordpressPublishInput,
} from "@/domain/modules/definitions/wordpress-publish";

// Module 12 phải tự nhận diện loại site: WordPress tự host / gói Business mở
// /wp-json/ ngay trên tên miền (Basic auth + Application Password), còn site
// WordPress.com Simple thì không (OAuth2 token qua public-api). Ngoài ra tuyệt
// đối không được đi theo redirect — fetch sẽ đổi POST→GET và mất header xác
// thực, khiến job báo thành công trong khi không có bài nào được tạo.

const integrations = {
  wordpress: {
    url: "https://tenmien.com/",
    username: "admin",
    password: "secret-token",
  },
};

const upstream = { RIS_CONTENT_SECTIONS: "## Thân bài\nNội dung bài viết." };

function runModule(overrides: Partial<WordpressPublishInput> = {}) {
  return wordpressPublishModule.execute({
    input: {
      title: "Bài test",
      publishMode: "draft",
      ...overrides,
    } as WordpressPublishInput,
    upstream,
    integrations,
    generate: async () => "",
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Module 12 · đăng WordPress", () => {
  it("dùng Basic auth trên tên miền khi site có /wp-json/", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.endsWith("/wp-json/")) return new Response("{}", { status: 200 });
        return jsonResponse({ id: 7, link: "https://tenmien.com/?p=7", status: "draft" });
      }),
    );

    const output = await runModule();

    expect(calls[0].url).toBe("https://tenmien.com/wp-json/");
    expect(calls[1].url).toBe("https://tenmien.com/wp-json/wp/v2/posts");
    const authorization = (calls[1].init?.headers as Record<string, string>).Authorization;
    expect(authorization.startsWith("Basic ")).toBe(true);
    expect(Buffer.from(authorization.slice(6), "base64").toString("utf8")).toBe(
      "admin:secret-token",
    );
    // Không bao giờ để fetch tự đi theo redirect.
    expect(calls[1].init?.redirect).toBe("manual");
    expect(output.result).toContain("Application Password");
    expect(output.postUrl).toBe("https://tenmien.com/?p=7");
  });

  it("chuyển sang public-api WordPress.com + Bearer token khi /wp-json/ trả 404", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.endsWith("/wp-json/")) return new Response("<html></html>", { status: 404 });
        return jsonResponse({ id: 12, link: "https://tenmien.com/?p=12", status: "draft" });
      }),
    );

    const output = await runModule();

    expect(calls[1].url).toBe(
      "https://public-api.wordpress.com/wp/v2/sites/tenmien.com/posts",
    );
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-token",
    );
    expect(output.result).toContain("WordPress.com");
  });

  it("tên miền riêng chuyển hướng về *.wordpress.com thì tự dùng địa chỉ chính thức", async () => {
    // Tình huống thật: eessencevn.com.vn (gắn vào site WordPress.com) 301 về
    // vuthithugiang1974-ghnvm.wordpress.com. Người dùng không phải tự sửa URL.
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.endsWith("/wp-json/")) {
          // fetch đã đi theo 301; response.url là địa chỉ cuối cùng.
          return Object.defineProperty(
            new Response("<html></html>", { status: 404 }),
            "url",
            { value: "https://site-that.wordpress.com/wp-json/" },
          );
        }
        return jsonResponse({ id: 9, link: "https://site-that.wordpress.com/?p=9", status: "draft" });
      }),
    );

    const output = await runModule();

    expect(calls[1].url).toBe(
      "https://public-api.wordpress.com/wp/v2/sites/site-that.wordpress.com/posts",
    );
    expect((calls[1].init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer secret-token",
    );
    expect(output.result).toContain("WordPress.com");
  });

  it("từ chối gửi thông tin đăng nhập khi site không chạy HTTPS", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Object.defineProperty(new Response("{}", { status: 200 }), "url", {
          value: "http://site-khong-ssl.com/wp-json/",
        }),
      ),
    );
    await expect(runModule()).rejects.toThrow(/HTTPS/);
  });

  it("báo lỗi rõ khi bị chuyển hướng, KHÔNG báo thành công giả", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/wp-json/")) return new Response("{}", { status: 200 });
        return new Response(null, {
          status: 301,
          headers: { location: "https://khac.com/wp-json/wp/v2/posts" },
        });
      }),
    );

    await expect(runModule()).rejects.toThrow(/chuyển hướng/i);
    await expect(runModule()).rejects.toThrow(/CHƯA được tạo/);
  });

  it("nêu rõ nguyên nhân xác thực khi provider trả 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/wp-json/")) return new Response("<html></html>", { status: 404 });
        return new Response('{"code":"unauthorized"}', { status: 401 });
      }),
    );

    await expect(runModule()).rejects.toThrow(/OAuth2 token/);
  });

  it("từ chối chạy khi chưa có nội dung từ các module trước", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      wordpressPublishModule.execute({
        input: { title: "x", publishMode: "draft" } as WordpressPublishInput,
        upstream: {},
        integrations,
        generate: async () => "",
      }),
    ).rejects.toThrow(/Chưa có nội dung/);
  });
});
