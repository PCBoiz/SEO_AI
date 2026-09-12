import { luotDangDo, nenBatDauLuotMoi, type CauHinhLich, type LuotLich } from "./lich-dang";

/**
 * LƯỚI AN TOÀN: mở trang cũng là một nhịp gõ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN, VÀ VÌ SAO PHẢI HẸP
 *
 * Lịch đăng cần một nhịp gõ từ ngoài mỗi 10 phút (crontab trên VPS). Chủ dự án
 * đã lưu thẻ lịch từ 12/09 nhưng **chưa dán crontab** — nghĩa là suốt những
 * ngày đó không có bài nào tự chạy, và cái duy nhất báo cho chị biết là một
 * dòng chữ nhỏ trên thẻ.
 *
 * Trình duyệt của chính người vận hành là một nhịp gõ có sẵn: mỗi sáng mở
 * Antigravity xem "hôm nay máy làm gì" là một lần gõ. Một nhịp là đủ, vì các
 * bước sau tự nối nhau bằng HTTP (`tuGoTiep`).
 *
 * ⚠️ NHƯNG PHẢI HẸP, vì nó TIÊU TIỀN của chủ dự án (mỗi lượt ~8 lần gọi AI).
 * Chỉ gõ khi CẢ BỐN điều kiện đúng:
 *
 *   1. lịch đang BẬT — người dùng đã chủ động muốn chạy;
 *   2. **chưa từng có nhịp gõ từ VPS** — có crontab rồi thì để crontab lo,
 *      không chen vào (tránh hai nguồn cùng gõ);
 *   3. đã tới giờ hẹn mà hôm nay chưa có lượt nào, HOẶC có lượt đang dở mà
 *      không ai gõ quá 12 phút (bước bị ngắt, cần cứu);
 *   4. chính trang này chưa gõ trong 10 phút gần đây (chốt ở phía trình duyệt).
 *
 * Và luôn NÓI RA trên giao diện khi nó tự chạy. Một hệ thống tiêu tiền của
 * người dùng mà im lặng thì lần sau họ không dám mở nữa.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type LyDoGoTuTrang = "bat-dau-luot-hom-nay" | "cuu-luot-dung-im";

export interface DauVaoLuoi {
  cauHinh: Pick<CauHinhLich, "bat" | "gioChay"> | null;
  luot: readonly LuotLich[];
  /** Lần gõ gần nhất từ BẤT KỲ nguồn nào. */
  lanGoCuoi: string | null;
  /** Lần gõ gần nhất từ VPS. Có giá trị = đã có crontab, đừng chen vào. */
  lanGoVpsCuoi: string | null;
}

/** Quá ngần này phút không ai gõ mà lượt vẫn dở → coi là bị ngắt. */
export const PHUT_COI_LA_DUNG = 12;

export function nenGoTuTrang(tt: DauVaoLuoi, bayGio: Date): LyDoGoTuTrang | null {
  if (!tt.cauHinh?.bat) return null;
  // Đã có crontab thì đó là nguồn chính — trang không chen vào.
  if (tt.lanGoVpsCuoi) return null;

  const dangDo = luotDangDo(tt.luot);
  if (dangDo) {
    if (!tt.lanGoCuoi) return "cuu-luot-dung-im";
    const phut = (bayGio.getTime() - new Date(tt.lanGoCuoi).getTime()) / 60_000;
    return phut >= PHUT_COI_LA_DUNG ? "cuu-luot-dung-im" : null;
  }
  return nenBatDauLuotMoi(tt.cauHinh, tt.luot, bayGio) ? "bat-dau-luot-hom-nay" : null;
}

export const CAU_GO_TU_TRANG: Record<LyDoGoTuTrang, string> = {
  "bat-dau-luot-hom-nay":
    "Tới giờ hẹn mà máy chủ chưa kiểm lần nào, nên mở trang này cũng là một nhịp: đang bắt đầu bài hôm nay.",
  "cuu-luot-dung-im":
    "Bài hôm nay đang dở mà không có nhịp nào một lúc lâu, nên mở trang này cũng là một nhịp: đang chạy tiếp.",
};
