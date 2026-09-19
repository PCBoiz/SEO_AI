/**
 * HÀNH ĐỘNG TRONG TRÒ CHUYỆN — model ra lệnh, Antigravity làm.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO LÀ MỘT KHỐI CHỮ, KHÔNG PHẢI "FUNCTION CALLING"
 *
 * Chủ dự án (18/09/2026): "cải tiến để các mô hình cũng có thể làm được luôn
 * trong phần trò chuyện" — không chỉ chỉ màn để bấm. Trò chuyện chạy bằng
 * khoá của người dùng ở BỐN nhà cung cấp; mỗi nhà một API gọi hàm khác nhau
 * (Anthropic tools, OpenAI tools, Gemini functionDeclarations, DeepSeek theo
 * OpenAI). Nối cả bốn là bốn bản hiện thực và bốn chỗ hỏng. Một khối chữ có
 * rào ```antigravity ở cuối câu trả lời thì model nào cũng viết được, và
 * kiểm được bằng một hàm thuần ở đây.
 *
 * Lưu NGUYÊN câu trả lời (kể cả khối) vào cơ sở dữ liệu — không thêm cột,
 * không migration. Trình duyệt bóc khối ra khi vẽ: phần chữ thành tin nhắn,
 * khối thành thẻ dựng web. Tin cũ mở lại vẫn ra thẻ, nhưng KHÔNG tự chạy lại
 * (chỉ tin vừa nhận mới tự chạy — xem `dung-web-trong-chat.tsx`).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const RAO_HANH_DONG = "antigravity";

export interface HanhDongDungWeb {
  hanhDong: "dung-website";
  /** Tên doanh nghiệp/thương hiệu — thành tên website và tên dự án. */
  tenWebsite: string;
  /** Website để làm gì, cho ai, muốn khách làm gì — gộp mọi điều người dùng đã nói. */
  moTa: string;
  /** Ngành, chữ thường ("bất động sản", "phòng khám"…). */
  nganh?: string;
  /** Gợi ý cảm giác thiết kế ("xanh rêu trầm, ít màu, chữ to"). */
  goiY?: string;
  /** Mã màu thương hiệu đã có (#1a6b4a). */
  mauThuongHieu?: string;
  /** CHỈ con số, tên riêng, địa chỉ người dùng đã cho. */
  suThat?: string;
  /** Điều người dùng muốn đổi ở bản đã dựng. */
  yeuCauSua?: string;
  /**
   * `chu`: chỉ viết lại chữ (giữ trang/khối/màu) — rẻ, một lượt gọi.
   * `tat-ca`: dựng lại từ ý định. Không ghi → suy: có yêu cầu sửa thì `chu`.
   */
  phamVi?: "chu" | "tat-ca";
}

export interface KetQuaTach {
  /** Câu trả lời đã bỏ khối lệnh, cắt khoảng trắng thừa. */
  chu: string;
  hanhDong: HanhDongDungWeb | null;
  /** Có khối mà không đọc được (JSON hỏng, thiếu trường) — để nói với người dùng. */
  loi?: string;
}

const GIOI_HAN = { tenWebsite: 100, moTa: 3_000, nganh: 120, goiY: 300, mauThuongHieu: 30, suThat: 6_000, yeuCauSua: 600 } as const;

function chuoi(v: unknown, toiDa: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, toiDa) : undefined;
}

/** Đọc một khối JSON thành hành động; sai dạng → `null`. Không dùng zod: tệp này chạy cả ở trình duyệt. */
export function docHanhDong(json: string): HanhDongDungWeb | null {
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.hanhDong !== "dung-website") return null;
  const tenWebsite = chuoi(o.tenWebsite, GIOI_HAN.tenWebsite);
  const moTa = chuoi(o.moTa, GIOI_HAN.moTa);
  if (!tenWebsite || !moTa || moTa.length < 10) return null;
  const phamVi = o.phamVi === "chu" || o.phamVi === "tat-ca" ? o.phamVi : undefined;
  const mau = chuoi(o.mauThuongHieu, GIOI_HAN.mauThuongHieu);
  return {
    hanhDong: "dung-website",
    tenWebsite,
    moTa,
    nganh: chuoi(o.nganh, GIOI_HAN.nganh),
    goiY: chuoi(o.goiY, GIOI_HAN.goiY),
    mauThuongHieu: mau && /^#[0-9a-fA-F]{3,8}$/.test(mau) ? mau : undefined,
    suThat: chuoi(o.suThat, GIOI_HAN.suThat),
    yeuCauSua: chuoi(o.yeuCauSua, GIOI_HAN.yeuCauSua),
    phamVi,
  };
}

const KHOI = new RegExp("```" + RAO_HANH_DONG + "[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n?```", "g");

/**
 * Tách khối ```antigravity … ``` khỏi câu trả lời. Nhiều khối → lấy khối
 * CUỐI (model hay viết nháp rồi viết lại); mọi khối đều bị bỏ khỏi phần chữ.
 */
export function tachHanhDong(noiDung: string): KetQuaTach {
  let hanhDong: HanhDongDungWeb | null = null;
  let coKhoi = false;
  const chu = noiDung
    .replace(KHOI, (_, than: string) => {
      coKhoi = true;
      const doc = docHanhDong(than.trim());
      if (doc) hanhDong = doc;
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (coKhoi && !hanhDong) {
    return { chu, hanhDong: null, loi: "Trợ lý định dựng website nhưng khối lệnh không đọc được — bảo nó thử lại." };
  }
  return { chu, hanhDong };
}

/** Phạm vi chạy thật sự, sau khi suy mặc định. */
export function phamViChay(h: HanhDongDungWeb, daCoBanDung: boolean): "chu" | "tat-ca" {
  if (h.phamVi) return h.phamVi === "chu" && !daCoBanDung ? "tat-ca" : h.phamVi;
  return h.yeuCauSua && daCoBanDung ? "chu" : "tat-ca";
}
