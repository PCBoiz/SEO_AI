/**
 * Thứ tự ảnh đưa vào website.
 *
 * Tấm ĐẦU là ảnh mở đầu — thứ khách nhìn đầu tiên. Chủ dự án chọn được tấm
 * đó (theo id trên Drive); không chọn thì ảnh ở thư mục gốc đi trước thư mục
 * con (chủ dự án hay để ảnh chính ở gốc), còn lại giữ nguyên thứ tự Drive.
 * Sắp xếp ổn định: hai tấm cùng hạng không đổi chỗ nhau.
 */
export function uuTienAnh<T extends { id: string; thuMucCon: string }>(danhSach: readonly T[], anhMoDau?: string): T[] {
  return [...danhSach].sort(
    (a, b) =>
      (a.id === anhMoDau ? 0 : 1) - (b.id === anhMoDau ? 0 : 1) ||
      (a.thuMucCon === "" ? 0 : 1) - (b.thuMucCon === "" ? 0 : 1),
  );
}
