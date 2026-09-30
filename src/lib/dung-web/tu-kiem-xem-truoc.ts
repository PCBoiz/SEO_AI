import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import type { HeThietKe } from "@/domain/dung-web/he-thiet-ke";
import type { KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { veTrangTinh } from "./ve-trang-tinh";

/**
 * TỰ KIỂM BỘ XEM THỬ — chạy thật một lượt dựng + vẽ, ngay trên máy chủ đang
 * phục vụ, rồi nói đạt hay hỏng.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CẦN (30/09/2026)
 *
 * Bộ xem thử (`ve-trang-tinh.ts`) đọc ba tệp CSS gốc của Tailwind bằng `fs`
 * LÚC CHẠY. Trên máy thì luôn có; trên Vercel chúng chỉ có mặt nhờ
 * `outputFileTracingIncludes` trong `next.config.ts` — một dòng cấu hình mà
 * không cổng kiểm nào trong kho chạm tới. Nếu nó sai (đổi tên tuyến, nâng cấp
 * Next đổi cách dò tệp, gói Tailwind đổi cấu trúc), tính năng CHẾT ÂM THẦM:
 * mọi thứ khác vẫn xanh, chỉ khi chủ dự án bấm "xem thử" mới thấy lỗi.
 *
 * Và không ai kiểm hộ được: tuyến xem thử đòi đăng nhập, nên từ ngoài chỉ
 * thấy 401 — 401 chứng minh tuyến CÓ, không chứng minh nó CHẠY.
 *
 * Phép kiểm này đi qua ĐÚNG đường thật: `dungCayTep` (sinh cây tệp Next.js) →
 * `veTrangTinh` (sucrase → Preact → Tailwind). Không phải bản mô phỏng, nên
 * không trôi khỏi mã thật được.
 *
 * ⚠️ KHÔNG trả nguyên văn lỗi ra ngoài: lỗi `fs` mang đường dẫn tuyệt đối của
 * máy chủ. Đường dẫn bị thay bằng `<đường dẫn>` trước khi trả.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface KetQuaTuKiem {
  ok: boolean;
  /** Bước dừng lại: `dung` (sinh cây tệp) hoặc `ve` (vẽ HTML). Đạt thì `xong`. */
  buoc: "dung" | "ve" | "xong";
  mili: number;
  /** Lý do hỏng, đã bỏ đường dẫn máy chủ. Đạt thì không có. */
  loi?: string;
}

/** Kiến trúc nhỏ nhất còn có nghĩa: một trang, hai khối — đúng trần tối thiểu của schema. */
const KIEN_TRUC: KienTrucWeb = {
  tenWebsite: "Tự kiểm",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Phép tự kiểm bộ xem thử.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu mở đầu." },
        { ma: "khoi-chot", noiDung: "Gọi ngay." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: [],
};

const THIET_KE: HeThietKe = {
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Phép tự kiểm, không ai nhìn.",
};

/**
 * Bỏ đường dẫn tuyệt đối (Windows và Unix) khỏi câu lỗi trước khi đưa ra ngoài.
 *
 * ⚠️ Mẫu Windows KHÔNG được dừng ở dấu cách: thư mục dự án trên máy chủ dự án
 * là `D:\Dự án cô Giang` — hai dấu cách. Bản đầu dùng `[^\s…]+` nên chỉ xoá
 * được `D:\Dự` rồi để lộ nguyên phần còn lại (phép thử bắt được). Giờ đi theo
 * từng đoạn ngăn bởi `\` hoặc `/`; mỗi đoạn cho phép dấu cách, dừng ở nháy.
 */
export function boDuongDan(chu: string): string {
  return chu
    .replace(/[A-Za-z]:(?:[\\/][^\\/\n"')]*)+/g, "<đường dẫn>")
    .replace(/\/(?:var|home|opt|usr|tmp|root|app)\/[^\s"')]+/g, "<đường dẫn>")
    .slice(0, 300);
}

export async function tuKiemXemTruoc(): Promise<KetQuaTuKiem> {
  const batDau = Date.now();
  let cay;
  try {
    // Số điện thoại giữ chỗ: phép kiểm không hiện cho ai, và luật "không bịa
    // số" nói về số ĐƯA CHO KHÁCH — đây là bộ nhớ trong, không phải trang thật.
    cay = dungCayTep(KIEN_TRUC, THIET_KE, { dienThoai: "0000 000 000" }).cay;
  } catch (loi) {
    return { ok: false, buoc: "dung", mili: Date.now() - batDau, loi: boDuongDan(String(loi)) };
  }

  const kq = await veTrangTinh(cay, "/", { tienTo: "/tu-kiem", nonce: "tu-kiem" });
  const mili = Date.now() - batDau;
  if (!kq.ok) return { ok: false, buoc: "ve", mili, loi: boDuongDan(kq.loi) };

  // Vẽ xong mà thiếu CSS đã biên dịch thì vẫn là hỏng — đúng dấu hiệu của
  // trường hợp "không đọc được tệp Tailwind": HTML ra bình thường, trang trắng.
  if (!kq.html.includes("<style>") || !/\.khung\s*\{/.test(kq.html)) {
    return { ok: false, buoc: "ve", mili, loi: "Vẽ được HTML nhưng CSS Tailwind rỗng — nhiều khả năng máy chủ không đọc được tệp CSS gốc của Tailwind." };
  }
  return { ok: true, buoc: "xong", mili };
}
