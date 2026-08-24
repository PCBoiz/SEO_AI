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

export interface ModuleExecutionContext<TInput> {
  input: TInput;
  generate: ModuleGenerate;
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
  // Tích hợp ngoài cần engine chuẩn bị (giải mã credentials server-side).
  needsIntegrations?: Array<"wordpress" | "facebook" | "zalo" | "google_business">;
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
    needsIntegrations: definition.needsIntegrations ?? [],
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

export function listModuleDefinitions(): ModuleDefinition[] {
  return [...registry.values()].sort((a, b) => a.moduleNumber - b.moduleNumber);
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
