import type { z } from "zod";
import { ValidationError } from "@/domain/shared/app-error";
import type { ModuleJobBaseInput } from "@/domain/modules/module-job";
import type { FormatValidator } from "@/domain/modules/generate-with-retry";

// Hàm gọi model do engine cung cấp cho module (đã gắn sẵn key BYOK + model của
// user). Module chỉ cần mô tả prompt, không quan tâm provider nào.
export interface ModuleGenerate {
  (request: {
    systemPrompt?: string;
    prompt: string;
    maxOutputTokens?: number;
    // Hợp đồng định dạng đầu ra. Sai thì engine tự nhắc model sửa và gọi lại
    // đúng một lần — giữ chất lượng đồng đều trên mọi provider/model mà không
    // phải viết prompt riêng cho từng bên.
    validate?: FormatValidator;
  }): Promise<string>;
}

/**
 * Ảnh trong thư mục Drive của dự án — nhìn từ phía module (không token, không
 * mạng: engine bơm hai hàm đã gắn sẵn token của người nối thư mục).
 */
export interface AnhTrongDrive {
  id: string;
  ten: string;
  /** "" = thư mục gốc. */
  thuMucCon: string;
  rong: number | null;
  cao: number | null;
  /** Mô tả từ tệp `danh-sach-anh.csv` trong thư mục, nếu chủ dự án có ghi. */
  moTa?: string;
}

export interface DriveChoModule {
  lietKe(): Promise<AnhTrongDrive[]>;
  /** Tải một ảnh đã thu nhỏ cho web (≤1600px, WebP). */
  tai(id: string): Promise<{ bytes: Buffer; mime: string; ten: string }>;
}

export interface ModuleExecutionContext<TInput> {
  input: TInput;
  generate: ModuleGenerate;
  /**
   * Thư mục ảnh Drive của dự án — CHỈ có khi module khai `needsDrive` VÀ dự án
   * đã nối thư mục VÀ token Google của người nối còn dùng được. Thiếu bất kỳ
   * điều nào thì `undefined`; module tự quyết (thường là "đăng không ảnh").
   */
  drive?: DriveChoModule;
  // Đầu ra THÀNH CÔNG mới nhất của các module khác trong cùng dự án (đã ghép
  // thành text), keyed theo moduleKey. Engine tự nạp từ Neon — module dùng để nối
  // luồng mà không cần người dùng dán tay.
  upstream: Record<string, string>;
  // Thông tin tích hợp bên ngoài do engine giải mã ở server và bơm vào (chỉ khi
  // module khai báo needsIntegrations). Không bao giờ ghi vào job/log.
  integrations: {
    wordpress?: { url: string; username: string; password: string };
    facebook?: { config: Record<string, string>; secret: string };
    zalo?: { config: Record<string, string>; secret: string };
    google_business?: { config: Record<string, string>; secret: string };
    custom_site?: { config: Record<string, string>; secret: string };
  };
}

// Khai báo trường form để trang runner generic tự render (không cần trang riêng
// cho từng module). Shell tự lo projectId + AI provider + xác nhận chi phí; module
// chỉ khai báo các trường payload của nó.
export type ModuleFieldType = "text" | "textarea" | "select";

export interface ModuleFormField {
  key: string;
  label: string;
  type: ModuleFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
  // Điền sẵn từ dự án đang chọn (ví dụ ngôn ngữ, thị trường).
  prefillFromProject?: "language" | "location" | "tone" | "name" | "website";
  // Textarea nhiều dòng → mảng string (mỗi dòng một phần tử) trong payload.
  asLines?: boolean;
  rows?: number;
}

// Khối kết quả text để runner hiển thị: đọc output[key] và render thành panel.
export interface ModuleOutputBlock {
  key: string;
  label: string;
}

// Một module = khai báo prompt + schema in/out + hàm execute. after()+polling,
// BYOK, timeout, xử lý lỗi đều do engine lo. Đây là toàn bộ phần một module cần
// tự định nghĩa — nền tảng để nhân rộng cho 9+ module còn lại.
export interface ModuleDefinition<
  TInput extends ModuleJobBaseInput = ModuleJobBaseInput,
  TOutput extends Record<string, unknown> = Record<string, unknown>,
> {
  key: string;
  moduleNumber: number;
  title: string;
  description: string;
  category: "Research" | "SEO" | "Content" | "Publishing" | "Video";
  /**
   * Ẩn khỏi danh mục, bộ đếm và ô chọn module — nhưng vẫn đăng ký, vẫn chạy
   * được qua `getModuleDefinition`. Dùng cho module là "một cái nút" chứ không
   * phải "một việc" (ví dụ AI viết hộ ô nhập).
   */
  an?: boolean;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  // Metadata cho trang runner generic (serializable — không chứa Zod/hàm).
  form: ModuleFormField[];
  outputBlocks: ModuleOutputBlock[];
  // Các module mà module này hưởng lợi khi nối luồng (để hiển thị + xếp thứ tự).
  consumes?: string[];
  // false = module không gọi model AI (ví dụ đăng WordPress) — engine bỏ qua
  // yêu cầu API key BYOK.
  requiresAi?: boolean;
  /**
   * Module muốn đọc thư mục ảnh Drive của dự án. TÙY CHỌN: dự án chưa nối thư
   * mục thì `drive` là `undefined`, job vẫn chạy — ảnh là thứ bài có thì tốt,
   * không có thì website tự lấy ảnh theo chuyên mục.
   */
  needsDrive?: boolean;
  // Tích hợp ngoài cần engine chuẩn bị (giải mã credentials server-side).
  // BẮT BUỘC: thiếu là job dừng ngay với thông báo bảo người dùng đi cấu hình.
  needsIntegrations?: Array<
    "wordpress" | "facebook" | "zalo" | "google_business" | "custom_site"
  >;
  // TÙY CHỌN: engine vẫn giải mã và bơm vào nếu dự án đã cấu hình, nhưng THIẾU
  // THÌ KHÔNG DỪNG — module tự quyết định làm gì.
  //
  // Sinh ra cho đúng một tình huống có thật: module đăng sang trang tự code đọc
  // kết nối theo dự án, nhưng vẫn phải rơi về biến môi trường cho những dự án
  // đã chạy bằng cách cũ. Khai vào `needsIntegrations` thì engine chặn job
  // trước khi module kịp chạy nhánh rơi về — nhánh đó thành mã chết, và mọi
  // luồng đang chạy gãy ngay lúc đổi.
  optionalIntegrations?: Array<
    "facebook" | "zalo" | "google_business" | "custom_site"
  >;
  execute(context: ModuleExecutionContext<TInput>): Promise<TOutput>;
}

// Ghép output (Record) thành text có nhãn để làm ngữ cảnh nối luồng.
export function flattenModuleOutput(
  definition: Pick<ModuleDefinition, "outputBlocks">,
  output: Record<string, unknown>,
): string {
  return definition.outputBlocks
    .map((block) => {
      const value = output[block.key];
      return typeof value === "string" && value.length > 0
        ? `## ${block.label}\n${value}`
        : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

// View gọn (không Zod/hàm) để truyền từ server component sang client runner.
export interface ModuleDefinitionView {
  key: string;
  moduleNumber: number;
  title: string;
  description: string;
  category: ModuleDefinition["category"];
  form: ModuleFormField[];
  outputBlocks: ModuleOutputBlock[];
  consumes: string[];
  needsIntegrations: string[];
}

export function toModuleDefinitionView(
  definition: ModuleDefinition,
): ModuleDefinitionView {
  return {
    key: definition.key,
    moduleNumber: definition.moduleNumber,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    form: definition.form,
    outputBlocks: definition.outputBlocks,
    consumes: definition.consumes ?? [],
    // GỘP CẢ TÍCH HỢP TÙY CHỌN VÀO ĐÂY, và đây không phải nhầm lẫn.
    //
    // Trường này chỉ phục vụ MỘT việc ở giao diện: quyết định hiện thẻ "Kết nối
    // nền tảng" nào cho người dùng dán cấu hình. Tích hợp tùy chọn cũng cần
    // được dán — khác biệt "bắt buộc / tùy chọn" nằm ở chỗ engine có DỪNG job
    // khi thiếu hay không, và chỗ đó đọc thẳng từ `definition`, không đọc view
    // này.
    //
    // Không gộp thì mục kết nối trang tự code không bao giờ hiện ra, và người
    // dùng không có đường nào điền — đúng lỗi vừa gặp với module đăng bài: nó
    // tồn tại, đã đăng ký, mà không có cách nào chạm tới từ giao diện.
    needsIntegrations: [
      ...(definition.needsIntegrations ?? []),
      ...(definition.optionalIntegrations ?? []),
    ],
  };
}

const registry = new Map<string, ModuleDefinition>();

export function registerModuleDefinition<
  TInput extends ModuleJobBaseInput,
  TOutput extends Record<string, unknown>,
>(definition: ModuleDefinition<TInput, TOutput>): void {
  registry.set(definition.key, definition as unknown as ModuleDefinition);
}

export function getModuleDefinition(key: string): ModuleDefinition {
  const definition = registry.get(key);
  if (!definition) {
    throw new ValidationError(
      "MODULE_NOT_FOUND",
      "Module không tồn tại hoặc chưa được đăng ký.",
      { moduleKey: key },
    );
  }
  return definition;
}

/**
 * Danh mục module. Mặc định BỎ module ẩn — đây là hàm mọi trang liệt kê, đếm
 * và dựng ô chọn dùng. Chỗ cần dịch tên cho một job bất kỳ (bảng điều khiển,
 * nhận định) truyền `{ keCaAn: true }` để không hiện mã thô.
 */
export function listModuleDefinitions(tuyChon: { keCaAn?: boolean } = {}): ModuleDefinition[] {
  return [...registry.values()]
    .filter((d) => tuyChon.keCaAn || !d.an)
    .sort((a, b) => a.moduleNumber - b.moduleNumber);
}

// Chỉ cần input schema để validate — bỏ qua generic output (tránh vấn đề
// invariance của ZodType ở vị trí đầu ra).
export function parseModuleInput<TInput extends ModuleJobBaseInput>(
  definition: Pick<ModuleDefinition<TInput>, "key" | "inputSchema">,
  value: unknown,
): TInput {
  const result = definition.inputSchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError(
      "INVALID_MODULE_INPUT",
      "Dữ liệu đầu vào của module không hợp lệ.",
      {
        moduleKey: definition.key,
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    );
  }
  return result.data;
}
