/**
 * Kích thước điểm ảnh đọc thẳng từ đầu tệp — không cần thư viện ảnh.
 *
 * Để thẻ `<img>` của web khách có `width`/`height` thật: trình duyệt dành đúng
 * chỗ trước khi ảnh tải xong (dải ảnh cuộn ngang dùng `w-auto`, nên thiếu tỉ lệ
 * là ô ảnh đổi bề ngang lúc ảnh về), và Lighthouse thôi báo "ảnh không có kích
 * thước".
 *
 * Ảnh web khách đi qua bước thu nhỏ ra WebP; PNG và JPEG cũng đọc được phòng
 * khi đường khác đưa ảnh vào. Không nhận ra định dạng, hoặc tệp cụt → `null`:
 * bên gọi bỏ thuộc tính, KHÔNG đoán.
 */
export function kichThuocAnh(b: Buffer): { rong: number; cao: number } | null {
  const hopLe = (rong: number, cao: number) =>
    rong > 0 && cao > 0 && rong <= 65_535 && cao <= 65_535 ? { rong, cao } : null;
  const chu = (o: number, n: number) => (b.length >= o + n ? b.toString("latin1", o, o + n) : "");

  // WebP: "RIFF" <cỡ> "WEBP" rồi một khối VP8 / VP8L / VP8X, phần thân bắt đầu ở byte 20.
  if (b.length >= 30 && chu(0, 4) === "RIFF" && chu(8, 4) === "WEBP") {
    const loai = chu(12, 4);
    if (loai === "VP8 ") {
      // Có mất dữ liệu: 3 byte thẻ khung, mã bắt đầu 9d 01 2a, rồi rộng/cao 14 bit.
      if (b.readUInt8(23) !== 0x9d || b.readUInt8(24) !== 0x01 || b.readUInt8(25) !== 0x2a) return null;
      return hopLe(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
    }
    if (loai === "VP8L") {
      // Không mất dữ liệu: chữ ký 0x2f, rồi (rộng−1) 14 bit, (cao−1) 14 bit.
      if (b.readUInt8(20) !== 0x2f) return null;
      const bit = b.readUInt32LE(21);
      return hopLe((bit & 0x3fff) + 1, ((bit >>> 14) & 0x3fff) + 1);
    }
    if (loai === "VP8X") {
      // Mở rộng (có kênh trong suốt / siêu dữ liệu): (rộng−1) và (cao−1) 24 bit.
      return hopLe(b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1);
    }
    return null;
  }

  // PNG: chữ ký 8 byte, khối IHDR đầu tiên mang rộng/cao 32 bit big-endian.
  if (b.length >= 24 && b.readUInt8(0) === 0x89 && chu(1, 3) === "PNG" && chu(12, 4) === "IHDR") {
    return hopLe(b.readUInt32BE(16), b.readUInt32BE(20));
  }

  // JPEG: đi qua từng đoạn tới khung SOF (C0–CF trừ C4, C8, CC).
  if (b.length >= 4 && b.readUInt8(0) === 0xff && b.readUInt8(1) === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b.readUInt8(o) !== 0xff) return null;
      const ma = b.readUInt8(o + 1);
      if (ma === 0xff) {
        o += 1; // byte đệm
        continue;
      }
      if (ma === 0x01 || (ma >= 0xd0 && ma <= 0xd8)) {
        o += 2; // đoạn không có độ dài
        continue;
      }
      if (ma >= 0xc0 && ma <= 0xcf && ma !== 0xc4 && ma !== 0xc8 && ma !== 0xcc) {
        return hopLe(b.readUInt16BE(o + 7), b.readUInt16BE(o + 5));
      }
      o += 2 + b.readUInt16BE(o + 2);
    }
    return null;
  }

  return null;
}
