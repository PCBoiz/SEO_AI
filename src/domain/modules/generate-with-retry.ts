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

/** Ghép nhiều bộ kiểm tra thành một. */
export function combineValidators(
  ...validators: FormatValidator[]
): FormatValidator {
  return (text: string) =>
    validators.flatMap((validator) => validator(text));
}
