import { listModuleDefinitions } from "@/domain/modules/module-definition";

/**
 * Lớp DỊCH giữa ngôn ngữ hệ thống và ngôn ngữ người dùng.
 *
 * VÌ SAO CẦN: quét giao diện bằng trình duyệt thật trên 28 lượt cho thấy 12
 * thuật ngữ kỹ thuật lọt ra màn hình — `API key` ở 6 trang, `workspace` 4
 * trang, rồi `llms.txt`, `JSON-LD`, `robots.txt`, `OAuth`, `slug`, `schema`,
 * `token`, `prompt`. Thêm vào đó là mã module thô (`RIS_CONTENT_HEADLINE`) hiện
 * nguyên trong đường dẫn lẫn breadcrumb, và các số hiệu module nhảy cóc
 * (2, 3, 5, 7, 8, 10, 11, 13) — người xem tưởng thiếu mất module 1, 4, 6, 9.
 *
 * Mỗi từ trong số đó là một khái niệm người dùng phải HỌC trước khi làm được
 * việc. File này không xoá chúng khỏi hệ thống — bên trong vẫn dùng nguyên —
 * mà chỉ quyết định cái gì được hiện ra màn hình.
 *
 * NGUYÊN TẮC ĐẶT TÊN: gọi theo VIỆC người dùng muốn làm, không gọi theo thứ hệ
 * thống tạo ra. "Đặt tiêu đề cho bài" chứ không phải "Module 7 · Tiêu đề nội
 * dung".
 */

export interface ViecLam {
  /** Mã module thật bên dưới. Không bao giờ hiện ra màn hình. */
  maModule: string;
  /** Tên theo việc người dùng muốn làm. */
  ten: string;
  /** Một câu trả lời cho "dùng cái này khi nào". */
  dungKhiNao: string;
  /** Nhóm để xếp trong danh sách. */
  nhom: "Chuẩn bị" | "Viết bài" | "Tối ưu" | "Đăng bài" | "Mạng xã hội";
  /** Việc phải làm xong trước, theo mã module. Rỗng nghĩa là làm được ngay. */
  canTruoc: string[];
}

/**
 * Bảng dịch, viết tay có chủ đích.
 *
 * KHÔNG sinh tự động từ `title` của module: tiêu đề hiện tại vốn đã là ngôn
 * ngữ hệ thống ("Các phần nội dung", "Giáp GEO"), nên sinh tự động chỉ chép lại
 * đúng vấn đề. Module nào chưa có trong bảng này thì rơi về tiêu đề gốc và
 * KHÔNG hiện trong chế độ Đơn giản — thà thiếu còn hơn hiện một cái tên khó
 * hiểu.
 */
const BANG_DICH: Record<string, Omit<ViecLam, "maModule">> = {
  RIS_SITEMAP_KEYWORDS: {
    ten: "Tìm từ khoá từ website",
    dungKhiNao: "Khi bắt đầu một dự án mới và chưa biết nên viết về chủ đề gì.",
    nhom: "Chuẩn bị",
    canTruoc: [],
  },
  RIS_ICN_KEYWORDS: {
    ten: "Mở rộng danh sách từ khoá",
    dungKhiNao: "Khi đã có vài từ khoá và muốn tìm thêm các chủ đề liên quan.",
    nhom: "Chuẩn bị",
    canTruoc: [],
  },
  RIS_ONPAGE_SEO: {
    ten: "Kiểm tra trang đã tối ưu chưa",
    dungKhiNao: "Khi muốn biết một trang có sẵn cần sửa gì để lên thứ hạng.",
    nhom: "Tối ưu",
    canTruoc: [],
  },
  RIS_CONTENT_HEADLINE: {
    ten: "Đặt tiêu đề cho bài",
    dungKhiNao: "Khi đã biết chủ đề và cần vài phương án tiêu đề để chọn.",
    nhom: "Viết bài",
    canTruoc: [],
  },
  RIS_CONTENT_INTRO: {
    ten: "Viết đoạn mở đầu",
    dungKhiNao: "Sau khi đã chốt tiêu đề.",
    nhom: "Viết bài",
    canTruoc: ["RIS_CONTENT_HEADLINE"],
  },
  RIS_CONTENT_SECTIONS: {
    ten: "Viết thân bài",
    dungKhiNao: "Sau khi đã có tiêu đề và đoạn mở đầu.",
    nhom: "Viết bài",
    canTruoc: ["RIS_CONTENT_HEADLINE", "RIS_CONTENT_INTRO"],
  },
  RIS_HOMEPAGE_CONTENT: {
    ten: "Viết nội dung trang chủ",
    dungKhiNao: "Khi cần nội dung giới thiệu cho trang chủ của một website.",
    nhom: "Viết bài",
    canTruoc: [],
  },
  RIS_GEO_SCHEMA: {
    ten: "Giúp AI hiểu bài viết",
    dungKhiNao:
      "Sau khi viết xong. Bước này giúp ChatGPT và Google trích dẫn bài của bạn.",
    nhom: "Tối ưu",
    canTruoc: ["RIS_CONTENT_SECTIONS"],
  },
  RIS_GEO_FILES: {
    ten: "Khai báo website với AI",
    dungKhiNao:
      "Làm một lần cho mỗi website, để các trợ lý AI biết website của bạn có gì.",
    nhom: "Tối ưu",
    canTruoc: [],
  },
  RIS_AB_VARIANTS: {
    ten: "Thử nhiều cách viết khác nhau",
    dungKhiNao: "Khi muốn so sánh vài phương án trước khi chọn.",
    nhom: "Tối ưu",
    canTruoc: [],
  },
  RIS_REPURPOSE: {
    ten: "Chuyển bài thành bài mạng xã hội",
    dungKhiNao: "Khi muốn dùng lại một bài đã viết cho Facebook hoặc Zalo.",
    nhom: "Mạng xã hội",
    canTruoc: [],
  },
  RIS_VIDEO_SCRIPT: {
    ten: "Viết kịch bản video",
    dungKhiNao: "Khi muốn dựng một video ngắn từ nội dung đã có.",
    nhom: "Mạng xã hội",
    canTruoc: [],
  },
  RIS_FB_PUBLISH: {
    ten: "Đăng lên Facebook",
    dungKhiNao: "Khi đã có nội dung và muốn đưa lên trang Facebook.",
    nhom: "Đăng bài",
    canTruoc: [],
  },
  RIS_ZALO_PUBLISH: {
    ten: "Đăng lên Zalo",
    dungKhiNao: "Khi đã có nội dung và muốn gửi tới người theo dõi trên Zalo.",
    nhom: "Đăng bài",
    canTruoc: [],
  },
  RIS_GBP_PUBLISH: {
    ten: "Đăng lên hồ sơ Google Doanh nghiệp",
    dungKhiNao:
      "Khi muốn bài xuất hiện ở phần thông tin doanh nghiệp trên Google Maps và tìm kiếm.",
    nhom: "Đăng bài",
    canTruoc: [],
  },
  RIS_IMPORTED_KEYWORDS: {
    ten: "Nạp danh sách từ khoá có sẵn",
    dungKhiNao:
      "Khi bạn đã có sẵn danh sách từ khoá từ công cụ khác và muốn đưa vào đây.",
    nhom: "Chuẩn bị",
    canTruoc: [],
  },
  RIS_WP_PUBLISH: {
    ten: "Đăng lên WordPress",
    dungKhiNao: "Khi bài đã viết xong và website chạy bằng WordPress.",
    nhom: "Đăng bài",
    canTruoc: ["RIS_CONTENT_SECTIONS"],
  },
  RIS_VHGG_PUBLISH: {
    ten: "Đăng lên website dự án",
    dungKhiNao: "Khi bài đã viết xong và muốn đưa lên website bất động sản.",
    nhom: "Đăng bài",
    canTruoc: ["RIS_CONTENT_SECTIONS"],
  },
  RIS_SITE_SCAN: {
    ten: "Quét toàn bộ website",
    dungKhiNao: "Khi muốn biết website hiện có những trang nào.",
    nhom: "Chuẩn bị",
    canTruoc: [],
  },
};

/** Thứ tự nhóm khi hiển thị — đi theo trình tự làm việc thật. */
export const THU_TU_NHOM: ViecLam["nhom"][] = [
  "Chuẩn bị",
  "Viết bài",
  "Tối ưu",
  "Đăng bài",
  "Mạng xã hội",
];

/**
 * Danh sách việc cho chế độ Đơn giản.
 *
 * Chỉ trả về module CÓ trong bảng dịch. Module chưa được đặt tên theo ngôn ngữ
 * người dùng sẽ không hiện — người dùng chế độ Đơn giản không nên gặp một cái
 * tên mà chính người viết chưa nghĩ ra cách gọi cho dễ hiểu.
 */
export function danhSachViec(): ViecLam[] {
  const coThat = new Set(listModuleDefinitions().map((d) => d.key));
  return Object.entries(BANG_DICH)
    .filter(([ma]) => coThat.has(ma))
    .map(([maModule, phanConLai]) => ({ maModule, ...phanConLai }))
    .sort(
      (a, b) => THU_TU_NHOM.indexOf(a.nhom) - THU_TU_NHOM.indexOf(b.nhom),
    );
}

export function timViec(maModule: string): ViecLam | null {
  const muc = BANG_DICH[maModule];
  return muc ? { maModule, ...muc } : null;
}

/**
 * Tên hiển thị cho một module bất kỳ.
 *
 * Có trong bảng dịch thì dùng tên theo việc; không có thì rơi về tiêu đề gốc.
 * KHÔNG bao giờ trả về mã module thô.
 */
export function tenHienThi(maModule: string): string {
  const viec = BANG_DICH[maModule];
  if (viec) return viec.ten;
  const goc = listModuleDefinitions().find((d) => d.key === maModule);
  return goc?.title ?? "Việc không rõ";
}

/**
 * Các bước để có một bài viết hoàn chỉnh, theo đúng thứ tự phải chạy.
 *
 * ĐÂY LÀ MẢNH GHÉP QUAN TRỌNG NHẤT của chế độ Đơn giản. Ở chế độ hiện tại,
 * người dùng phải tự biết rằng muốn có một bài thì phải chạy tiêu đề → mở đầu →
 * thân bài → giúp AI hiểu → đăng, và phải tự chép kết quả bước trước sang ô của
 * bước sau. Không có chỗ nào trên giao diện nói điều đó.
 */
export const CHUOI_VIET_BAI: string[] = [
  "RIS_CONTENT_HEADLINE",
  "RIS_CONTENT_INTRO",
  "RIS_CONTENT_SECTIONS",
  "RIS_GEO_SCHEMA",
];
