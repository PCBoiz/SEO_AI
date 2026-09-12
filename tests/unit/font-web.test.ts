import { beforeEach, describe, expect, it } from "vitest";
import { docCssGoogleFont, ghepFontChoWeb, tenTepFont, urlGoogleFont, xepMatFont } from "@/domain/dung-web/font-web";
import { layFontChoWeb, xoaKhoFont, type HamFetch } from "@/lib/dung-web/font-web";

/** Đúng khuôn CSS Google trả cho Chrome (rút gọn), kèm một vùng cyrillic, một font biến thiên, và một khối lạ. */
const CSS = `/* cyrillic */
@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/bevietnampro/v12/cyr.woff2) format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
/* vietnamese */
@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/bevietnampro/v12/vi.woff2) format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+1EA0-1EF9, U+20AB;
}
/* latin */
@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/bevietnampro/v12/la.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+2000-206F;
}
/* latin */
@font-face {
  font-family: 'Be Vietnam Pro';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/bevietnampro/v12/la600.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+2000-206F;
}
/* latin */
@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/fraunces/v38/var.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* latin */
@font-face {
  font-family: 'Fraunces';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/fraunces/v38/var.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* latin */
@font-face {
  font-family: 'La';
  font-style: normal;
  font-weight: 400;
  src: url(https://evil.example/x.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}
/* latin */
@font-face {
  font-family: 'Chen';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/chen/v1/x.woff2) format('woff2');
  unicode-range: U+0000-00FF} body{background:url(https://evil.example/);
}`;

const TK = { font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" } };

describe("font tự lưu — phần thuần", () => {
  it("địa chỉ Google: hai họ khác nhau hai tham số; cùng một họ thì gộp độ đậm", () => {
    expect(urlGoogleFont(TK)).toBe(
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&family=Be+Vietnam+Pro:wght@400;500;600&display=swap",
    );
    expect(urlGoogleFont({ font: { tieuDe: "Be Vietnam Pro", than: "Be Vietnam Pro" } })).toBe(
      "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&display=swap",
    );
  });

  it("đọc CSS: nhận đúng khối hợp lệ, bỏ khối trỏ ra ngoài gstatic và khối có chữ lạ", () => {
    const mat = docCssGoogleFont(CSS);
    expect(mat.map((m) => `${m.family}|${m.weight}|${m.subset}`)).toEqual([
      "Be Vietnam Pro|400|cyrillic",
      "Be Vietnam Pro|400|vietnamese",
      "Be Vietnam Pro|400|latin",
      "Be Vietnam Pro|600|latin",
      "Fraunces|400|latin",
      "Fraunces|600|latin",
    ]);
    expect(mat[1]!.unicodeRange).toBe("U+0102-0103, U+0110-0111, U+1EA0-1EF9, U+20AB");
  });

  it("ghép: bỏ cyrillic, font biến thiên hai độ đậm dùng MỘT tệp, CSS trỏ /fonts, chọn tệp tải trước", () => {
    const mat = docCssGoogleFont(CSS);
    const taiVe = new Map(
      [...new Set(mat.map((m) => m.url))].map((u, i) => [u, { bytes: Buffer.from(`wOF2-${i}`), bam: `${i}`.repeat(64) }] as const),
    );
    const font = ghepFontChoWeb(mat, taiVe, TK)!;
    expect(font.tep.map((t) => t.ten)).toEqual([
      tenTepFont("Be Vietnam Pro", "vietnamese", "1".repeat(64)),
      tenTepFont("Be Vietnam Pro", "latin", "2".repeat(64)),
      tenTepFont("Be Vietnam Pro", "latin", "3".repeat(64)),
      tenTepFont("Fraunces", "latin", "4".repeat(64)),
    ]);
    expect(font.tep[0]!.ten).toBe("be-vietnam-pro-vietnamese-1111111111.woff2");
    expect(font.css).not.toContain("gstatic");
    expect(font.css).not.toContain("cyrillic");
    expect(font.css.match(/@font-face/g)).toHaveLength(5);
    expect(font.css).toContain('font-family: "Fraunces";');
    expect(font.css).toContain("src: url(/fonts/fraunces-latin-4444444444.woff2) format(\"woff2\");");
    // Hai khối Fraunces trỏ cùng một tệp.
    expect(font.css.match(/fraunces-latin-4444444444/g)).toHaveLength(2);
    // Tải trước: 400 của thân (vietnamese + latin) và của tiêu đề (latin) — không có 600.
    expect(font.taiTruoc).toEqual([
      "be-vietnam-pro-vietnamese-1111111111.woff2",
      "be-vietnam-pro-latin-2222222222.woff2",
      "fraunces-latin-4444444444.woff2",
    ]);
  });

  it("khai vietnamese SAU latin-ext trong mỗi nhóm họ/độ đậm — chữ Việt lấy từ tệp vietnamese, không kéo thêm tệp latin-ext", () => {
    // Đúng thứ tự Google trả: vietnamese, latin-ext, latin — cho hai độ đậm, hai họ.
    const mat = (family: string, weight: string) =>
      ["vietnamese", "latin-ext", "latin"].map((subset) => ({ family, style: "normal", weight, subset }));
    const vao = [...mat("Be Vietnam Pro", "400"), ...mat("Be Vietnam Pro", "600"), ...mat("Fraunces", "400")];
    const ra = xepMatFont(vao).map((f) => `${f.family} ${f.weight} ${f.subset}`);
    expect(ra).toEqual([
      "Be Vietnam Pro 400 latin-ext",
      "Be Vietnam Pro 400 vietnamese",
      "Be Vietnam Pro 400 latin",
      "Be Vietnam Pro 600 latin-ext",
      "Be Vietnam Pro 600 vietnamese",
      "Be Vietnam Pro 600 latin",
      "Fraunces 400 latin-ext",
      "Fraunces 400 vietnamese",
      "Fraunces 400 latin",
    ]);
    // Không đổi thứ tự nhóm; không mất, không thêm mặt nào.
    expect(xepMatFont(vao)).toHaveLength(vao.length);
    // CSS sinh ra theo đúng thứ tự đó: khối vietnamese đứng sau khối latin-ext, trước khối latin.
    const cssVao = CSS.replace("/* vietnamese */", "/* latin-ext */\n@font-face {\n  font-family: 'Be Vietnam Pro';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(https://fonts.gstatic.com/s/bevietnampro/v12/laext.woff2) format('woff2');\n  unicode-range: U+0100-02BA, U+1EF2-1EFF, U+20A0-20AB;\n}\n/* vietnamese */");
    const doc = docCssGoogleFont(cssVao);
    expect(doc.filter((m) => m.weight === "400" && m.family === "Be Vietnam Pro").map((m) => m.subset)).toEqual(["cyrillic", "latin-ext", "vietnamese", "latin"]);
    const taiVe = new Map([...new Set(doc.map((m) => m.url))].map((u, i) => [u, { bytes: Buffer.from(`wOF2-${i}`), bam: `${i}`.repeat(64) }] as const));
    const css = ghepFontChoWeb(doc, taiVe, TK)!.css;
    const cho = (vung: string) => css.indexOf(`/* ${vung} */\n@font-face {\n  font-family: "Be Vietnam Pro";\n  font-style: normal;\n  font-weight: 400;`);
    expect(cho("latin-ext")).toBeGreaterThan(-1);
    expect(cho("latin-ext")).toBeLessThan(cho("vietnamese"));
    expect(cho("vietnamese")).toBeLessThan(cho("latin"));
  });

  it("thiếu một tệp là bỏ cả bộ (không ra nửa câu tiếng Việt mất font)", () => {
    const mat = docCssGoogleFont(CSS);
    const taiVe = new Map([[mat[1]!.url, { bytes: Buffer.from("wOF2"), bam: "a".repeat(64) }]]);
    expect(ghepFontChoWeb(mat, taiVe, TK)).toBeNull();
    expect(ghepFontChoWeb([], new Map(), TK)).toBeNull();
  });
});

describe("tải font về (fetch giả)", () => {
  beforeEach(() => xoaKhoFont());

  function gia(kichBan: { cssStatus?: number; hongTep?: string; khongPhaiWoff2?: boolean } = {}) {
    const goi: Array<{ url: string; ua?: string }> = [];
    const fetchGia: HamFetch = async (url, init) => {
      goi.push({ url, ua: (init?.headers as Record<string, string> | undefined)?.["user-agent"] });
      if (url.startsWith("https://fonts.googleapis.com/")) {
        return new Response(kichBan.cssStatus ? "lỗi" : CSS, { status: kichBan.cssStatus ?? 200 });
      }
      if (kichBan.hongTep && url.endsWith(kichBan.hongTep)) return new Response("không có", { status: 404 });
      return new Response(kichBan.khongPhaiWoff2 ? Buffer.from("<html>") : Buffer.from(`wOF2${url}`), { status: 200 });
    };
    return { goi, fetchGia };
  }

  it("tải CSS bằng UA Chrome, tải mỗi tệp một lần, băm nội dung, nhớ lại ở lần sau", async () => {
    const { goi, fetchGia } = gia();
    const font = await layFontChoWeb(TK, fetchGia);
    expect(font).not.toBeNull();
    expect(goi[0]!.ua).toContain("Chrome");
    // 1 CSS + 4 tệp (Fraunces biến thiên chỉ tải một lần, cyrillic không tải).
    expect(goi).toHaveLength(5);
    expect(goi.some((g) => g.url.includes("cyr.woff2"))).toBe(false);
    expect(font!.tep.every((t) => /^[a-z0-9-]+-[a-f0-9]{10}\.woff2$/.test(t.ten))).toBe(true);
    expect(font!.tep[0]!.bytes.toString("latin1", 0, 4)).toBe("wOF2");
    // Lần hai: không gọi mạng nữa.
    expect(await layFontChoWeb(TK, fetchGia)).toBe(font);
    expect(goi).toHaveLength(5);
  });

  it("CSS lỗi, một tệp 404, hay tệp không phải woff2 → null (bộ sinh mã dùng thẻ link dự phòng)", async () => {
    expect(await layFontChoWeb(TK, gia({ cssStatus: 500 }).fetchGia)).toBeNull();
    expect(await layFontChoWeb(TK, gia({ hongTep: "la.woff2" }).fetchGia)).toBeNull();
    expect(await layFontChoWeb(TK, gia({ khongPhaiWoff2: true }).fetchGia)).toBeNull();
    const nem: HamFetch = async () => {
      throw new Error("mất mạng");
    };
    expect(await layFontChoWeb(TK, nem)).toBeNull();
  });
});
