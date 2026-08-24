// Bộ tiêu chí chấm điểm đầu ra module, thang 0–10.
//
// Chấm bằng code (không gọi thêm AI) nên: lặp lại được, không tốn tiền, và
// dùng chung cho MỌI provider/model — chạy DeepSeek hay GPT hay Gemini đều đo
// bằng đúng một thước đo. Dưới 9 điểm là phải sửa prompt.
//
// Mỗi tiêu chí có trọng số; điểm cuối = tổng (trọng số × đạt) / tổng trọng số × 10.

export interface Criterion {
  name: string;
  weight: number;
  /** true = đạt. Nhận toàn bộ đầu ra của module. */
  check: (output: Record<string, string>) => boolean;
}

export interface RubricResult {
  score: number;
  passed: string[];
  failed: string[];
}

const VIETNAMESE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

/* ------------------------------ Tiêu chí chung ------------------------------ */

function nonEmpty(key: string, min = 80): Criterion {
  return {
    name: `"${key}" có nội dung thực chất (≥ ${min} ký tự)`,
    weight: 2,
    check: (output) => (output[key]?.trim().length ?? 0) >= min,
  };
}

function vietnamese(key: string): Criterion {
  return {
    name: `"${key}" viết bằng tiếng Việt có dấu`,
    weight: 2,
    check: (output) => VIETNAMESE.test(output[key] ?? ""),
  };
}

function noMeta(key: string): Criterion {
  return {
    name: `"${key}" không có lời dẫn thừa ("Dưới đây là…")`,
    weight: 1,
    check: (output) => !hasPreamble(output[key] ?? ""),
  };
}

/**
 * Lời dẫn thừa CHỈ có nghĩa ở ĐẦU câu trả lời. Bản trước dùng cờ `m` nên `^`
 * khớp mọi dòng — một dòng "Lưu ý:" hợp lệ giữa bài viết cũng bị tính là lỗi.
 * Vì vậy chỉ xét dòng đầu tiên có nội dung.
 */
export function hasPreamble(text: string): boolean {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return false;
  return /^(chắc chắn|dưới đây là|đây là|tôi sẽ|tôi đã|hy vọng|sau đây là)/i.test(
    firstLine,
  );
}

function containsAll(key: string, needles: string[], label: string): Criterion {
  return {
    name: `"${key}" ${label}`,
    weight: 2,
    check: (output) => {
      const text = (output[key] ?? "").toLowerCase();
      return needles.every((needle) => text.includes(needle.toLowerCase()));
    },
  };
}

function minLines(key: string, count: number, label: string): Criterion {
  return {
    name: `"${key}" ${label}`,
    weight: 2,
    check: (output) =>
      (output[key] ?? "").split(/\r?\n/).filter((line) => line.trim()).length >=
      count,
  };
}

function validJson(key: string): Criterion {
  return {
    name: `"${key}" là JSON hợp lệ`,
    weight: 3,
    check: (output) => {
      const raw = (output[key] ?? "").trim();
      const inner = raw.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? raw;
      try {
        JSON.parse(inner.trim());
        return true;
      } catch {
        return false;
      }
    },
  };
}

/* --------------------------- Tiêu chí theo module --------------------------- */

export const rubrics: Record<string, Criterion[]> = {
  RIS_SITEMAP_KEYWORDS: [
    nonEmpty("keywordPlan", 200),
    vietnamese("keywordPlan"),
    noMeta("keywordPlan"),
    minLines("keywordPlan", 8, "liệt kê đủ nhiều từ khóa (≥ 8 dòng)"),
    nonEmpty("geoPlan", 150),
    containsAll("geoPlan", ["?"], "có câu hỏi người dùng hỏi trợ lý AI"),
  ],
  RIS_ICN_KEYWORDS: [
    nonEmpty("clusterPlan", 250),
    vietnamese("clusterPlan"),
    noMeta("clusterPlan"),
    containsAll("clusterPlan", ["pillar"], "nêu rõ trang trụ (pillar)"),
    nonEmpty("geoPlan", 150),
  ],
  RIS_IMPORTED_KEYWORDS: [
    nonEmpty("organizedKeywords", 200),
    vietnamese("organizedKeywords"),
    noMeta("organizedKeywords"),
    minLines("organizedKeywords", 8, "gom nhóm thành nhiều dòng (≥ 8)"),
  ],
  RIS_ONPAGE_SEO: [
    nonEmpty("onPagePlan", 250),
    vietnamese("onPagePlan"),
    noMeta("onPagePlan"),
    containsAll("onPagePlan", ["title"], "có Title tag"),
    containsAll("onPagePlan", ["meta"], "có Meta description"),
    containsAll("onPagePlan", ["h1"], "có cấu trúc heading H1"),
    nonEmpty("geoSnippet", 120),
  ],
  RIS_HOMEPAGE_CONTENT: [
    nonEmpty("homepageContent", 500),
    vietnamese("homepageContent"),
    noMeta("homepageContent"),
    minLines("homepageContent", 10, "đủ dài cho một trang chủ (≥ 10 dòng)"),
  ],
  RIS_CONTENT_HEADLINE: [
    nonEmpty("headlines", 150),
    vietnamese("headlines"),
    noMeta("headlines"),
    minLines("headlines", 8, "đề xuất đủ nhiều phương án (≥ 8 dòng)"),
  ],
  RIS_CONTENT_INTRO: [
    nonEmpty("intro", 200),
    vietnamese("intro"),
    noMeta("intro"),
  ],
  RIS_CONTENT_SECTIONS: [
    nonEmpty("sections", 800),
    vietnamese("sections"),
    noMeta("sections"),
    containsAll("sections", ["##"], "dùng heading Markdown (##)"),
  ],
  RIS_GEO_SCHEMA: [
    nonEmpty("faq", 200),
    vietnamese("faq"),
    noMeta("faq"),
    containsAll("faq", ["?"], "có câu hỏi dạng hỏi–đáp"),
    validJson("jsonLd"),
  ],
  RIS_GEO_FILES: [
    nonEmpty("deployGuide", 200),
    vietnamese("deployGuide"),
    nonEmpty("llmsTxt", 50),
    nonEmpty("robotsTxt", 20),
    containsAll("robotsTxt", ["user-agent"], "có chỉ thị User-agent"),
  ],
  RIS_VIDEO_SCRIPT: [
    nonEmpty("script", 300),
    vietnamese("script"),
    noMeta("script"),
    containsAll("script", ["cảnh"], "chia theo từng cảnh"),
    containsAll("script", ["hình", "lời"], "mỗi cảnh có HÌNH và LỜI"),
    nonEmpty("voiceover", 150),
    containsAll("srt", ["-->"], "phụ đề .srt có dòng timecode"),
    validJson("videoObject"),
  ],
  RIS_REPURPOSE: [
    nonEmpty("thread", 200),
    vietnamese("thread"),
    noMeta("thread"),
    nonEmpty("carousel", 200),
    containsAll("carousel", ["slide"], "chia theo từng slide"),
    nonEmpty("newsletter", 150),
    nonEmpty("fbPost", 80),
  ],
  RIS_AB_VARIANTS: [
    nonEmpty("titleVariants", 150),
    vietnamese("titleVariants"),
    noMeta("titleVariants"),
    minLines("titleVariants", 5, "đủ nhiều phương án tiêu đề (≥ 5 dòng)"),
    nonEmpty("introVariants", 200),
  ],
};

export function scoreOutput(
  moduleKey: string,
  output: Record<string, string>,
): RubricResult | null {
  const criteria = rubrics[moduleKey];
  if (!criteria || criteria.length === 0) return null;

  const passed: string[] = [];
  const failed: string[] = [];
  let earned = 0;
  let total = 0;

  for (const criterion of criteria) {
    total += criterion.weight;
    let ok = false;
    try {
      ok = criterion.check(output);
    } catch {
      ok = false;
    }
    if (ok) {
      earned += criterion.weight;
      passed.push(criterion.name);
    } else {
      failed.push(criterion.name);
    }
  }

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100) / 10,
    passed,
    failed,
  };
}
