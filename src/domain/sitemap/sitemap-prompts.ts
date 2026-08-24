import type { SitemapPilotSiteInput } from "@/domain/sitemap/sitemap-pilot";
import type { FormatIssue } from "@/domain/modules/generate-with-retry";

/**
 * Hợp đồng định dạng cho đầu ra sitemap: mỗi dòng "Tên trang | /duong-dan",
 * thụt lề thể hiện cấp bậc. Kiểm tra ở code nên áp dụng như nhau cho mọi
 * provider/model — model nào vi phạm sẽ được engine nhắc sửa và gọi lại.
 */
export function validateSitemapFormat(text: string): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [{ message: "Câu trả lời trống — phải liệt kê các trang." }];
  }

  if (/https?:\/\//i.test(text)) {
    issues.push({
      message:
        "Có dòng dùng địa chỉ đầy đủ https://… — chỉ được ghi đường dẫn tương đối bắt đầu bằng dấu /.",
    });
  }

  const numbered = lines.filter((line) => /^\s*(?:\d+[.)]|[-*•])\s+/.test(line));
  if (numbered.length > 0) {
    issues.push({
      message: `Có ${numbered.length} dòng bị đánh số hoặc gạch đầu dòng — bỏ hết, chỉ dùng dấu cách để thể hiện cấp bậc.`,
    });
  }

  // Ít nhất một nửa số dòng phải có phần "| /duong-dan"; mục cha thuần nhóm
  // được phép không có nên không đòi hỏi 100%.
  const withSlug = lines.filter((line) => /\|\s*\/\S*/.test(line));
  if (withSlug.length * 2 < lines.length) {
    issues.push({
      message:
        'Thiếu đường dẫn: mỗi trang phải viết đúng mẫu "Tên trang | /duong-dan" (chỉ mục nhóm không phải trang thật mới được bỏ trống).',
    });
  }

  // Thụt lề phải là bội của 2 dấu cách.
  const badIndent = lines.filter((line) => {
    const indent = line.match(/^ */)?.[0].length ?? 0;
    return indent % 2 !== 0;
  });
  if (badIndent.length > 0) {
    issues.push({
      message: `Có ${badIndent.length} dòng thụt lề lẻ — mỗi cấp phải thụt đúng 2 dấu cách.`,
    });
  }

  return issues;
}

// Prompt Module 1 chạy app-native — giữ đúng nội dung đã chứng minh trong
// blueprint Make Neon Canary (v1.4): một bước tạo sitemap đầy đủ, một bước
// chọn tối đa 30 nhãn. Thay IML bằng template TypeScript.

export const sitemapDraftSystemPrompt =
  "Bạn là chuyên gia kiến trúc thông tin và SEO. Chỉ trả về sitemap thực tế, không giải thích quy trình và không đánh số danh sách.";

export const sitemapSelectionSystemPrompt =
  "Bạn là chuyên gia SEO. Chỉ trả về các nhãn sitemap đã chọn, không giải thích và không đánh số.";

export function buildSitemapDraftPrompt(site: SitemapPilotSiteInput): string {
  const competitors =
    site.competitorUrls.length > 0
      ? site.competitorUrls.join("\n")
      : "Không có website đối thủ được cung cấp; hãy suy luận cấu trúc theo chuẩn ngành.";
  return [
    `Hãy tạo sitemap chi tiết bằng ${site.language} cho website sau.`,
    "",
    `Tên tham chiếu: ${site.reference}`,
    `Địa điểm/thị trường: ${site.location}`,
    `Từ khóa chính: ${site.primaryKeyword}`,
    `Giọng điệu: ${site.tone}`,
    `Mô tả website và khách hàng mục tiêu: ${site.websiteBrief}`,
    "",
    "Các URL đối thủ để phân tích:",
    competitors,
    "",
    "Phân tích cấu trúc, danh mục, danh mục con, dịch vụ/sản phẩm, nội dung nguồn lực, hỗ trợ/liên hệ và trang pháp lý. Tích hợp các điểm chung quan trọng và các điểm khác biệt hữu ích.",
    "",
    // Khung mục bắt buộc — lấy lại từ blueprint RIS 3.5 gốc (bản Neon Canary
    // v1.2 đã lược bỏ nên model trả về tuỳ hứng).
    "Sitemap phải bao gồm đủ các nhóm sau (đặt tên nhóm bằng ngôn ngữ yêu cầu):",
    "- Trang chủ: tổng quan dịch vụ/giá trị chính.",
    "- Giới thiệu: thông tin doanh nghiệp, đội ngũ, lịch sử, giá trị.",
    "- Dịch vụ/Sản phẩm: liệt kê chi tiết từng dịch vụ hoặc sản phẩm.",
    "- Điểm đặc biệt: những gì riêng có, khác biệt so với đối thủ.",
    "- Tài nguyên/Blog: nội dung hướng dẫn, kiến thức (nếu phù hợp).",
    "- Hỗ trợ/Liên hệ: cách khách hàng liên hệ và được hỗ trợ.",
    "- Pháp lý: chính sách bảo mật, điều khoản sử dụng.",
    "",
    "ĐỊNH DẠNG BẮT BUỘC — mỗi dòng một trang, theo đúng mẫu:",
    "Tên trang dễ hiểu | /duong-dan",
    "",
    "Quy tắc định dạng:",
    "- Tên trang viết bằng ngôn ngữ yêu cầu, có dấu, dễ hiểu với người không rành kỹ thuật.",
    "- Đường dẫn bắt đầu bằng dấu / , chỉ dùng chữ thường không dấu và dấu gạch ngang.",
    "- TUYỆT ĐỐI KHÔNG viết địa chỉ đầy đủ kiểu https://… — chỉ ghi đường dẫn tương đối.",
    "- Trang con thụt vào ĐÚNG 2 dấu cách so với trang cha (cháu thụt 4 dấu cách).",
    "- Không đánh số, không gạch đầu dòng, không giải thích. Chỉ trả về sitemap.",
    "",
    "Ví dụ đúng:",
    "Giới thiệu | /gioi-thieu",
    "Dịch vụ | /dich-vu",
    "  Thiết kế website | /dich-vu/thiet-ke-website",
  ].join("\n");
}

export function buildSitemapSelectionPrompt(draftSitemap: string): string {
  return [
    "Từ sitemap dưới đây, hãy chọn tối đa 30 trang quan trọng và phổ biến nhất, đồng thời giữ các trang cần thiết để website có cấu trúc đầy đủ và hữu ích.",
    "",
    "GIỮ NGUYÊN định dạng mỗi dòng: Tên trang | /duong-dan",
    "Giữ nguyên tên và đường dẫn đã có, không viết lại, không đổi sang địa chỉ đầy đủ https://…",
    "Chỉ trả về danh sách, mỗi trang một dòng, không đánh số, không giải thích.",
    "",
    draftSitemap,
  ].join("\n");
}

// Bước 3: tổ chức danh sách nhãn (phẳng) thành CÂY PHÂN CẤP có thụt lề, để vẽ
// sơ đồ cây/mindmap và sửa theo cấu trúc. Parser đọc thụt lề (2 space = 1 cấp).
export const sitemapOrganizeSystemPrompt =
  "Bạn là chuyên gia kiến trúc thông tin website. Chỉ trả về sitemap dạng thụt lề, không giải thích, không đánh số, không gạch đầu dòng.";

export function buildSitemapOrganizePrompt(selectedSitemap: string): string {
  return [
    "Tổ chức danh sách trang dưới đây thành CÂY PHÂN CẤP rõ ràng, dễ hiểu:",
    "- Các trang đơn lẻ quan trọng đặt ở cấp cao nhất (không thụt lề).",
    "- Gom các trang liên quan dưới một MỤC CHA phù hợp; mỗi trang con thụt vào ĐÚNG 2 dấu cách so với mục cha (cháu thụt 4 dấu cách).",
    "- Tối đa 3 cấp. GIỮ NGUYÊN tên và đường dẫn của các trang có sẵn, chỉ nhóm lại; được phép thêm mục cha bao trùm nếu hợp lý (ví dụ: Khóa học, Tin tức & sự kiện, Tài nguyên, Chính sách & điều khoản).",
    "",
    "ĐỊNH DẠNG BẮT BUỘC mỗi dòng: Tên trang | /duong-dan",
    "- Mục cha do bạn thêm mà không phải một trang thật thì ghi tên không kèm | /duong-dan.",
    "- TUYỆT ĐỐI KHÔNG dùng địa chỉ đầy đủ https://… — chỉ đường dẫn tương đối bắt đầu bằng /.",
    "- Chỉ dùng dấu cách để thể hiện cấp bậc. Không đánh số, không gạch đầu dòng, không giải thích.",
    "",
    "Ví dụ đúng:",
    "Giới thiệu | /gioi-thieu",
    "Khóa học",
    "  Lập trình cơ bản | /khoa-hoc/lap-trinh-co-ban",
    "  Lập trình web | /khoa-hoc/lap-trinh-web",
    "",
    "Danh sách trang:",
    selectedSitemap,
  ].join("\n");
}
