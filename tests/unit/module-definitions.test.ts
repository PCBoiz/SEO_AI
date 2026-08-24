import { afterEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/domain/shared/app-error";
import {
  getModuleDefinition,
  listModuleDefinitions,
  parseModuleInput,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { articlePipelineModuleKeys } from "@/domain/modules/registry";
import {
  sitemapKeywordsModule,
  type SitemapKeywordsInput,
} from "@/domain/modules/definitions/sitemap-keywords";
import { icnKeywordsModule } from "@/domain/modules/definitions/research-modules";
import { seoGeoSystemPrompt } from "@/domain/modules/seo-geo";

const validInput: SitemapKeywordsInput = {
  projectId: "project-1",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  ai: { provider: "deepseek", model: "deepseek-v4-flash" },
  primaryKeyword: "giáo dục lập trình",
  language: "Tiếng Việt",
  location: "Việt Nam",
  audienceBrief: "Trung tâm dạy lập trình cho học sinh phổ thông.",
  sitemapLabels: ["Trang chủ", "Khóa học", "Blog"],
};

const expectedModules = [
  ["RIS_SITEMAP_KEYWORDS", 2],
  ["RIS_ICN_KEYWORDS", 3],
  ["RIS_IMPORTED_KEYWORDS", 4],
  ["RIS_ONPAGE_SEO", 5],
  ["RIS_HOMEPAGE_CONTENT", 6],
  ["RIS_CONTENT_HEADLINE", 7],
  ["RIS_CONTENT_INTRO", 8],
  ["RIS_CONTENT_SECTIONS", 10],
  ["RIS_GEO_SCHEMA", 11],
  ["RIS_WP_PUBLISH", 12],
  ["RIS_GEO_FILES", 13],
  ["RIS_FB_PUBLISH", 14],
  ["RIS_ZALO_PUBLISH", 15],
  ["RIS_GBP_PUBLISH", 16],
  ["RIS_VIDEO_SCRIPT", 17],
  ["RIS_REPURPOSE", 18],
  ["RIS_AB_VARIANTS", 19],
  ["RIS_SITE_SCAN", 20],
] as const;

describe("registry module app-native", () => {
  it.each(expectedModules)(
    "đăng ký %s là Module #%i với form + outputBlocks hợp lệ",
    (key, moduleNumber) => {
      const definition = getModuleDefinition(key);
      expect(definition.moduleNumber).toBe(moduleNumber);
      expect(definition.form.length).toBeGreaterThan(0);
      expect(definition.outputBlocks.length).toBeGreaterThan(0);
      // Mọi outputBlock phải khớp một khóa trong output schema (parse mẫu).
      expect(definition.description.length).toBeGreaterThan(0);
    },
  );

  it("liệt kê đủ 11 module theo thứ tự moduleNumber", () => {
    const numbers = listModuleDefinitions().map((m) => m.moduleNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(numbers).toContain(12);
    expect(numbers).toContain(13);
  });

  it("ném lỗi khi module không tồn tại", () => {
    expect(() => getModuleDefinition("KHONG_TON_TAI")).toThrow(ValidationError);
  });
});

describe("Module 2 · input schema", () => {
  it("chấp nhận input hợp lệ và mặc định nhãn sitemap là mảng rỗng", () => {
    const parsed = parseModuleInput(sitemapKeywordsModule, {
      ...validInput,
      sitemapLabels: undefined,
    });
    expect(parsed.sitemapLabels).toEqual([]);
    expect(parsed.ai.provider).toBe("deepseek");
  });

  it("từ chối khi thiếu từ khóa chính hoặc brief quá ngắn", () => {
    expect(() =>
      parseModuleInput(sitemapKeywordsModule, {
        ...validInput,
        primaryKeyword: "",
      }),
    ).toThrow(ValidationError);
    expect(() =>
      parseModuleInput(sitemapKeywordsModule, {
        ...validInput,
        audienceBrief: "ngắn",
      }),
    ).toThrow(ValidationError);
  });
});

describe("Module 2 · execute (BYOK generate giả lập)", () => {
  it("gọi model hai bước và trả về keywordPlan + geoPlan hợp lệ", async () => {
    const prompts: Array<{ system?: string; prompt: string }> = [];
    const output = await sitemapKeywordsModule.execute({
      input: validInput,
      upstream: {},
      integrations: {},
      async generate({ systemPrompt, prompt }) {
        prompts.push({ system: systemPrompt, prompt });
        return prompts.length === 1 ? "KẾ HOẠCH TỪ KHÓA" : "KẾ HOẠCH GEO";
      },
    });

    expect(prompts).toHaveLength(2);
    // Bước 1 nhúng nhãn sitemap được cung cấp.
    expect(prompts[0].prompt).toContain("Khóa học");
    expect(prompts[0].prompt).toContain("Tiếng Việt");
    // Bước 2 là GEO: nhắc tới trợ lý AI.
    expect(prompts[1].prompt).toMatch(/ChatGPT|Perplexity|trợ lý AI/);
    expect(() =>
      sitemapKeywordsModule.outputSchema.parse(output),
    ).not.toThrow();
    expect(output.keywordPlan).toBe("KẾ HOẠCH TỪ KHÓA");
    expect(output.geoPlan).toBe("KẾ HOẠCH GEO");
  });

  it("dùng fallback khi không có nhãn sitemap (chạy đơn lẻ)", async () => {
    let firstPrompt = "";
    await sitemapKeywordsModule.execute({
      input: { ...validInput, sitemapLabels: [] },
      upstream: {},
      integrations: {},
      async generate({ prompt }) {
        if (!firstPrompt) firstPrompt = prompt;
        return "OK";
      },
    });
    expect(firstPrompt).toContain("Không có nhãn sitemap được cung cấp");
  });
});

// Dựng input hợp lệ tối thiểu từ khai báo form của module để kiểm tra vòng đời.
function buildInputFromForm(key: string): Record<string, unknown> {
  const definition = getModuleDefinition(key);
  const input: Record<string, unknown> = {
    projectId: "project-1",
    idempotencyKey: "22222222-2222-4222-8222-222222222222",
    ai: { provider: "deepseek", model: "deepseek-v4-flash" },
  };
  for (const field of definition.form) {
    if (field.asLines) {
      input[field.key] = ["Mục A", "Mục B"];
    } else if (field.key === "audienceBrief") {
      input[field.key] = "Doanh nghiệp cung cấp dịch vụ mẫu cho khách hàng.";
    } else if (field.type === "select") {
      input[field.key] = field.options?.[0]?.value ?? "";
    } else if (field.key === "websiteUrl") {
      input[field.key] = "https://example.com";
    } else {
      input[field.key] = "giá trị thử nghiệm";
    }
  }
  return input;
}

// Các module đăng bài gọi API nền tảng thật — loại khỏi vòng đời generate giả
// lập (WP có test fetch riêng; FB/Zalo/GBP owner test khi có token).
const aiLifecycleModules = expectedModules
  .map(([key]) => key)
  .filter(
    (key) =>
      ![
        "RIS_WP_PUBLISH",
        "RIS_FB_PUBLISH",
        "RIS_ZALO_PUBLISH",
        "RIS_GBP_PUBLISH",
        // Module 20 đọc website thật qua mạng — có bộ test riêng dùng scanner giả.
        "RIS_SITE_SCAN",
      ].includes(key),
  );

describe("vòng đời mọi module (execute → output khớp outputBlocks)", () => {
  it.each(aiLifecycleModules)(
    "%s: execute trả về đủ các outputBlock và pass output schema",
    async (key) => {
      const definition = getModuleDefinition(key);
      const input = parseModuleInput(definition, buildInputFromForm(key));
      const output = await definition.execute({
        input: input as never,
        upstream: {},
        integrations: {},
        async generate() {
          return "NỘI DUNG MẪU CHO KIỂM THỬ";
        },
      });
      expect(() => definition.outputSchema.parse(output)).not.toThrow();
      for (const block of definition.outputBlocks) {
        expect(typeof (output as Record<string, unknown>)[block.key]).toBe(
          "string",
        );
      }
    },
  );
});

describe("nối luồng (upstream context)", () => {
  it("chèn đầu ra module trước vào prompt khi có upstream", async () => {
    let clusterPrompt = "";
    await icnKeywordsModule.execute({
      input: {
        projectId: "p1",
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        ai: { provider: "deepseek", model: "deepseek-v4-flash" },
        primaryKeyword: "giáo dục lập trình",
        language: "Tiếng Việt",
        location: "Việt Nam",
        audienceBrief: "Trung tâm dạy lập trình cho học sinh.",
        seedKeywords: [],
      },
      upstream: {
        RIS_SITEMAP_KEYWORDS: "TU_KHOA_TU_MODULE_2",
      },
      integrations: {},
      async generate({ prompt }) {
        if (!clusterPrompt) clusterPrompt = prompt;
        return "OK";
      },
    });
    expect(clusterPrompt).toContain("TU_KHOA_TU_MODULE_2");
    expect(clusterPrompt).toContain("Ngữ cảnh đã có từ các bước trước");
  });

  it("pipeline bài viết base đúng thứ tự #2→#3→#5→#7→#8→#10→#11→#13", () => {
    expect(articlePipelineModuleKeys).toEqual([
      "RIS_SITEMAP_KEYWORDS",
      "RIS_ICN_KEYWORDS",
      "RIS_ONPAGE_SEO",
      "RIS_CONTENT_HEADLINE",
      "RIS_CONTENT_INTRO",
      "RIS_CONTENT_SECTIONS",
      "RIS_GEO_SCHEMA",
      "RIS_GEO_FILES",
    ]);
  });
});

describe("Module 12 · Đăng WordPress (fetch giả lập)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const wpInput = {
    projectId: "p1",
    idempotencyKey: "44444444-4444-4444-8444-444444444444",
    ai: { provider: "deepseek", model: "deepseek-v4-flash" },
    title: "",
    publishMode: "draft",
  };
  const wpUpstream = {
    RIS_CONTENT_HEADLINE:
      "## Phương án tiêu đề\n1. Học lập trình cho người mới: lộ trình 2026 — phù hợp informational",
    RIS_CONTENT_INTRO: "## Phần mở đầu\nHọc lập trình chưa bao giờ dễ hơn.",
    RIS_CONTENT_SECTIONS: "## Thân bài\n## Vì sao nên học\nNội dung chi tiết.",
    RIS_GEO_SCHEMA:
      '## FAQ khớp câu hỏi (GEO)\nHỏi: Học ở đâu?\nĐáp: Tại trung tâm.\n\n## Mã JSON-LD (dán vào <head>)\n<script type="application/ld+json">{}</script>',
  };

  it("ghép bài từ upstream, gửi Basic auth, tạo draft và trả link", async () => {
    const definition = getModuleDefinition("RIS_WP_PUBLISH");
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        // Bước dò /wp-json/ để nhận diện site tự host (có REST trên tên miền).
        if (url.endsWith("/wp-json/")) return new Response("{}", { status: 200 });
        return new Response(
          JSON.stringify({ id: 123, link: "https://blog.vn/?p=123", status: "draft" }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      },
    );

    const output = (await definition.execute({
      input: parseModuleInput(definition, wpInput) as never,
      upstream: wpUpstream,
      integrations: {
        wordpress: {
          url: "https://blog.vn/",
          username: "admin",
          password: "app-password",
        },
      },
      async generate() {
        throw new Error("Module 12 không được gọi AI.");
      },
    })) as { result: string; postUrl: string };

    // 2 lần gọi: dò /wp-json/ rồi mới POST bài.
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("https://blog.vn/wp-json/");
    expect(calls[1].url).toBe("https://blog.vn/wp-json/wp/v2/posts");
    const headers = calls[1].init.headers as Record<string, string>;
    expect(headers.Authorization.startsWith("Basic ")).toBe(true);
    const body = JSON.parse(String(calls[1].init.body)) as {
      title: string;
      content: string;
      status: string;
    };
    // Tiêu đề lấy từ Module 7 (bỏ đánh số), trạng thái draft-first.
    expect(body.title).toContain("Học lập trình cho người mới");
    expect(body.status).toBe("draft");
    // Nội dung gồm intro + thân bài (HTML) + FAQ + JSON-LD.
    expect(body.content).toContain("<p>Học lập trình chưa bao giờ dễ hơn.</p>");
    expect(body.content).toContain("<h2>Vì sao nên học</h2>");
    expect(body.content).toContain("Câu hỏi thường gặp");
    expect(body.content).toContain('<script type="application/ld+json">');
    expect(output.postUrl).toBe("https://blog.vn/?p=123");
    expect(output.result).toContain("BẢN NHÁP");
  });

  it("báo lỗi rõ khi chưa có nội dung upstream", async () => {
    const definition = getModuleDefinition("RIS_WP_PUBLISH");
    await expect(
      definition.execute({
        input: parseModuleInput(definition, wpInput) as never,
        upstream: {},
        integrations: {
          wordpress: { url: "https://blog.vn", username: "a", password: "b" },
        },
        async generate() {
          return "";
        },
      }),
    ).rejects.toThrow(/Chưa có nội dung để đăng/);
  });
});

describe("system prompt SEO + GEO", () => {
  it("nhắc tới cả SEO cổ điển lẫn GEO/công cụ AI", () => {
    expect(seoGeoSystemPrompt).toMatch(/SEO/);
    expect(seoGeoSystemPrompt).toMatch(/GEO/);
    expect(seoGeoSystemPrompt).toMatch(/ChatGPT|Perplexity|AI Overviews/);
  });
});
