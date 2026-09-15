/**
 * Câu chữ cho lưới an toàn "mở trang cũng là một nhịp gõ" — TÁCH RIÊNG, KHÔNG
 * IMPORT GÌ.
 *
 * ⚠️ VÌ SAO NẰM RIÊNG (đo 16/09/2026)
 *
 * Hằng số này từng nằm trong `luoi-an-toan.ts`, mà tệp đó import giá trị từ
 * `./lich-dang` — nơi dùng zod. Hai client component (`bat-dau/go-ho-lich.tsx`,
 * `projects/[projectId]/lich-dang-card.tsx`) chỉ cần đúng bảng câu chữ này,
 * nhưng import từ `luoi-an-toan` là kéo theo CẢ zod xuống trình duyệt.
 *
 * Đo trên bản build: `/bat-dau` gửi thêm một gói riêng 285 KB (64 KB nén) mà
 * không trang nào khác có; bên trong là `__zod_globalConfig`. Trên điện thoại
 * 4G yếu, cache tắt: `/bat-dau` FCP 1.892 ms, `/projects` 1.404 ms.
 *
 * Luật: tệp mà client component import thì KHÔNG được import giá trị từ mô-đun
 * có zod. Cần kiểu thì `import type` (bị xoá khi biên dịch, không kéo gì theo).
 */

export type LyDoGoTuTrang = "bat-dau-luot-hom-nay" | "cuu-luot-dung-im";

export const CAU_GO_TU_TRANG: Record<LyDoGoTuTrang, string> = {
  "bat-dau-luot-hom-nay":
    "Tới giờ hẹn mà máy chủ chưa kiểm lần nào, nên mở trang này cũng là một nhịp: đang bắt đầu bài hôm nay.",
  "cuu-luot-dung-im":
    "Bài hôm nay đang dở mà không có nhịp nào một lúc lâu, nên mở trang này cũng là một nhịp: đang chạy tiếp.",
};
