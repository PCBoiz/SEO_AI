import { TUONG_PHAN_TOI_THIEU, tuongPhan, type HeThietKe } from "./he-thiet-ke";

/**
 * MÀU ĐỌC ĐƯỢC — lưới cuối trước khi hệ thiết kế thành CSS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Bước Hệ thiết kế (#26) kiểm chữ/nền ≥ 4,5:1 và nhấn/nền ≥ 3:1. Vẫn lọt:
 *
 *   · CHỮ PHỤ (`--phu`) dùng cho mọi đoạn mô tả — bản đầu không kiểm;
 *   · CHỮ TRÊN NÚT CHÍNH là màu nền đặt trên màu nhấn: 3:1 đủ để thấy cái nút,
 *     KHÔNG đủ để đọc chữ cỡ thường (chuẩn 4,5:1);
 *   · MÀU NHẤN LÀM CHỮ (số điện thoại ở chân trang, liên kết) — cùng lỗ đó;
 *   · MÀU CẢNH BÁO (lỗi biểu mẫu) gán cứng #d8845c: đọc tốt trên nền tối,
 *     trên nền trắng chỉ ~2,9:1.
 *
 * Và hợp đồng đọc từ job chỉ qua schema, KHÔNG qua bước kiểm tương phản — một
 * bản thiết kế yếu vẫn tới được bộ sinh mã. Website mẫu nền tối không bắt được
 * lỗi nào ở đây; phần lớn website doanh nghiệp lại là nền sáng.
 *
 * Nguyên tắc sửa: màu đã đạt thì GIỮ NGUYÊN (không đổi thiết kế người ta đã
 * chọn). Chưa đạt thì đẩy dần về phía màu chữ (hoặc về đen/trắng), từng 5%,
 * dừng ngay khi đủ đọc — giữ được sắc màu gốc nhiều nhất có thể.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface MauDocDuoc {
  chu: string;
  phu: string;
  /** Màu nhấn khi dùng làm CHỮ (liên kết, số điện thoại). */
  nhanChu: string;
  /** Màu chữ đặt TRÊN nền màu nhấn (nút chính). */
  chuTrenNhan: string;
  /** Màu chữ cảnh báo (lỗi biểu mẫu). */
  canh: string;
}

/**
 * Chừa sai số: nền nhạt trong CSS trộn bằng `color-mix(in oklab, …)`, ở đây
 * trộn sRGB — lệch vài phần trăm độ sáng. 0,1 là đủ để bản CSS thật vẫn ≥ 4,5.
 */
const DAT = TUONG_PHAN_TOI_THIEU + 0.1;
const CANH_GOC = "#d8845c";

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

/** Trộn `a` về phía `b` một tỉ lệ `t` (0 = a, 1 = b), trong sRGB. */
export function tronMau(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

const docDuocTren = (mau: string, cacNen: readonly string[]) => cacNen.every((n) => tuongPhan(mau, n) >= DAT);

/** Đẩy `mau` dần về `huong` (từng 5%) tới khi đọc được trên mọi nền cho trước. */
function dayChoDat(mau: string, huong: string, cacNen: readonly string[]): string {
  for (let i = 0; i <= 20; i += 1) {
    const thu = tronMau(mau, huong, i / 20);
    if (docDuocTren(thu, cacNen)) return thu;
  }
  return huong;
}

export function mauDocDuoc(tk: Pick<HeThietKe, "mau">): MauDocDuoc {
  const { nen, chu, nhan, phu } = tk.mau;
  // Hai nền chữ thật sự nằm trên: nền chính và nền nhạt (khớp `--nen-nhe`).
  const cacNen = [nen, tronMau(nen, chu, 0.05)];
  // Cực theo độ sáng nền: nền tối → trắng, nền sáng → gần đen.
  const cuc = tuongPhan("#ffffff", nen) >= tuongPhan("#111111", nen) ? "#ffffff" : "#111111";

  const chuDat = docDuocTren(chu, cacNen) ? chu : dayChoDat(chu, cuc, cacNen);
  const phuDat = docDuocTren(phu, cacNen) ? phu : dayChoDat(phu, chuDat, cacNen);
  const nhanChu = docDuocTren(nhan, cacNen) ? nhan : dayChoDat(nhan, chuDat, cacNen);

  const ungVien = [nen, chuDat, "#ffffff", "#111111"];
  const chuTrenNhan =
    ungVien.find((m) => tuongPhan(m, nhan) >= DAT) ??
    ungVien.reduce((tot, m) => (tuongPhan(m, nhan) > tuongPhan(tot, nhan) ? m : tot));

  // Cảnh báo giữ sắc cam: nền tối thì sáng dần lên, nền sáng thì trầm dần về nâu.
  const canh = docDuocTren(CANH_GOC, cacNen) ? CANH_GOC : dayChoDat(CANH_GOC, cuc === "#ffffff" ? "#ffffff" : "#5c1d06", cacNen);

  return { chu: chuDat, phu: phuDat, nhanChu, chuTrenNhan, canh };
}
