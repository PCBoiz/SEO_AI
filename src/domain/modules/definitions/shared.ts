import { z } from "zod";
import type { ModuleFormField } from "@/domain/modules/module-definition";

// Trường bản địa hóa dùng chung cho hầu hết module: ngôn ngữ, thị trường, bối
// cảnh doanh nghiệp/khách hàng. Giữ nhất quán để việc nối luồng sau này dễ dàng
// (module sau đọc được cùng khóa input).
export const localizedShape = {
  language: z
    .string()
    .trim()
    .min(1, "Ngôn ngữ đầu ra không được để trống")
    .max(80),
  location: z
    .string()
    .trim()
    .min(1, "Thị trường/địa điểm không được để trống")
    .max(160),
  audienceBrief: z
    .string()
    .trim()
    .min(10, "Mô tả doanh nghiệp/khách hàng cần ít nhất 10 ký tự")
    .max(8_000),
} as const;

export const localizedFields: ModuleFormField[] = [
  {
    key: "location",
    label: "Thị trường / địa điểm",
    type: "text",
    required: true,
    prefillFromProject: "location",
  },
  {
    key: "language",
    label: "Ngôn ngữ đầu ra",
    type: "text",
    required: true,
    prefillFromProject: "language",
  },
  {
    key: "audienceBrief",
    label: "Mô tả doanh nghiệp / khách hàng",
    type: "textarea",
    required: true,
    rows: 4,
    description:
      "Tối thiểu 10 ký tự — bối cảnh để AI chọn đúng đối tượng cho SEO + GEO.",
  },
];

// Hướng dẫn trích xuất chuẩn GEO 2026: khối trả lời nhanh trên đầu, câu chủ đề
// trả lời trực tiếp, bảng so sánh khi hợp lý, dữ kiện/thực thể rõ ràng.
export const geoExtractionGuidance =
  "Chuẩn GEO: mở đầu bằng khối 'Trả lời nhanh' (2–4 câu, đặt trên đầu, trả lời trực tiếp câu hỏi cốt lõi); mỗi mục bắt đầu bằng câu chủ đề trả lời thẳng; dùng bảng so sánh khi có nhiều lựa chọn/tiêu chí; nêu rõ thực thể, con số và dữ kiện để AI dễ trích dẫn nguyên văn.";

export interface LocalizedInput {
  language: string;
  location: string;
  audienceBrief: string;
}

// Ba dòng bối cảnh dùng lại trong prompt của mọi module.
export function localizedContextLines(input: LocalizedInput): string[] {
  return [
    `Ngôn ngữ đầu ra: ${input.language}`,
    `Thị trường/địa điểm: ${input.location}`,
    `Bối cảnh doanh nghiệp và khách hàng mục tiêu: ${input.audienceBrief}`,
  ];
}

// Chuyển mảng dòng thành khối văn bản để nhúng vào prompt (fallback khi rỗng).
export function linesOrFallback(lines: string[], fallback: string): string {
  return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : fallback;
}

// Ghép ngữ cảnh nối luồng từ đầu ra các module trước (nếu có) để chèn vào prompt.
// Trả về "" nếu không có gì — module sẽ chạy đơn lẻ bình thường.
export function upstreamBlock(
  upstream: Record<string, string>,
  keys: Array<{ key: string; label: string }>,
): string {
  const parts = keys
    .map(({ key, label }) =>
      upstream[key] ? `### ${label}\n${upstream[key]}` : "",
    )
    .filter(Boolean);
  if (parts.length === 0) return "";
  return [
    "",
    "Ngữ cảnh đã có từ các bước trước trong cùng dự án — hãy bám sát, nhất quán và không mâu thuẫn:",
    parts.join("\n\n"),
  ].join("\n");
}
