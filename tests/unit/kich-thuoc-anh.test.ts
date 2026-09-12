import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { kichThuocAnh } from "@/domain/dung-web/kich-thuoc-anh";

/** Ảnh một màu dựng bằng sharp — cùng thư viện bước thu nhỏ ảnh Drive dùng. */
function nen(rong: number, cao: number, trongSuot = false) {
  return sharp({
    create: {
      width: rong,
      height: cao,
      channels: trongSuot ? 4 : 3,
      background: trongSuot ? { r: 10, g: 20, b: 30, alpha: 0.5 } : { r: 10, g: 20, b: 30 },
    },
  });
}

describe("kích thước ảnh đọc từ đầu tệp", () => {
  it("WebP có mất dữ liệu (VP8), không mất dữ liệu (VP8L), có kênh trong suốt (VP8X)", async () => {
    expect(kichThuocAnh(await nen(1200, 800).webp({ quality: 80 }).toBuffer())).toEqual({ rong: 1200, cao: 800 });
    expect(kichThuocAnh(await nen(333, 777).webp({ lossless: true }).toBuffer())).toEqual({ rong: 333, cao: 777 });
    expect(kichThuocAnh(await nen(640, 480, true).webp({ quality: 70 }).toBuffer())).toEqual({ rong: 640, cao: 480 });
  });

  it("PNG và JPEG", async () => {
    expect(kichThuocAnh(await nen(50, 70).png().toBuffer())).toEqual({ rong: 50, cao: 70 });
    expect(kichThuocAnh(await nen(1600, 900).jpeg({ quality: 80 }).toBuffer())).toEqual({ rong: 1600, cao: 900 });
  });

  it("tệp cụt hoặc lạ → null, không ném lỗi", () => {
    expect(kichThuocAnh(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]))).toBeNull();
    expect(kichThuocAnh(Buffer.from("RIFF0000WEBPVP8 "))).toBeNull();
    expect(kichThuocAnh(Buffer.from("RIFF0000WEBPVP8 000000000000000000"))).toBeNull();
    expect(kichThuocAnh(Buffer.alloc(0))).toBeNull();
    expect(kichThuocAnh(Buffer.from("xin chào, đây không phải ảnh"))).toBeNull();
  });
});
