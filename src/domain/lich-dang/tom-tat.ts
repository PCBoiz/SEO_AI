import { BUOC_LICH_DANG, ngayVN, gioVN, type LuotLich, type BuocTienDo } from "./lich-dang";

/**
 * MỘT CÂU cho người không rành kỹ thuật: hôm nay lịch đăng đang ở đâu.
 *
 * Thẻ lịch trên trang dự án nói đủ mọi thứ — nhịp gõ, VPS, crontab, chín bước,
 * mã kích hoạt — và đó là vấn đề: người vận hành mở ra chỉ muốn biết ba điều:
 * có bài chưa, có gì cần mình làm không, có hỏng không. Hàm này rút toàn bộ
 * trạng thái về đúng một câu + một mức + (nếu có) một đường dẫn để bấm.
 *
 * Thuần: nhận trạng thái đã đọc, không chạm mạng — để kiểm được từng ca.
 */
export type MucTomTat =
  /** Chưa lập lịch bao giờ. */
  | "chua-lap"
  /** Lịch đang tắt. */
  | "tat"
  /** Bình thường, chưa tới giờ hoặc đã xong việc. */
  | "on"
  /** Đang viết bài. */
  | "dang-chay"
  /** Có bài chờ chủ trang duyệt — việc của người dùng. */
  | "cho-duyet"
  /** Cần xem: dừng, đứng im, hoặc máy chủ chưa gõ. */
  | "can-xem";

export interface TomTatLich {
  muc: MucTomTat;
  cau: string;
  /** Đường dẫn hàng chờ duyệt trên website — chỉ khi có bài chờ duyệt. */
  duyetUrl?: string;
  /** Câu ngắn nói người dùng cần làm gì (nếu có). */
  viecCanLam?: string;
}

export interface DauVaoTomTat {
  daLap: boolean;
  cauHinh: { bat: boolean; gioChay: number } | null;
  /** Mới nhất trước. */
  luot: readonly LuotLich[];
  dangDo: { luot: LuotLich; cacBuoc: readonly BuocTienDo[] } | null;
  lanGoCuoi: string | null;
  lanGoVpsCuoi: string | null;
}

/** Quá ngần này phút không có nhịp gõ mà lượt vẫn dở → coi là đứng im. */
export const PHUT_DUNG_IM = 12;

export function duongDuyet(postUrl: string): string {
  try {
    return `${new URL(postUrl).origin}/duyet-bai`;
  } catch {
    return postUrl;
  }
}

function phutTruoc(iso: string, bayGio: Date): number {
  return Math.max(0, Math.round((bayGio.getTime() - new Date(iso).getTime()) / 60_000));
}

function gioPhutVN(iso: string): string {
  return new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
}

export function tomTatLich(tt: DauVaoTomTat, bayGio: Date): TomTatLich {
  if (!tt.daLap || !tt.cauHinh) {
    return { muc: "chua-lap", cau: "Chưa bật lịch tự viết bài mỗi ngày." };
  }
  if (!tt.cauHinh.bat) {
    return { muc: "tat", cau: "Lịch đang tắt — không có bài nào tự viết." };
  }

  if (tt.dangDo) {
    const xong = tt.dangDo.cacBuoc.filter((b) => b.trangThai === "xong").length;
    const buocHong = tt.dangDo.cacBuoc.find((b) => b.trangThai === "hong");
    const dungIm = tt.lanGoCuoi ? phutTruoc(tt.lanGoCuoi, bayGio) >= PHUT_DUNG_IM : false;
    if (dungIm) {
      return {
        muc: "can-xem",
        cau: `Bài «${tt.dangDo.luot.chuDe}» đang viết dở nhưng đứng im ${phutTruoc(tt.lanGoCuoi!, bayGio)} phút.`,
        viecCanLam: "Mở lịch đăng và bấm “Gõ tiếp ngay”.",
      };
    }
    if (buocHong && buocHong.lan === 1) {
      return {
        muc: "can-xem",
        cau: `Bài «${tt.dangDo.luot.chuDe}» hỏng ở bước ${xong + 1}/${BUOC_LICH_DANG.length}, đã thử lại một lần.`,
        viecCanLam: "Mở lịch đăng xem lý do; thường là hết lượt AI hoặc website từ chối.",
      };
    }
    return {
      muc: "dang-chay",
      cau: `Đang viết bài «${tt.dangDo.luot.chuDe}» — bước ${Math.min(xong + 1, BUOC_LICH_DANG.length)}/${BUOC_LICH_DANG.length}.`,
    };
  }

  const homNay = ngayVN(bayGio);
  const luotHomNay = tt.luot.filter((l) => l.ngay === homNay).sort((a, b) => b.lan - a.lan)[0];
  if (luotHomNay?.ketQua === "da-dang") {
    return {
      muc: "cho-duyet",
      cau: `Bài hôm nay «${luotHomNay.chuDe}» đã viết xong.`,
      viecCanLam: "Vào website duyệt để bài lên trang.",
      duyetUrl: luotHomNay.postUrl ? duongDuyet(luotHomNay.postUrl) : undefined,
    };
  }
  if (luotHomNay?.ketQua === "dung" || luotHomNay?.ketQua === "het-han") {
    return {
      muc: "can-xem",
      cau: `Bài hôm nay «${luotHomNay.chuDe}» không xong${luotHomNay.loi ? `: ${luotHomNay.loi}` : "."}`,
      viecCanLam: "Mở lịch đăng, sửa nếu cần rồi bấm “Chạy thử một bài ngay”.",
    };
  }

  // Chưa có lượt hôm nay.
  const gio = gioVN(bayGio);
  if (gio < tt.cauHinh.gioChay) {
    const gan = tt.luot[0];
    const duoi =
      gan?.ketQua === "da-dang"
        ? ` Bài gần nhất «${gan.chuDe}» (${gan.ngay}) đã gửi sang website.`
        : "";
    return {
      muc: "on",
      cau: `Hôm nay chưa tới giờ — lịch bắt đầu viết lúc ${tt.cauHinh.gioChay}:00.${duoi}`,
      duyetUrl: gan?.ketQua === "da-dang" && gan.postUrl ? duongDuyet(gan.postUrl) : undefined,
    };
  }
  if (!tt.lanGoVpsCuoi) {
    return {
      muc: "can-xem",
      cau: "Lịch đã bật nhưng máy chủ chưa kiểm lần nào, nên chưa có gì tự chạy.",
      viecCanLam: "Việc kỹ thuật, làm một lần: người phụ trách dán lệnh trong thẻ Lịch đăng vào máy chủ.",
    };
  }
  const tre = gio - tt.cauHinh.gioChay;
  if (tre >= 1) {
    return {
      muc: "can-xem",
      cau: `Đã quá giờ hẹn (${tt.cauHinh.gioChay}:00) mà hôm nay chưa có bài; máy chủ kiểm lần cuối ${tt.lanGoCuoi ? gioPhutVN(tt.lanGoCuoi) : "—"}.`,
      viecCanLam: "Mở lịch đăng xem dòng kết quả — thường là hết chủ đề hoặc hết lượt AI.",
    };
  }
  return {
    muc: "on",
    cau: `Đang trong giờ hẹn (${tt.cauHinh.gioChay}:00) — máy chủ sẽ bắt đầu viết trong vòng 10 phút.`,
  };
}
