/**
 * Kiểm thử THẬT toàn bộ module app-native bằng DeepSeek.
 *
 * Cách chạy:
 *   1. Thêm vào .env.local (file này đã được gitignore, không lên git):
 *        DEEPSEEK_AUDIT_API_KEY=sk-...
 *   2. npm run modules:audit-live
 *   3. Xoá lại dòng key khi đã xong.
 *
 * Script gọi thẳng execute() của từng module với một adapter DeepSeek dựng từ
 * key trên — KHÔNG đụng vào cơ sở dữ liệu, KHÔNG tạo job, nên chạy được ở máy
 * local mà không cần Neon. Key chỉ được đọc từ biến môi trường và không bao giờ
 * bị in ra màn hình hay ghi vào file.
 *
 * Tuỳ chọn:
 *   --only=RIS_ONPAGE_SEO,RIS_GEO_SCHEMA   chỉ chạy vài module
 *   --model=deepseek-v4-pro                đổi model (mặc định v4-flash)
 *   --show=600                             in 600 ký tự đầu mỗi khối để đọc tay
 */

import { loadEnvConfig } from "@next/env";
import { DeepSeekModelProvider } from "@/infrastructure/ai/live-ai-model-providers";
import { buildUserAiProviderConfiguration } from "@/infrastructure/config/ai-environment";
import {
  getModuleDefinition,
  listModuleDefinitions,
  parseModuleInput,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { generateWithRetry } from "@/domain/modules/generate-with-retry";
import {
  buildSitemapDraftPrompt,
  buildSitemapOrganizePrompt,
  buildSitemapSelectionPrompt,
  sitemapDraftSystemPrompt,
  sitemapOrganizeSystemPrompt,
  sitemapSelectionSystemPrompt,
  validateSitemapFormat,
} from "@/domain/sitemap/sitemap-prompts";
import {
  countSitemapNodes,
  parseSitemapStructure,
} from "@/domain/sitemap/sitemap-structure";
import { setSiteScanner } from "@/domain/modules/definitions/site-scan";
import { scanWebsite } from "@/lib/site-audit/scan-website.server";
import { scoreOutput } from "./module-rubrics";

// @next/env nạp .env.local rồi .env — cùng cơ chế Next.js dùng khi chạy app.
loadEnvConfig(process.cwd());

// Script không chạy qua engine của Next nên phải tự gắn bộ quét website cho
// Module 20, giống việc module-engine.server.ts làm khi chạy thật.
setSiteScanner(scanWebsite);

const KEY =
  process.env.DEEPSEEK_AUDIT_API_KEY?.trim() ||
  process.env.DEEPSEEK_API_KEY?.trim();
// deepseek-chat / deepseek-reasoner đã ngừng hỗ trợ 2026-07-24 (xem
// ai-model-catalog.ts) — mặc định dùng model rẻ và nhanh nhất còn sống.
const MODEL = argValue("model") ?? "deepseek-v4-flash";
const SHOW = Number(argValue("show") ?? 0);
const ONLY = argValue("only")
  ?.split(",")
  .map((item) => item.trim())
  .filter(Boolean);

// Các module gọi API nền tảng ngoài (WordPress/Facebook/Zalo/GBP) cần token
// thật của khách hàng nên không kiểm thử tự động ở đây.
const INTEGRATION_MODULES = new Set([
  "RIS_WP_PUBLISH",
  "RIS_FB_PUBLISH",
  "RIS_ZALO_PUBLISH",
  "RIS_GBP_PUBLISH",
]);

interface Row {
  key: string;
  moduleNumber: number;
  title: string;
  status: "OK" | "LỖI" | "BỎ QUA";
  ms: number;
  detail: string;
  score?: number;
  failedCriteria?: string[];
}

async function main(): Promise<void> {
  if (!KEY) {
    console.error(
      [
        "Thiếu API key DeepSeek.",
        "",
        "Hãy thêm dòng sau vào file .env.local ở thư mục gốc dự án:",
        "  DEEPSEEK_AUDIT_API_KEY=sk-...",
        "",
        "File .env.local đã được gitignore nên key không lên git.",
        "Chạy xong nhớ xoá dòng đó đi.",
      ].join("\n"),
    );
    process.exit(1);
  }

  const definitions = listModuleDefinitions().filter((definition) =>
    ONLY ? ONLY.includes(definition.key) : true,
  );

  console.log(
    `Kiểm thử ${definitions.length} module bằng DeepSeek (model: ${MODEL})\n`,
  );

  const rows: Row[] = [];

  // Module 1 chạy ngoài registry (executor riêng) nên phải kiểm thử riêng.
  if (!ONLY || ONLY.includes("RIS_SITEMAP")) {
    rows.push(await auditSitemapModule());
    report(rows[rows.length - 1]);
  }

  for (const definition of definitions) {
    const started = Date.now();
    const base = {
      key: definition.key,
      moduleNumber: definition.moduleNumber,
      title: definition.title,
    };

    if (INTEGRATION_MODULES.has(definition.key)) {
      rows.push({
        ...base,
        status: "BỎ QUA",
        ms: 0,
        detail: "Cần token nền tảng ngoài — kiểm thử thủ công",
      });
      report(rows[rows.length - 1]);
      continue;
    }

    try {
      const input = parseModuleInput(definition, buildInput(definition.key));
      const adapter = new DeepSeekModelProvider(
        buildUserAiProviderConfiguration({
          provider: "deepseek",
          model: MODEL,
          apiKey: KEY,
          timeoutMs: 120_000,
          maxOutputTokens: 2_048,
        }),
      );

      // Dùng ĐÚNG cơ chế của production (tự kiểm tra + gọi lại 1 lần) để đo
      // trải nghiệm thật. Số lần phải gọi lại là tín hiệu prompt gốc còn yếu,
      // kể cả khi kết quả cuối cùng vẫn đạt điểm.
      let retries = 0;
      const output = await definition.execute({
        input: input as never,
        upstream: {},
        integrations: {},
        generate: (request) =>
          generateWithRetry(
            async ({ systemPrompt, prompt, maxOutputTokens }) => {
              const result = await adapter.generate({
                systemPrompt,
                prompt,
                maxOutputTokens: Math.min(maxOutputTokens ?? 2_048, 2_048),
              });
              return result.text;
            },
            {
              ...request,
              onRetry: () => {
                retries += 1;
              },
            },
          ),
      });

      // Đầu ra phải khớp schema đã khai báo, và mọi outputBlock phải có nội dung.
      definition.outputSchema.parse(output);
      const empty = definition.outputBlocks.filter((block) => {
        const value = (output as Record<string, unknown>)[block.key];
        return typeof value !== "string" || value.trim().length === 0;
      });
      if (empty.length > 0) {
        throw new Error(
          `Khối đầu ra rỗng: ${empty.map((block) => block.key).join(", ")}`,
        );
      }

      const rubric = scoreOutput(
        definition.key,
        output as Record<string, string>,
      );

      // --show=N: in N ký tự đầu của từng khối để đọc và chấm bằng mắt.
      if (SHOW > 0) {
        for (const block of definition.outputBlocks) {
          const value = (output as Record<string, string>)[block.key] ?? "";
          console.log(`\n  ┌─ ${block.label} ─────────────`);
          for (const line of value.slice(0, SHOW).split(/\r?\n/)) {
            console.log(`  │ ${line}`);
          }
          if (value.length > SHOW) console.log(`  │ …(còn ${value.length - SHOW} ký tự)`);
          console.log("  └────────────────────────────\n");
        }
      }
      rows.push({
        ...base,
        status: "OK",
        ms: Date.now() - started,
        score: rubric?.score,
        failedCriteria: rubric?.failed,
        detail:
          definition.outputBlocks
            .map((block) => {
              const value = (output as Record<string, string>)[block.key] ?? "";
              return `${block.key}:${value.length}`;
            })
            .join(" ") + (retries > 0 ? `  ⟲ gọi lại ${retries} lần` : ""),
      });
    } catch (error) {
      rows.push({
        ...base,
        status: "LỖI",
        ms: Date.now() - started,
        detail: redact(
          error instanceof Error ? error.message : "lỗi không xác định",
        ),
      });
    }
    report(rows[rows.length - 1]);
  }

  const failed = rows.filter((row) => row.status === "LỖI");
  const scored = rows.filter((row) => row.score !== undefined);
  const below = scored.filter((row) => (row.score ?? 0) < 9);
  const average =
    scored.length > 0
      ? scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length
      : 0;

  console.log("\n" + "=".repeat(74));
  console.log(
    `Tổng: ${rows.length} · OK ${rows.filter((r) => r.status === "OK").length}` +
      ` · Lỗi ${failed.length}` +
      ` · Bỏ qua ${rows.filter((r) => r.status === "BỎ QUA").length}`,
  );
  if (scored.length > 0) {
    console.log(`Điểm trung bình: ${average.toFixed(2)}/10 (model: ${MODEL})`);
  }

  if (failed.length > 0) {
    console.log("\nModule chạy lỗi:");
    for (const row of failed) {
      console.log(`  #${row.moduleNumber} ${row.title}: ${row.detail}`);
    }
  }
  if (below.length > 0) {
    console.log("\nDưới 9 điểm — CẦN SỬA PROMPT:");
    for (const row of below) {
      console.log(
        `  #${row.moduleNumber} ${row.title} — ${row.score?.toFixed(1)}/10`,
      );
      for (const criterion of row.failedCriteria ?? []) {
        console.log(`      ${criterion}`);
      }
    }
  }
  if (failed.length > 0 || below.length > 0) process.exit(1);
  console.log("\nTất cả module đạt từ 9/10 trở lên.");
}

function report(row: Row): void {
  const icon = row.status === "OK" ? "✓" : row.status === "LỖI" ? "✗" : "–";
  const time = row.ms > 0 ? `${(row.ms / 1000).toFixed(1)}s` : "";
  const score =
    row.score === undefined
      ? "     "
      : `${row.score.toFixed(1).padStart(4)}${row.score < 9 ? "!" : " "}`;
  console.log(
    `${icon} #${String(row.moduleNumber).padEnd(2)} ${row.title.padEnd(32)} ${score} ${time.padStart(6)}  ${row.detail}`,
  );
  // Dưới 9 điểm là ngưỡng phải sửa prompt — in ngay tiêu chí trượt.
  if (row.score !== undefined && row.score < 9 && row.failedCriteria?.length) {
    for (const criterion of row.failedCriteria) {
      console.log(`      ↳ trượt: ${criterion}`);
    }
  }
}

/**
 * Kiểm thử Module 1 (Sitemap). Chạy đúng chuỗi 3 bước của executor thật —
 * nháp → chọn lọc → nhóm phân cấp — kèm cơ chế tự kiểm tra và gọi lại một lần,
 * để đo đúng thứ người dùng nhận được.
 */
async function auditSitemapModule(): Promise<Row> {
  const started = Date.now();
  const base = { key: "RIS_SITEMAP", moduleNumber: 1, title: "Tạo Sitemap" };
  let retries = 0;

  try {
    const adapter = new DeepSeekModelProvider(
      buildUserAiProviderConfiguration({
        provider: "deepseek",
        model: MODEL,
        apiKey: KEY!,
        timeoutMs: 120_000,
        maxOutputTokens: 2_048,
      }),
    );
    const call = (systemPrompt: string, prompt: string): Promise<string> =>
      generateWithRetry(
        async (req) => {
          const result = await adapter.generate({
            systemPrompt: req.systemPrompt,
            prompt: req.prompt,
            maxOutputTokens: 2_048,
          });
          return result.text;
        },
        {
          systemPrompt,
          prompt,
          validate: validateSitemapFormat,
          onRetry: () => {
            retries += 1;
          },
        },
      );

    const site = {
      reference: "Trung tâm lập trình ABC",
      language: "Tiếng Việt",
      location: "Việt Nam",
      primaryKeyword: "khóa học lập trình cho trẻ em",
      tone: "Chuyên nghiệp",
      websiteBrief:
        "Trung tâm dạy lập trình cho học sinh phổ thông tại Hà Nội, khách hàng là phụ huynh có con 10–17 tuổi.",
      competitorUrls: [],
    };

    const draft = await call(
      sitemapDraftSystemPrompt,
      buildSitemapDraftPrompt(site as never),
    );
    const selection = await call(
      sitemapSelectionSystemPrompt,
      buildSitemapSelectionPrompt(draft),
    );
    const organized = await call(
      sitemapOrganizeSystemPrompt,
      buildSitemapOrganizePrompt(selection),
    );

    const issues = validateSitemapFormat(organized);
    const tree = parseSitemapStructure(organized, site.reference);
    const nodes = countSitemapNodes(tree);
    const withSlug = organized
      .split(/\r?\n/)
      .filter((line) => /\|\s*\/\S/.test(line)).length;
    const depth = treeDepth(tree);

    // Chấm điểm: định dạng đúng, đủ trang, có phân cấp thật, có đường dẫn.
    const criteria: Array<[string, boolean, number]> = [
      ["Định dạng đúng hoàn toàn (không lỗi nào)", issues.length === 0, 3],
      ["Không phải gọi lại lần nào", retries === 0, 2],
      ["Có ít nhất 12 trang", nodes >= 12, 2],
      ["Có phân cấp thật (từ 2 tầng trở lên)", depth >= 2, 3],
      ["Đa số trang có đường dẫn", withSlug * 2 >= nodes, 2],
      ["Cây dựng được từ đầu ra", nodes > 0, 2],
    ];
    const total = criteria.reduce((sum, [, , weight]) => sum + weight, 0);
    const earned = criteria.reduce(
      (sum, [, ok, weight]) => sum + (ok ? weight : 0),
      0,
    );

    return {
      ...base,
      status: "OK",
      ms: Date.now() - started,
      score: Math.round((earned / total) * 100) / 10,
      failedCriteria: criteria.filter(([, ok]) => !ok).map(([name]) => name),
      detail: `${nodes} trang · ${depth} tầng · ${withSlug} có đường dẫn · gọi lại ${retries} lần`,
    };
  } catch (error) {
    return {
      ...base,
      status: "LỖI",
      ms: Date.now() - started,
      detail: redact(error instanceof Error ? error.message : "lỗi không xác định"),
    };
  }
}

function treeDepth(node: { children: Array<{ children: unknown[] }> }): number {
  if (node.children.length === 0) return 0;
  return (
    1 +
    Math.max(
      ...node.children.map((child) =>
        treeDepth(child as { children: Array<{ children: unknown[] }> }),
      ),
    )
  );
}

/** Dựng input hợp lệ tối thiểu từ khai báo form của module. */
function buildInput(moduleKey: string): Record<string, unknown> {
  const definition = getModuleDefinition(moduleKey);
  const input: Record<string, unknown> = {
    projectId: "audit-project",
    idempotencyKey: crypto.randomUUID(),
    ai: { provider: "deepseek", model: MODEL },
  };
  for (const field of definition.form) {
    if (field.asLines) {
      input[field.key] = ["khóa học lập trình", "học lập trình online"];
    } else if (field.type === "select") {
      input[field.key] = field.options?.[0]?.value ?? "";
    } else if (field.key === "audienceBrief") {
      input[field.key] =
        "Trung tâm dạy lập trình cho học sinh phổ thông tại Hà Nội, tập trung vào phụ huynh có con 10–17 tuổi.";
    } else if (field.key === "websiteUrl") {
      // Quét site thật để kiểm thử có ý nghĩa; đổi bằng --site=<url>.
      input[field.key] =
        argValue("site") ?? "https://vuthithugiang1974-ghnvm.wordpress.com";
    } else if (field.key === "primaryKeyword" && moduleKey === "RIS_SITE_SCAN") {
      // Để trống có chủ đích: Module 20 phải tự suy ra lĩnh vực từ nội dung
      // quét được. Điền sẵn từ khóa sẽ che mất lỗi bịa ngành nghề.
      input[field.key] = argValue("keyword") ?? "";
    } else if (field.key === "pageUrl") {
      input[field.key] = "https://example.com";
    } else if (field.key === "language") {
      input[field.key] = "Tiếng Việt";
    } else if (field.key === "location") {
      input[field.key] = "Việt Nam";
    } else if (field.key === "tone") {
      input[field.key] = "Chuyên nghiệp";
    } else if (field.key === "primaryKeyword") {
      input[field.key] = "khóa học lập trình cho trẻ em";
    } else {
      input[field.key] = "Khóa học lập trình cho trẻ em";
    }
  }
  return input;
}

/** Chặn mọi chuỗi trông giống API key lọt vào log. */
function redact(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-***")
    .replace(/AIza[A-Za-z0-9_-]{8,}/g, "AIza***")
    .slice(0, 300);
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

main().catch((error: unknown) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
