import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { crc32, taoZip } from "@/lib/zip";

function docMucLuc(zip: Buffer): Array<{ ten: string; tho: Buffer }> {
  // Đọc ngược từ EOCD như một trình giải nén thật làm, thay vì tin vào thứ tự
  // ghi — sai lệch vị trí là lỗi hay gặp nhất khi tự viết ZIP, và nó chỉ lộ ra
  // ở một số trình giải nén.
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(eocd).toBeGreaterThan(-1);
  const soMuc = zip.readUInt16LE(eocd + 10);
  let vi = zip.readUInt32LE(eocd + 16);
  const ra: Array<{ ten: string; tho: Buffer }> = [];
  for (let i = 0; i < soMuc; i++) {
    expect(zip.readUInt32LE(vi)).toBe(0x02014b50);
    const crc = zip.readUInt32LE(vi + 16);
    const coNen = zip.readUInt32LE(vi + 20);
    const daiTen = zip.readUInt16LE(vi + 28);
    const viCucBo = zip.readUInt32LE(vi + 42);
    const ten = zip.subarray(vi + 46, vi + 46 + daiTen).toString("utf8");

    expect(zip.readUInt32LE(viCucBo)).toBe(0x04034b50);
    const daiTenCucBo = zip.readUInt16LE(viCucBo + 26);
    const daiPhu = zip.readUInt16LE(viCucBo + 28);
    const dau = viCucBo + 30 + daiTenCucBo + daiPhu;
    const tho = inflateRawSync(zip.subarray(dau, dau + coNen));
    expect(crc32(tho)).toBe(crc);
    ra.push({ ten, tho });
    vi += 46 + daiTen + zip.readUInt16LE(vi + 30) + zip.readUInt16LE(vi + 32);
  }
  return ra;
}

/**
 * Đường tới `bsdtar` — trình giải nén đọc được ZIP.
 *
 * ⚠️ TRÊN WINDOWS CÓ HAI `tar` KHÁC HẲN NHAU, VÀ CÁI ĐỨNG TRƯỚC KHÔNG ĐỌC ĐƯỢC
 * ZIP. Git Bash cài `tar` của GNU (1.35) vào PATH trước `C:/Windows/System32/
 * tar.exe` (bsdtar). GNU tar gặp tệp zip thì nói "This does not look like a
 * tar archive" — nghe y như tệp nén hỏng, trong khi tệp hoàn toàn đúng.
 *
 * Mất gần một vòng sửa vì tưởng bộ ghi ZIP sai. Nên gọi thẳng bsdtar.
 */
function timBsdtar(): string | null {
  const ungVien =
    process.platform === "win32"
      ? [path.join(process.env.SystemRoot ?? "C:/Windows", "System32", "tar.exe"), "bsdtar", "tar"]
      : ["bsdtar", "tar"];
  for (const d of ungVien) {
    try {
      const ra = execFileSync(d, ["--version"], { stdio: "pipe" }).toString();
      if (ra.toLowerCase().includes("bsdtar")) return d;
    } catch {
      // thử ứng viên tiếp theo
    }
  }
  return null;
}

describe("taoZip", () => {
  it("giải ngược ra đúng tên và nội dung, CRC khớp", () => {
    const zip = taoZip([
      { duongDan: "package.json", noiDung: '{"name":"a"}' },
      { duongDan: "src/app/page.tsx", noiDung: "export default function A() {\n  return <p>Chào bạn — có dấu</p>;\n}\n" },
    ]);
    const muc = docMucLuc(zip);
    expect(muc.map((m) => m.ten)).toEqual(["package.json", "src/app/page.tsx"]);
    expect(muc[1]!.tho.toString("utf8")).toContain("Chào bạn — có dấu");
  });

  it("cùng đầu vào ra cùng chuỗi byte (không nhét Date.now vào)", () => {
    const tep = [{ duongDan: "a.txt", noiDung: "x" }];
    expect(taoZip(tep).equals(taoZip(tep))).toBe(true);
  });

  it("chặn đường dẫn thoát thư mục (zip slip)", () => {
    const zip = taoZip([{ duongDan: "../../thoat.txt", noiDung: "x" }]);
    expect(docMucLuc(zip)[0]!.ten).toBe("thoat.txt");
    expect(() => taoZip([{ duongDan: "../..", noiDung: "x" }])).toThrow(/không hợp lệ/);
  });

  it("nén thật: tệp lặp lại nhiều lần thì nhỏ đi rõ rệt", () => {
    const to = "dòng lặp lại rất nhiều lần\n".repeat(500);
    expect(taoZip([{ duongDan: "to.txt", noiDung: to }]).length).toBeLessThan(Buffer.byteLength(to) / 4);
  });

  it("TRÌNH GIẢI NÉN THẬT của hệ điều hành mở được", () => {
    // Tự đọc lại tệp mình vừa ghi thì chỉ chứng minh hai đoạn mã hiểu nhau.
    // bsdtar là bên thứ ba thật sự. Máy nào không có thì bỏ qua.
    const bsdtar = timBsdtar();
    if (!bsdtar) return;
    const thuMuc = mkdtempSync(path.join(tmpdir(), "kiem-zip-"));
    try {
      const tepZip = path.join(thuMuc, "thu.zip");
      writeFileSync(
        tepZip,
        taoZip([
          { duongDan: "README.md", noiDung: "# Tệp thử — có dấu tiếng Việt\n" },
          { duongDan: "src/a/b.txt", noiDung: "sâu hai tầng" },
        ]),
      );
      // Tên tệp thôi, không đường dẫn tuyệt đối: bsdtar hiểu "C:\…" là tên
      // MÁY CHỦ từ xa (cú pháp rsh cũ) và trả "Cannot connect to C".
      //
      // KHÔNG bọc try/catch nuốt lỗi ở đây: bản đầu nuốt mọi lỗi nên phép thử
      // vẫn xanh trong khi trình giải nén thật đang từ chối tệp.
      execFileSync(bsdtar, ["-xf", "thu.zip"], { cwd: thuMuc, stdio: "pipe" });
      expect(readdirSync(thuMuc).sort()).toEqual(["README.md", "src", "thu.zip"]);
      expect(readFileSync(path.join(thuMuc, "src", "a", "b.txt"), "utf8")).toBe("sâu hai tầng");
      expect(readFileSync(path.join(thuMuc, "README.md"), "utf8")).toContain("có dấu tiếng Việt");
    } finally {
      rmSync(thuMuc, { recursive: true, force: true });
    }
  });
});
