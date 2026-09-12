import { deflateRawSync } from "node:zlib";

/**
 * Gói một cây tệp thành tệp ZIP — tự viết, không thêm phụ thuộc.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO TỰ VIẾT
 *
 * Cần đúng một việc: nhận vài chục tệp văn bản, trả một Buffer tải về được.
 * Thư viện zip trên npm kéo theo hàng chục gói con, và đây là đường mà mã do
 * MODEL sinh ra đi qua — càng ít mã lạ trong đường đó càng dễ nói chắc chuyện
 * gì xảy ra. Định dạng ZIP phần này ổn định từ 1993 và gọn hơn cả một trang.
 *
 * Dùng `deflateRawSync` của Node (method 8). Bản "store" (method 0) cũng hợp
 * lệ nhưng một dự án Next.js toàn chữ thì deflate nhỏ hơn khoảng bốn lần, và
 * `zlib` vốn đã nằm trong Node.
 *
 * ⚠️ THỜI GIAN CỐ ĐỊNH, KHÔNG LẤY `Date.now()`. Cùng một cây tệp phải ra cùng
 * một chuỗi byte: có thế mới so được hai lần tải về, và mới kiểm được bằng
 * test. Dấu thời gian thật không thêm thông tin gì cho người nhận.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface TepZip {
  /** Đường dẫn trong tệp nén, dùng dấu `/`. */
  duongDan: string;
  noiDung: string | Buffer;
}

const BANG_CRC = (() => {
  const bang = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    bang[i] = c >>> 0;
  }
  return bang;
})();

export function crc32(du: Buffer): number {
  let c = 0xffffffff;
  for (const byte of du) c = BANG_CRC[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 01/01/2026 00:00 theo khuôn ngày–giờ kiểu MS-DOS mà ZIP dùng. */
const NGAY_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;
const GIO_DOS = 0;

function tenTep(duongDan: string): Buffer {
  // Chuẩn hoá về dấu `/` và bỏ mọi đoạn `..`: tệp nén là thứ người khác giải
  // ra trên máy họ, và một đường dẫn thoát thư mục trong zip là lỗ "zip slip".
  const sach = duongDan
    .replace(/\\/g, "/")
    .split("/")
    .filter((x) => x && x !== "." && x !== "..")
    .join("/");
  if (!sach) throw new Error(`Đường dẫn không hợp lệ trong tệp nén: ${duongDan}`);
  return Buffer.from(sach, "utf8");
}

export function taoZip(tep: readonly TepZip[]): Buffer {
  const cucBo: Buffer[] = [];
  const trungTam: Buffer[] = [];
  let viTri = 0;

  for (const t of tep) {
    const ten = tenTep(t.duongDan);
    const tho = Buffer.isBuffer(t.noiDung) ? t.noiDung : Buffer.from(t.noiDung, "utf8");
    const nen = deflateRawSync(tho, { level: 9 });
    const crc = crc32(tho);

    const dau = Buffer.alloc(30);
    dau.writeUInt32LE(0x04034b50, 0);
    dau.writeUInt16LE(20, 4); // bản tối thiểu để giải nén
    dau.writeUInt16LE(0x0800, 6); // cờ: tên tệp mã hoá UTF-8
    dau.writeUInt16LE(8, 8); // phương pháp: deflate
    dau.writeUInt16LE(GIO_DOS, 10);
    dau.writeUInt16LE(NGAY_DOS, 12);
    dau.writeUInt32LE(crc, 14);
    dau.writeUInt32LE(nen.length, 18);
    dau.writeUInt32LE(tho.length, 22);
    dau.writeUInt16LE(ten.length, 26);
    dau.writeUInt16LE(0, 28); // không có trường phụ
    cucBo.push(dau, ten, nen);

    const tt = Buffer.alloc(46);
    tt.writeUInt32LE(0x02014b50, 0);
    tt.writeUInt16LE(20, 4); // bản tạo ra
    tt.writeUInt16LE(20, 6);
    tt.writeUInt16LE(0x0800, 8);
    tt.writeUInt16LE(8, 10);
    tt.writeUInt16LE(GIO_DOS, 12);
    tt.writeUInt16LE(NGAY_DOS, 14);
    tt.writeUInt32LE(crc, 16);
    tt.writeUInt32LE(nen.length, 20);
    tt.writeUInt32LE(tho.length, 24);
    tt.writeUInt16LE(ten.length, 28);
    tt.writeUInt16LE(0, 30); // trường phụ
    tt.writeUInt16LE(0, 32); // chú thích
    tt.writeUInt16LE(0, 34); // số đĩa
    tt.writeUInt16LE(0, 36); // thuộc tính trong
    // Thuộc tính ngoài: tệp thường 644. `>>> 0` vì `<<` của JS trả số CÓ DẤU
    // 32 bit — 0o100644 << 16 tràn thành số âm và `writeUInt32LE` ném lỗi.
    tt.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    tt.writeUInt32LE(viTri, 42);
    trungTam.push(tt, ten);

    viTri += dau.length + ten.length + nen.length;
  }

  const than = Buffer.concat(cucBo);
  const mucLuc = Buffer.concat(trungTam);
  const cuoi = Buffer.alloc(22);
  cuoi.writeUInt32LE(0x06054b50, 0);
  cuoi.writeUInt16LE(0, 4); // đĩa này
  cuoi.writeUInt16LE(0, 6); // đĩa chứa mục lục
  cuoi.writeUInt16LE(tep.length, 8);
  cuoi.writeUInt16LE(tep.length, 10);
  cuoi.writeUInt32LE(mucLuc.length, 12);
  cuoi.writeUInt32LE(than.length, 16);
  cuoi.writeUInt16LE(0, 20); // chú thích
  return Buffer.concat([than, mucLuc, cuoi]);
}
