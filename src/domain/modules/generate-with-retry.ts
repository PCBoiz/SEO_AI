// Tự kiểm tra định dạng đầu ra và gọi lại MỘT lần nếu sai.
//
// Vì sao cần: cùng một prompt nhưng mỗi model (DeepSeek flash/pro, GPT, Gemini,
// Claude) tuân thủ định dạng ở mức khác nhau. Thay vì viết prompt riêng cho từng
// model, ta ràng buộc bằng một hợp đồng đầu ra kiểm tra được ở code — model nào
// vi phạm thì được nhắc lại đúng chỗ sai. Nhờ vậy chất lượng ổn định trên MỌI
// provider mà không phải chỉnh prompt cho từng bên.
//
// Chỉ gọi lại đúng một lần: đủ để sửa lỗi định dạng phổ biến mà không nhân đôi
// chi phí trong trường hợp model liên tục trả sai.

export interface FormatIssue {
  /** Mô tả lỗi bằng tiếng Việt, dùng luôn làm lời nhắc cho model. */
  message: string;
}

export type FormatValidator = (text: string) => FormatIssue[];

export interface RawGenerate {
  (request: {
    systemPrompt?: string;
    prompt: string;
    maxOutputTokens?: number;
  }): Promise<string>;
}

export interface GenerateWithRetryOptions {
  systemPrompt?: string;
  prompt: string;
  maxOutputTokens?: number;
  validate?: FormatValidator;
  /** Gọi khi phải thử lại — dùng để ghi log/đo lường. */
  onRetry?: (issues: FormatIssue[]) => void;
}

export async function generateWithRetry(
  raw: RawGenerate,
  options: GenerateWithRetryOptions,
): Promise<string> {
  const first = await raw({
    systemPrompt: options.systemPrompt,
    prompt: options.prompt,
    maxOutputTokens: options.maxOutputTokens,
  });

  if (!options.validate) return first;
  const issues = options.validate(first);
  if (issues.length === 0) return first;

  options.onRetry?.(issues);

  const second = await raw({
    systemPrompt: options.systemPrompt,
    prompt: buildCorrectionPrompt(options.prompt, first, issues),
    maxOutputTokens: options.maxOutputTokens,
  });

  // Nếu lần hai vẫn sai thì trả về bản ít lỗi hơn — vẫn tốt hơn là ném lỗi và
  // bắt người dùng chạy lại từ đầu (đã mất tiền cho cả hai lượt gọi).
  return options.validate(second).length <= issues.length ? second : first;
}

function buildCorrectionPrompt(
  originalPrompt: string,
  previousAnswer: string,
  issues: FormatIssue[],
): string {
  return [
    "Câu trả lời trước của bạn SAI ĐỊNH DẠNG. Hãy viết lại cho đúng.",
    "",
    "Các lỗi cần sửa:",
    ...issues.map((issue) => `- ${issue.message}`),
    "",
    "Giữ nguyên nội dung và ý tưởng đã có, CHỈ sửa lại cho đúng định dạng.",
    "",
    "Câu trả lời trước:",
    previousAnswer,
    "",
    "--- Yêu cầu gốc ---",
    originalPrompt,
  ].join("\n");
}

/* ----------------------- Bộ kiểm tra dùng chung ----------------------- */

/** Đầu ra không được chứa địa chỉ tuyệt đối (chỉ dùng đường dẫn tương đối). */
export function noAbsoluteUrls(text: string): FormatIssue[] {
  return /https?:\/\//i.test(text)
    ? [
        {
          message:
            "Không được dùng địa chỉ đầy đủ dạng https://… — chỉ ghi đường dẫn tương đối bắt đầu bằng /.",
        },
      ]
    : [];
}

/** Không được đánh số hay gạch đầu dòng khi yêu cầu danh sách thuần. */
export function noListMarkers(text: string): FormatIssue[] {
  const marked = text
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:\d+[.)]|[-*•])\s+/.test(line));
  return marked.length > 0
    ? [
        {
          message: `Không đánh số và không gạch đầu dòng (có ${marked.length} dòng vi phạm).`,
        },
      ]
    : [];
}

/**
 * Không được mở đầu bằng lời dẫn ("Dưới đây là bài viết…"). Chỉ xét dòng đầu
 * tiên có nội dung — câu tương tự nằm giữa bài là nội dung hợp lệ.
 */
export function noPreamble(text: string): FormatIssue[] {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return [];
  return /^(chắc chắn|dưới đây là|đây là|tôi sẽ|tôi đã|hy vọng|sau đây là)/i.test(
    firstLine,
  )
    ? [
        {
          message:
            'Bỏ câu dẫn nhập ở đầu ("Dưới đây là…", "Đây là…") — vào thẳng nội dung ngay từ dòng đầu tiên.',
        },
      ]
    : [];
}

/** Phải mở đầu bằng một heading Markdown (dùng cho thân bài, nội dung dài). */
export function startsWithHeading(text: string): FormatIssue[] {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return [];
  return /^#{1,3}\s+\S/.test(firstLine)
    ? []
    : [
        {
          message:
            "Dòng đầu tiên phải là một heading dạng '## Tên mục' — không viết bất kỳ câu nào trước heading đầu tiên.",
        },
      ];
}

/**
 * Đầu ra phải là một khối JSON-LD DÙNG ĐƯỢC NGAY.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHÉP KIỂM NÀY QUAN TRỌNG HƠN CÁC PHÉP KIỂM ĐỊNH DẠNG KHÁC
 *
 * Mọi bộ kiểm khác ở trên canh văn xuôi: thừa một câu dẫn nhập thì người đọc
 * xoá đi, mất mười giây. Đầu ra của Module 11 thì khác — nó được dán thẳng vào
 * `<head>` của một trang thật.
 *
 * Một dấu phẩy thừa làm cả khối JSON hỏng. Trình duyệt KHÔNG báo gì (script
 * ld+json không chạy, chỉ nằm đó), Google lặng lẽ bỏ qua, và trang mất toàn bộ
 * dữ liệu có cấu trúc trong khi mọi thứ nhìn vẫn bình thường. Không ai phát
 * hiện bằng cách dùng thử.
 *
 * `JSON.parse` bắt đúng kiểu hỏng đó, tốn 0 đồng và 0 mili-giây — trong khi
 * Module 11 trước đây KHÔNG khai `validate:` gì cả.
 *
 * Cố ý KHÔNG kiểm sâu schema.org (thiếu `author`, `datePublished`…): việc đó
 * cần một bộ kiểm đầy đủ, và một cảnh báo sai sẽ khiến engine gọi lại model
 * lần hai một cách vô ích — mà mỗi lần gọi là tiền thật.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function validJsonLd(text: string): FormatIssue[] {
  const issues: FormatIssue[] = [];

  // Rào markdown ```…``` là lỗi thật ở đây, không phải chuyện thẩm mỹ: người
  // dùng chép cả khối vào `<head>` thì ba dấu huyền đi theo và làm hỏng HTML.
  if (/```/.test(text)) {
    issues.push({
      message:
        "Bỏ rào mã markdown (```): chỉ trả về đúng thẻ <script> và nội dung bên trong.",
    });
  }

  const khop = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(
    text,
  );
  if (!khop) {
    issues.push({
      message:
        'Phải bọc trong <script type="application/ld+json"> … </script> — hiện không tìm thấy thẻ này.',
    });
    return issues;
  }

  const than = khop[1].trim();
  let duLieu: unknown;
  try {
    duLieu = JSON.parse(than);
  } catch (loi) {
    issues.push({
      message: `JSON bên trong thẻ script không hợp lệ (${
        loi instanceof Error ? loi.message : "lỗi cú pháp"
      }). Sửa lại cho đúng cú pháp JSON — không dấu phẩy thừa, không chú thích, dùng dấu nháy kép.`,
    });
    return issues;
  }

  // `@graph` và mảng ở gốc đều là cách hợp lệ để gộp nhiều schema — chấp nhận
  // cả ba hình dạng thay vì ép một kiểu.
  const cacKhoi: unknown[] = Array.isArray(duLieu)
    ? duLieu
    : isRecord(duLieu) && Array.isArray(duLieu["@graph"])
      ? (duLieu["@graph"] as unknown[])
      : [duLieu];

  if (cacKhoi.some((k) => !isRecord(k) || typeof k["@type"] !== "string")) {
    issues.push({
      message: 'Mỗi khối schema phải có "@type" là chuỗi.',
    });
  }
  const coContext =
    (isRecord(duLieu) && "@context" in duLieu) ||
    cacKhoi.some((k) => isRecord(k) && "@context" in k);
  if (!coContext) {
    issues.push({
      message: 'Thiếu "@context": "https://schema.org".',
    });
  }

  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Ghép nhiều bộ kiểm tra thành một. */
export function combineValidators(
  ...validators: FormatValidator[]
): FormatValidator {
  return (text: string) =>
    validators.flatMap((validator) => validator(text));
}
