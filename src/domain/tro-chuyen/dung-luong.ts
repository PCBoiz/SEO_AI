/**
 * LƯỢNG DÙNG CỦA MỘT CUỘC TRÒ CHUYỆN — phần thuần, không mạng, không kho.
 *
 * ⚠️ CỐ Ý KHÔNG QUY RA TIỀN. Mỗi nhà cung cấp một bảng giá, giá đổi theo thời
 * gian, và đơn giá còn khác nhau giữa token vào và token ra. Hiện một con số
 * tiền đoán bừa còn tệ hơn không hiện gì: chủ dự án sẽ tin nó khi tính giá gói
 * tháng. Ở đây chỉ hiện SỐ ĐO THẬT do nhà cung cấp trả về.
 *
 * Nhà cung cấp nào không trả về token thì để trống, KHÔNG hiện 0 — "0 token"
 * là một lời nói dối nhỏ nhưng nằm đúng chỗ người ta dựa vào để quyết định.
 */

/** Có số thật để hiện không — null, undefined, NaN đều là "không đo được". */
function laSo(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

export interface DungLuongTin {
  provider: string | null;
  model: string | null;
  /** `undefined` cũng hợp lệ: dữ liệu cũ hoặc phản hồi thiếu trường. */
  inputTokens?: number | null;
  outputTokens?: number | null;
  durationMs?: number | null;
}

export interface TongDungLuong {
  /** Số tin của trợ lý có kèm số token — để nói "đo được mấy lượt". */
  soLuotCoSo: number;
  vao: number;
  ra: number;
  tong: number;
}

/** "820" · "1,2k" · "12,3k" · "1,05tr" — gọn để nằm vừa một dòng phụ. */
export function dinhDangToken(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1_000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1_000;
    return `${k.toFixed(k < 10 ? 1 : 0).replace(".", ",")}k`;
  }
  return `${(n / 1_000_000).toFixed(2).replace(".", ",")}tr`;
}

/** "0,8 giây" · "4,3 giây" · "1 phút 12 giây". */
export function dinhDangThoiGian(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1).replace(".", ",")} giây`;
  const phut = Math.floor(ms / 60_000);
  const giay = Math.round((ms % 60_000) / 1_000);
  return giay === 0 ? `${phut} phút` : `${phut} phút ${giay} giây`;
}

/**
 * Dòng phụ dưới một câu trả lời của trợ lý: model → token → thời gian.
 * Thiếu phần nào bỏ phần đó; không có gì thì trả chuỗi rỗng (đừng vẽ dòng trống).
 *
 * `tenNhaCungCap` do lớp gọi truyền vào (giao diện có bảng tên riêng), để lõi
 * này không phải biết "deepseek" hiện ra chữ gì.
 */
export function dongDungLuong(t: DungLuongTin, tenNhaCungCap?: string): string {
  const phan: string[] = [];
  const ten = tenNhaCungCap ?? t.provider ?? null;
  if (ten && t.model) phan.push(`${ten} · ${t.model}`);
  else if (ten) phan.push(ten);
  else if (t.model) phan.push(t.model);

  // `laSo` chứ không phải `!== null`: dữ liệu về từ JSON có thể THIẾU HẲN
  // trường (undefined). Kiểm bằng `!== null` thì undefined lọt qua và màn hiện
  // "0 token (vào 0 · ra 0)" — đúng cái lời nói dối tệp này nói sẽ tránh.
  const coVao = laSo(t.inputTokens);
  const coRa = laSo(t.outputTokens);
  if (coVao || coRa) {
    const tong = (coVao ? t.inputTokens! : 0) + (coRa ? t.outputTokens! : 0);
    const chiTiet =
      coVao && coRa ? ` (vào ${dinhDangToken(t.inputTokens!)} · ra ${dinhDangToken(t.outputTokens!)})` : "";
    phan.push(`${dinhDangToken(tong)} token${chiTiet}`);
  }
  if (laSo(t.durationMs)) phan.push(dinhDangThoiGian(t.durationMs!));
  return phan.join(" · ");
}

/** Cộng token của cả cuộc. Chỉ tính những tin CÓ số — không coi thiếu là 0. */
export function congDungLuong(tin: readonly DungLuongTin[]): TongDungLuong {
  let vao = 0;
  let ra = 0;
  let soLuotCoSo = 0;
  for (const t of tin) {
    if (!laSo(t.inputTokens) && !laSo(t.outputTokens)) continue;
    soLuotCoSo += 1;
    vao += laSo(t.inputTokens) ? t.inputTokens! : 0;
    ra += laSo(t.outputTokens) ? t.outputTokens! : 0;
  }
  return { soLuotCoSo, vao, ra, tong: vao + ra };
}

/**
 * Câu tổng cho đầu khung trò chuyện. `null` khi chưa đo được lượt nào — lúc đó
 * giao diện không hiện gì, thay vì hiện "0 token".
 */
export function cauTongDungLuong(tin: readonly DungLuongTin[]): string | null {
  const t = congDungLuong(tin);
  if (t.soLuotCoSo === 0) return null;
  return `Cuộc này đã dùng ${dinhDangToken(t.tong)} token (vào ${dinhDangToken(t.vao)} · ra ${dinhDangToken(t.ra)}) qua ${t.soLuotCoSo} lượt hỏi.`;
}
