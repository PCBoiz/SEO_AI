import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { seoGeoPreamble } from "@/domain/modules/seo-geo";
import { localizedContextLines, localizedFields, localizedShape } from "@/domain/modules/definitions/shared";
import { noPreamble } from "@/domain/modules/generate-with-retry";
import {
  snapshotToContentDigest,
  snapshotToOutline,
  summarizeSnapshot,
  type SiteSnapshot,
} from "@/domain/site-audit/site-snapshot";

// Module 20 · Quét website hiện có.
//
// Đây là mảnh ghép biến nền tảng từ "chỉ dùng được cho website mới tinh" thành
// "cải tiến được website đang chạy". Module đọc cấu trúc + nội dung thật của
// site khách, rồi để AI đối chiếu Hiện tại ↔ Đề xuất. Vì đầu ra được engine nạp
// làm ngữ cảnh cho các module sau, mọi module về sau đều "biết" khách đã có gì
// và không đề xuất trùng lặp nữa.

const input = z
  .object({
    ...moduleJobBaseShape,
    ...localizedShape,
    websiteUrl: z
      .string()
      .trim()
      .min(1, "Địa chỉ website không được để trống")
      .max(2_048),
    primaryKeyword: z.string().trim().max(240).default(""),
  })
  .strict();
export type SiteScanInput = z.infer<typeof input>;

const output = z
  .object({
    contractVersion: z.literal("1.0"),
    currentStructure: z.string().min(1),
    proposal: z.string().min(1),
    actions: z.string().min(1),
  })
  .strict();
export type SiteScanOutput = z.infer<typeof output>;

// Bên gọi (engine) bơm hàm quét vào để domain không phụ thuộc tầng mạng — nhờ
// vậy module vẫn test được bằng dữ liệu giả.
export type SiteScanner = (url: string) => Promise<SiteSnapshot>;

let scanner: SiteScanner | null = null;
export function setSiteScanner(next: SiteScanner): void {
  scanner = next;
}

export const siteScanModule: ModuleDefinition<SiteScanInput, SiteScanOutput> = {
  key: "RIS_SITE_SCAN",
  moduleNumber: 20,
  title: "Quét website hiện có",
  description:
    "Đọc cấu trúc và nội dung website đang chạy, rồi đối chiếu Hiện tại ↔ Đề xuất để biết nên giữ, chuyển, gộp hay thêm trang nào. Kết quả trở thành bối cảnh cho mọi module sau.",
  category: "Research",
  inputSchema: input,
  outputSchema: output,
  form: [
    {
      key: "websiteUrl",
      label: "Địa chỉ website hiện có",
      type: "text",
      required: true,
      prefillFromProject: "website",
      placeholder: "https://tenmien.com",
      description:
        "Chỉ đọc dữ liệu công khai (REST API của WordPress hoặc sitemap.xml) — không cần mật khẩu.",
    },
    {
      key: "primaryKeyword",
      label: "Từ khóa / lĩnh vực trọng tâm (tùy chọn)",
      type: "text",
      placeholder: "Ví dụ: khóa học phát triển bản thân",
      description: "Giúp AI đánh giá site đang thiếu nội dung gì so với mục tiêu.",
    },
    ...localizedFields,
  ],
  outputBlocks: [
    { key: "currentStructure", label: "Cấu trúc hiện tại (quét từ website)" },
    { key: "proposal", label: "Đề xuất cải tiến (Hiện tại ↔ Đề xuất)" },
    { key: "actions", label: "Việc cần làm, xếp theo ưu tiên" },
  ],
  async execute({ input: values, generate }) {
    if (!scanner) {
      throw new Error("Chưa cấu hình bộ quét website ở tầng server.");
    }
    const snapshot = await scanner(values.websiteUrl);
    const outline = snapshotToOutline(snapshot);
    const stats = summarizeSnapshot(snapshot);

    const sourceLabel =
      snapshot.source === "wordpress"
        ? "WordPress REST API (có cả nội dung trang)"
        : "sitemap.xml (chỉ có danh sách địa chỉ)";

    const currentStructure = [
      `Nguồn dữ liệu: ${sourceLabel}`,
      `Website: ${snapshot.siteUrl}`,
      `Tổng số trang: ${stats.total} · Cấp cao nhất: ${stats.topLevel} · Độ sâu: ${stats.maxDepth} tầng` +
        (stats.thin > 0 ? ` · Trang mỏng dưới 300 từ: ${stats.thin}` : ""),
      ...snapshot.notes.map((note) => `Ghi chú: ${note}`),
      "",
      outline,
    ].join("\n");

    // Nội dung thật của các trang — thứ giúp AI biết site làm về lĩnh vực gì
    // thay vì suy đoán từ ô từ khóa (gõ sai là lệch sang ngành khác).
    const digest = snapshotToContentDigest(snapshot);

    const context = [
      `Website: ${snapshot.siteUrl}`,
      ...localizedContextLines(values),
      values.primaryKeyword.trim()
        ? `Từ khóa người dùng gợi ý (chỉ tham khảo): ${values.primaryKeyword}`
        : "",
      "",
      "CẤU TRÚC HIỆN TẠI (quét từ website thật):",
      outline,
      "",
      `Thống kê: ${stats.total} trang, ${stats.topLevel} trang ở cấp cao nhất, sâu ${stats.maxDepth} tầng` +
        (stats.thin > 0 ? `, ${stats.thin} trang có nội dung mỏng (<300 từ)` : ""),
      digest
        ? ["", "NỘI DUNG THẬT CỦA CÁC TRANG (trích đoạn):", digest].join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const proposal = await generate({
      systemPrompt: `${seoGeoPreamble()}\nBạn là chuyên gia kiến trúc thông tin website. Chỉ trả về bảng đối chiếu, không giải thích quy trình.`,
      prompt: [
        `Đối chiếu cấu trúc website hiện tại với cấu trúc tối ưu bằng ${values.language}.`,
        context,
        "",
        // Chống bịa ngành nghề: bắt bám vào nội dung quét được, coi từ khóa
        // người dùng nhập chỉ là gợi ý có thể sai.
        "TRƯỚC KHI ĐỀ XUẤT, hãy tự xác định website này thuộc lĩnh vực gì dựa vào TÊN TRANG và NỘI DUNG THẬT ở trên.",
        "Nếu từ khóa người dùng gợi ý mâu thuẫn với nội dung thật của website, hãy TIN VÀO NỘI DUNG THẬT và bỏ qua từ khóa đó.",
        "TUYỆT ĐỐI KHÔNG đề xuất sản phẩm, dịch vụ hay chủ đề mà website không hề kinh doanh.",
        "",
        // Bắt AI công bố cách hiểu của nó thành MỘT dòng cố định, để người dùng
        // kiểm chứng ngay AI có hiểu đúng ngành nghề không trước khi đọc đề xuất.
        "DÒNG ĐẦU TIÊN của câu trả lời phải đúng mẫu sau (một dòng duy nhất):",
        "LĨNH VỰC: <mô tả ngắn website này kinh doanh gì, dưới 25 từ>",
        "",
        "Sau đó, với MỖI trang hiện có, ghi đúng một dòng theo mẫu:",
        "Tên trang | /duong-dan | NHÃN | lý do ngắn",
        "",
        "NHÃN chỉ được là một trong bốn giá trị sau:",
        "- GIỮ NGUYÊN: trang đã hợp lý, không cần đổi.",
        "- CHUYỂN VỊ TRÍ: nên thành trang con của trang khác (ghi rõ trang cha trong lý do).",
        "- GỘP LẠI: nên nhập vào một trang khác vì trùng ý (ghi rõ gộp vào đâu).",
        "- VIẾT LẠI: giữ vị trí nhưng nội dung mỏng/yếu, cần bổ sung.",
        "",
        "Sau đó liệt kê các trang CÒN THIẾU, mỗi dòng theo mẫu:",
        "Tên trang | /duong-dan | THÊM MỚI | lý do vì sao cần",
        "",
        "Chỉ đề xuất trang thật sự cần cho ngành này. Không bịa trang chỉ để cho dài.",
        "TUYỆT ĐỐI KHÔNG dùng địa chỉ đầy đủ https:// — chỉ đường dẫn tương đối.",
        "Vào thẳng danh sách, không viết câu dẫn nhập.",
      ].join("\n"),
      maxOutputTokens: 3_072,
      validate: noPreamble,
    });

    const actions = await generate({
      systemPrompt: `${seoGeoPreamble()}\nBạn là chuyên gia SEO tư vấn triển khai. Chỉ trả về danh sách việc cần làm.`,
      prompt: [
        `Từ bảng đối chiếu dưới đây, viết danh sách việc cần làm bằng ${values.language}, xếp theo thứ tự ưu tiên.`,
        "",
        "Bảng đối chiếu:",
        proposal,
        "",
        "Yêu cầu: mỗi việc một dòng, bắt đầu bằng động từ, nêu rõ làm gì với trang nào.",
        "Xếp việc tác động lớn tới SEO và ít công sức lên trước.",
        "Ghi mức độ ở cuối mỗi dòng dạng '(Ưu tiên: Cao/Trung bình/Thấp)'.",
        "Tối đa 12 việc. Vào thẳng danh sách, không viết câu dẫn nhập.",
      ].join("\n"),
      maxOutputTokens: 1_536,
      validate: noPreamble,
    });

    return { contractVersion: "1.0", currentStructure, proposal, actions };
  },
};
