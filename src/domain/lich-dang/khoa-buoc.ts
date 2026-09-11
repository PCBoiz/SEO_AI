import { createHash } from "node:crypto";

/**
 * UUID TẤT ĐỊNH từ một chuỗi tên — cùng tên thì luôn ra cùng UUID.
 *
 * Bảng job đòi khoá chống trùng là UUID (`z.uuid()` trong `moduleJobBaseShape`),
 * còn lịch đăng cần khoá suy ra được từ (dự án, ngày, lần, bước, lần thử) để
 * gõ nhịp bao nhiêu lần cũng chỉ tạo đúng một job. Hai yêu cầu gặp nhau ở đây:
 * băm tên rồi ép vào khuôn UUID phiên bản 8 (phiên bản dành cho định dạng tự
 * định nghĩa, RFC 9562) với bit biến thể `10xx`.
 */
export function uuidTatDinh(ten: string): string {
  const h = createHash("sha256").update(ten, "utf8").digest("hex").slice(0, 32);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `8${h.slice(13, 16)}`,
    // Biến thể: nibble đầu của nhóm bốn phải là 8, 9, a hoặc b.
    `${"89ab"[parseInt(h[16]!, 16) % 4]}${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join("-");
}

/** Khoá chống trùng của một bước trong một lượt của lịch đăng. */
export function khoaBuocLich(
  projectId: string,
  ngay: string,
  lanLuot: number,
  buoc: number,
  lanThu: 0 | 1,
): string {
  return uuidTatDinh(`lich-dang:${projectId}:${ngay}#${lanLuot}:buoc${buoc}:lan${lanThu}`);
}
