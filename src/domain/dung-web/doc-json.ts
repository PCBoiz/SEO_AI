/**
 * Rút JSON ra khỏi câu trả lời của model.
 *
 * Model hay bọc JSON trong ```json … ``` hoặc thêm một câu dẫn trước/sau dù
 * đã dặn không. Lấy khối fence trước; không có thì lấy từ dấu `{` đầu tiên
 * tới dấu `}` cuối cùng. Trả `null` khi không parse được — người gọi tự quyết
 * nhắc lại hay bỏ.
 */
export function docJson(text: string): unknown {
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const ungVien = [fence?.[1], text];
  for (const u of ungVien) {
    if (!u) continue;
    const dau = u.indexOf("{");
    const cuoi = u.lastIndexOf("}");
    if (dau < 0 || cuoi <= dau) continue;
    try {
      return JSON.parse(u.slice(dau, cuoi + 1));
    } catch {
      // thử ứng viên tiếp theo
    }
  }
  return null;
}
