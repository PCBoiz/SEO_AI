import type { CayTep, TepSinh } from "./moi-truong-dung";
import type { KienTrucWeb } from "./kien-truc";
import type { HeThietKe } from "./he-thiet-ke";
import { timMauKhoi, type BoiCanhSinh, type NoiDungKhoi } from "./khoi/mau-khoi";
import { KHOA_MO_TA, chu } from "./khoi/kieu";

/**
 * TỪ HỢP ĐỒNG RA CÂY TỆP — bước 4–5 của trình dựng website.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM THUẦN, KHÔNG GỌI MODEL, KHÔNG CHẠM Ổ ĐĨA.
 *
 * Vào: kiến trúc (#25) + hệ thiết kế (#26) + chữ cho từng khối (#27, tuỳ chọn).
 * Ra: một cây tệp Next.js đầy đủ — `package.json`, cấu hình, `app/`, khối.
 *
 * Vì sao thuần: đây là chỗ dễ sinh lỗi nhất của cả hệ (đường dẫn, tên
 * component trùng, chữ phá cú pháp JSX), mà lại là chỗ dễ kiểm nhất NẾU không
 * trộn vào I/O. Ghi tệp và chạy `tsc`/`next build` là việc của
 * `MoiTruongDung`; kiểm nội dung là việc của test chạy trong một phần nghìn
 * giây.
 *
 * PHIÊN BẢN PHỤ THUỘC ĐÓNG CỨNG, KHÔNG DÙNG `^`. Một dự án khách dựng hôm nay
 * phải dựng lại được y hệt sau ba tháng. `^` nghĩa là bản vá mới của Next có
 * thể lọt vào giữa hai lần dựng, và khi build gãy thì không ai biết vì sao —
 * mã không đổi một dòng nào.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Bản Next.js/React đã chạy thật ở cả hai kho của dự án này (12/09/2026). */
const PHIEN_BAN = {
  next: "16.2.11",
  react: "19.2.4",
  typescript: "5.9.3",
  types_node: "20.19.9",
  types_react: "19.2.2",
  tailwind: "4.1.14",
} as const;

export interface ThongTinTrang {
  /** Số điện thoại thật — KHÔNG để model bịa. */
  dienThoai: string;
  /** Địa chỉ Zalo (hoặc để trống thì rơi về link gọi). */
  zalo?: string;
  /** Địa chỉ website sẽ chạy, để dựng sitemap/robots. */
  diaChi?: string;
}

/** Chữ cho từng khối: khoá là `"<đường trang>#<số thứ tự khối>"`. */
export type NoiDungTheoKhoi = Record<string, NoiDungKhoi>;

export interface KetQuaDungCay {
  cay: CayTep;
  /** Khối trong kiến trúc chưa có khuôn dựng — không chặn, chỉ bỏ qua. */
  boQua: string[];
  /** Đường dẫn tệp đã sinh, để hiển thị. */
  danhSachTep: string[];
}

/* ─────────────────────────────── Tiện ích ──────────────────────────────── */

/**
 * Chữ tiếng Việt → slug.
 *
 * ⚠️ PHẢI THAY `đ` RIÊNG. `normalize("NFD")` tách dấu ra khỏi nguyên âm (ề →
 * e + dấu) nên bỏ dấu xong là còn chữ Latinh — nhưng `đ` KHÔNG phải chữ có
 * dấu, nó là một chữ cái riêng và NFD không đụng tới. Bỏ bước này thì "Đường
 * 3/2" ra `uong-3-2`: mất hẳn chữ đầu, và tên miền/tên gói sai một chữ thì
 * không ai soi ra bằng mắt.
 */
export function lamSlug(s: string): string {
  const tho = s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return tho ? tho.slice(0, 60).replace(/-+$/, "") : "website";
}

/** Tên component cho một trang: `/bang-gia` → `TrangBangGia`. */
function tenTrang(duong: string): string {
  if (duong === "/") return "TrangChu";
  const phan = duong.split("/").filter(Boolean);
  return (
    "Trang" +
    phan
      .map((p) => p.split("-").map((x) => x.charAt(0).toUpperCase() + x.slice(1)).join(""))
      .join("")
  );
}

function thuMucTrang(duong: string): string {
  return duong === "/" ? "src/app/page.tsx" : `src/app${duong}/page.tsx`;
}

const js = (v: unknown) => JSON.stringify(v);

/* ──────────────────────────── Tệp cấu hình ─────────────────────────────── */

function tepCauHinh(ten: string): TepSinh[] {
  return [
    {
      duongDan: "package.json",
      noiDung:
        JSON.stringify(
          {
            name: lamSlug(ten),
            version: "0.1.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
              "kiem-kieu": "tsc --noEmit",
            },
            dependencies: {
              next: PHIEN_BAN.next,
              react: PHIEN_BAN.react,
              "react-dom": PHIEN_BAN.react,
            },
            devDependencies: {
              "@tailwindcss/postcss": PHIEN_BAN.tailwind,
              "@types/node": PHIEN_BAN.types_node,
              "@types/react": PHIEN_BAN.types_react,
              "@types/react-dom": PHIEN_BAN.types_react,
              tailwindcss: PHIEN_BAN.tailwind,
              typescript: PHIEN_BAN.typescript,
            },
          },
          null,
          2,
        ) + "\n",
    },
    {
      duongDan: "tsconfig.json",
      noiDung:
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2017",
              lib: ["dom", "dom.iterable", "esnext"],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: "esnext",
              moduleResolution: "bundler",
              resolveJsonModule: true,
              isolatedModules: true,
              // `react-jsx`, không phải `preserve`: `next build` tự sửa
              // `preserve` thành `react-jsx` rồi ghi đè tsconfig của dự án —
              // và một tệp cấu hình bị máy sửa sau lưng là thứ làm hai lần
              // dựng liên tiếp cho kết quả khác nhau.
              jsx: "react-jsx",
              incremental: true,
              plugins: [{ name: "next" }],
              paths: { "@/*": ["./src/*"] },
            },
            include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
            exclude: ["node_modules"],
          },
          null,
          2,
        ) + "\n",
    },
    {
      // Next tự sinh tệp này lúc `next dev`/`next build`. Nhưng `tsc --noEmit`
      // chạy TRƯỚC build trong bước kiểm chứng, và thiếu nó thì mọi tệp .tsx
      // mất kiểu JSX của Next — hàng chục lỗi giả ngay lần kiểm đầu.
      duongDan: "next-env.d.ts",
      noiDung: `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`,
    },
    { duongDan: "next.config.ts", noiDung: `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n` },
    { duongDan: "postcss.config.mjs", noiDung: `const config = {\n  plugins: {\n    "@tailwindcss/postcss": {},\n  },\n};\n\nexport default config;\n` },
    { duongDan: ".gitignore", noiDung: `node_modules\n.next\n.env*\n!.env.example\n` },
    { duongDan: ".env.example", noiDung: `# Nơi nhận khách để lại số. Chưa đặt thì máy chủ chỉ ghi ra nhật ký.\nLEAD_WEBHOOK_URL=\nLEAD_WEBHOOK_TOKEN=\n` },
  ];
}

/* ───────────────────────────── Hệ thiết kế ─────────────────────────────── */

const NHIP: Record<HeThietKe["khoangCach"], string> = { thoang: "6rem", vua: "4.5rem", chat: "3rem" };
const BO: Record<HeThietKe["goc"], string> = { vuong: "0", "bo-nhe": "0.5rem", tron: "1rem" };

function tepCss(tk: HeThietKe): TepSinh {
  return {
    duongDan: "src/app/globals.css",
    noiDung: `@import "tailwindcss";

/* ===========================================================================
   HỆ THIẾT KẾ — do bước "Dựng web · Hệ thiết kế" chọn, đã kiểm tương phản.
   Sửa bốn biến màu bên dưới là đổi cả trang; đừng rải mã màu vào từng khối.
   =========================================================================== */
:root {
  --nen: ${tk.mau.nen};
  --chu: ${tk.mau.chu};
  --nhan: ${tk.mau.nhan};
  --phu: ${tk.mau.phu};
  --vien: color-mix(in oklab, var(--chu) 18%, transparent);
  --nen-nhe: color-mix(in oklab, var(--chu) 5%, var(--nen));
  --canh: #d8845c;
  --nhip: ${NHIP[tk.khoangCach]};
  --bo: ${BO[tk.goc]};
  --font-than: ${js(tk.font.than)}, system-ui, sans-serif;
  --font-tieu-de: ${js(tk.font.tieuDe)}, Georgia, serif;
}

html { color-scheme: dark light; }
body {
  background: var(--nen);
  color: var(--chu);
  font-family: var(--font-than);
  /* Chừa chỗ cho cụm nút liên hệ nổi ở đáy màn hình điện thoại. */
  padding-bottom: 4.5rem;
}
@media (min-width: 768px) { body { padding-bottom: 0; } }

.tieu-de { font-family: var(--font-tieu-de); font-weight: 400; }
.khung { margin-inline: auto; max-width: 76rem; padding-inline: 1.5rem; }
@media (min-width: 768px) { .khung { padding-inline: 2.5rem; } }
.nhip { padding-block: var(--nhip); }
.vien-tren { border-top: 1px solid var(--vien); }
.vien-duoi { border-bottom: 1px solid var(--vien); }
.chu-phu { color: var(--phu); }
.chu-nhan { color: var(--nhan); }
.chu-canh { color: var(--canh); }
.nen-nhe { background: var(--nen-nhe); }
.nen-day { background: var(--nen); }
.nen-mo { background: color-mix(in oklab, var(--nen) 88%, transparent); backdrop-filter: blur(10px); }
.the { border: 1px solid var(--vien); border-radius: var(--bo); background: var(--nen-nhe); }
.nut {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 2.75rem; padding-inline: 1.25rem; border-radius: var(--bo);
  font-weight: 500; text-align: center;
}
.nut-chinh { background: var(--nhan); color: var(--nen); }
.nut-phu { border: 1px solid var(--vien); color: var(--chu); }
.o-nhap {
  min-height: 2.75rem; padding: 0.625rem 0.875rem;
  border: 1px solid var(--vien); border-radius: var(--bo);
  background: var(--nen-nhe); color: var(--chu); font: inherit;
}
.thanh { height: 0.5rem; border-radius: 999px; background: var(--vien); overflow: hidden; }
.thanh-trong { display: block; height: 100%; background: var(--nhan); }
`,
  };
}

/* ──────────────────────────────── Dựng ─────────────────────────────────── */

export function dungCayTep(
  kienTruc: KienTrucWeb,
  thietKe: HeThietKe,
  thongTin: ThongTinTrang,
  noiDung: NoiDungTheoKhoi = {},
): KetQuaDungCay {
  const ctx: BoiCanhSinh = {
    tenWebsite: kienTruc.tenWebsite,
    dienThoai: thongTin.dienThoai,
    zalo: thongTin.zalo?.trim() || `tel:${thongTin.dienThoai.replace(/\s+/g, "")}`,
    trang: kienTruc.trang.map((t) => ({ duong: t.duong, tieuDe: t.tieuDe })),
  };

  const tep: TepSinh[] = [...tepCauHinh(kienTruc.tenWebsite), tepCss(thietKe)];
  const boQua: string[] = [];
  /** Khoá `<mã>|<chữ>` → component đã sinh. */
  const daSinh = new Map<string, { component: string; tenTep: string }>();
  const demTheoMa = new Map<string, number>();

  /**
   * Sinh tệp component cho một khối.
   *
   * ⚠️ MỘT MÃ KHỐI CÓ THỂ RA NHIỀU TỆP, và đó là chủ đích.
   *
   * Bản đầu sinh đúng một tệp cho mỗi mã: trang chủ và trang bảng giá cùng
   * dùng `gia-thuc-tra` thì trang thứ hai hiện y hệt chữ của trang thứ nhất —
   * lần sinh đầu thắng. Nhìn thấy ngay khi dựng thử: "Giá thực trả" lặp lại
   * nguyên xi, ba dòng giống hệt.
   *
   * Giờ khoá theo MÃ + CHỮ: cùng chữ thì dùng lại tệp cũ (không phình dự án),
   * khác chữ thì tệp riêng `<mã>-2.tsx` với tên component riêng.
   */
  function dungKhoi(ma: string, nd: NoiDungKhoi): { component: string; tenTep: string } | null {
    const mau = timMauKhoi(ma);
    if (!mau) {
      if (!boQua.includes(ma)) boQua.push(ma);
      return null;
    }
    const khoa = `${ma}|${JSON.stringify(nd)}`;
    const daCo = daSinh.get(khoa);
    if (daCo) return daCo;

    const lan = (demTheoMa.get(ma) ?? 0) + 1;
    demTheoMa.set(ma, lan);
    const component = lan === 1 ? mau.component : `${mau.component}${lan}`;
    const tenTep = lan === 1 ? ma : `${ma}-${lan}`;
    const noiDungTep = mau
      .sinh(nd, ctx)
      .replace(`export default function ${mau.component}(`, `export default function ${component}(`);
    tep.push({ duongDan: `src/components/khoi/${tenTep}.tsx`, noiDung: noiDungTep });
    const ra = { component, tenTep };
    daSinh.set(khoa, ra);
    return ra;
  }

  // Khối dùng chung: đầu trang, chân trang, nút liên hệ nổi — vào layout.
  const chung: Array<{ component: string; tenTep: string }> = [];
  for (const ma of kienTruc.khoiChung) {
    const ra = dungKhoi(ma, noiDung[`chung#${ma}`] ?? {});
    if (ra) chung.push(ra);
  }

  // Trang: mỗi trang một tệp, ghép các khối theo đúng thứ tự trong kiến trúc.
  for (const trang of kienTruc.trang) {
    const nhap: string[] = [];
    const than: string[] = [];
    for (const [i, khoi] of trang.khoi.entries()) {
      // Chưa có chữ thật (#27 chưa chạy) thì khối vẫn nhận CÂU Ý ĐỒ của kiến
      // trúc làm chữ phòng hờ — xem `KHOA_MO_TA` trong `khoi/kieu.ts`.
      const nd = noiDung[`${trang.duong}#${i}`] ?? { [KHOA_MO_TA]: khoi.noiDung };
      const ra = dungKhoi(khoi.ma, nd);
      if (!ra) continue;
      nhap.push(`import ${ra.component} from "@/components/khoi/${ra.tenTep}";`);
      than.push(`      <${ra.component} />`);
    }
    // MỘT TRANG PHẢI CÓ MỘT <h1>. Khối mở đầu đã mang h1; trang không có khối
    // đó (bảng giá, giới thiệu…) thì bản đầu vào thẳng một <h2> — trang không
    // có tiêu đề cấp một, vừa hại tìm kiếm vừa bắt người đọc tự đoán đang ở
    // đâu. Thêm một mảng tiêu đề mỏng ở đầu những trang ấy.
    if (trang.khoi[0]?.ma !== "hero-anh" && than.length > 0) {
      than.unshift(`      <section className="nen-nhe nhip">
        <div className="khung">
          <h1 className="tieu-de text-4xl leading-tight md:text-5xl">${chu(trang.tieuDe)}</h1>
          <p className="chu-phu mt-4 max-w-[60ch] leading-relaxed">${chu(trang.mucDich)}</p>
        </div>
      </section>`);
    }
    const ten = tenTrang(trang.duong);
    tep.push({
      duongDan: thuMucTrang(trang.duong),
      noiDung: `import type { Metadata } from "next";
${[...new Set(nhap)].join("\n")}

export const metadata: Metadata = {
  title: ${js(`${trang.tieuDe} · ${kienTruc.tenWebsite}`)},
  description: ${js(trang.mucDich.slice(0, 300))},
};

export default function ${ten}() {
  return (
    <>
${than.join("\n")}
    </>
  );
}
`,
    });
  }

  // Layout: font qua thẻ <link> chứ không qua `next/font`.
  //
  // `next/font/google` TẢI FONT LÚC BUILD. Máy dựng không ra được Internet
  // (máy chủ đóng, hoặc mạng chập) là build gãy — mà lỗi lúc đó nói về font,
  // không nói về mạng. Thẻ <link> thì build offline vẫn xong, chỉ là lúc xem
  // trang mới cần mạng để lấy font.
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(thietKe.font.tieuDe).replace(/%20/g, "+")}:wght@400;600&family=${encodeURIComponent(thietKe.font.than).replace(/%20/g, "+")}:wght@400;500;600&display=swap`;
  const nhapChung = chung.map((c) => `import ${c.component} from "@/components/khoi/${c.tenTep}";`);
  const dat = (ten: string) => chung.some((c) => c.component === ten);
  tep.push({
    duongDan: "src/app/layout.tsx",
    noiDung: `import type { Metadata } from "next";
import "./globals.css";
${nhapChung.join("\n")}

export const metadata: Metadata = {
  title: ${js(kienTruc.tenWebsite)},
  description: ${js(kienTruc.trang[0]?.mucDich.slice(0, 300) ?? kienTruc.tenWebsite)},
};

export default function LayoutGoc({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href=${js(fontUrl)} />
      </head>
      <body>
${dat("DauTrang") ? "        <DauTrang />" : ""}
        <main>{children}</main>
${dat("ChanTrang") ? "        <ChanTrang />" : ""}
${dat("LienHeNoi") ? "        <LienHeNoi />" : ""}
      </body>
    </html>
  );
}
`,
  });

  // Tuyến nhận khách để lại số.
  tep.push({
    duongDan: "src/app/api/lien-he/route.ts",
    noiDung: `import { NextResponse } from "next/server";

/**
 * Nhận số điện thoại khách để lại.
 *
 * CHUYỂN TIẾP, KHÔNG LƯU. Trang này là trang tĩnh nhiều mục, không có cơ sở
 * dữ liệu — lưu vào tệp trên máy chủ thì lần deploy sau là mất. Đặt
 * \`LEAD_WEBHOOK_URL\` (và \`LEAD_WEBHOOK_TOKEN\` nếu nơi nhận đòi) để số
 * khách chảy thẳng về bảng tính.
 *
 * CHƯA ĐẶT THÌ VẪN TRẢ THÀNH CÔNG và ghi cảnh báo vào nhật ký: người để lại
 * số không đáng phải chịu hậu quả của việc cấu hình chưa xong. Chủ trang thấy
 * cảnh báo trong log của máy chủ.
 */
export async function POST(yeuCau: Request): Promise<Response> {
  let than: { ten?: string; dienThoai?: string; nhuCau?: string };
  try {
    than = (await yeuCau.json()) as typeof than;
  } catch {
    return NextResponse.json({ loi: "Dữ liệu không đọc được." }, { status: 400 });
  }
  const ten = String(than.ten ?? "").trim().slice(0, 120);
  const dienThoai = String(than.dienThoai ?? "").trim().slice(0, 20);
  const nhuCau = String(than.nhuCau ?? "").trim().slice(0, 1000);
  if (!ten || !/^[0-9+ ().-]{8,20}$/.test(dienThoai)) {
    return NextResponse.json({ loi: "Thiếu họ tên hoặc số điện thoại." }, { status: 400 });
  }

  const dich = process.env.LEAD_WEBHOOK_URL;
  if (!dich) {
    console.warn("[lien-he] Chưa đặt LEAD_WEBHOOK_URL — khách:", { ten, dienThoai, nhuCau });
    return NextResponse.json({ ok: true, luuO: "nhat-ky" });
  }
  try {
    const dap = await fetch(dich, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.LEAD_WEBHOOK_TOKEN ? { authorization: \`Bearer \${process.env.LEAD_WEBHOOK_TOKEN}\` } : {}),
      },
      body: JSON.stringify({ ten, dienThoai, nhuCau, luc: new Date().toISOString() }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!dap.ok) {
      console.error("[lien-he] Nơi nhận trả HTTP", dap.status, { ten, dienThoai });
      return NextResponse.json({ ok: true, luuO: "nhat-ky" });
    }
    return NextResponse.json({ ok: true, luuO: "webhook" });
  } catch (loi) {
    console.error("[lien-he] Không gọi được nơi nhận:", loi, { ten, dienThoai });
    return NextResponse.json({ ok: true, luuO: "nhat-ky" });
  }
}
`,
  });

  // sitemap + robots: rẻ, và thiếu thì trang mới không ai tìm ra.
  const goc = (thongTin.diaChi?.replace(/\/+$/, "") || "https://example.com");
  tep.push({
    duongDan: "src/app/sitemap.ts",
    noiDung: `import type { MetadataRoute } from "next";

const GOC = process.env.NEXT_PUBLIC_DIA_CHI ?? ${js(goc)};

export default function sitemap(): MetadataRoute.Sitemap {
  return ${js(kienTruc.trang.map((t) => t.duong))}.map((duong) => ({
    url: \`\${GOC}\${duong === "/" ? "" : duong}\`,
    lastModified: new Date(),
  }));
}
`,
  });
  tep.push({
    duongDan: "src/app/robots.ts",
    noiDung: `import type { MetadataRoute } from "next";

const GOC = process.env.NEXT_PUBLIC_DIA_CHI ?? ${js(goc)};

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: \`\${GOC}/sitemap.xml\`,
  };
}
`,
  });

  tep.push({
    duongDan: "README.md",
    noiDung: `# ${kienTruc.tenWebsite}

Website do Antigravity dựng. Chạy thử trên máy:

\`\`\`bash
npm install
npm run dev
\`\`\`

Rồi mở http://localhost:3000

## Trước khi đưa lên mạng

- **Số điện thoại**: đang dùng \`${thongTin.dienThoai}\`. Sai thì sửa trong
  \`src/components/khoi/site-header.tsx\`, \`site-footer.tsx\`, \`lien-he-noi.tsx\`.
- **Khách để lại số**: đặt \`LEAD_WEBHOOK_URL\` (xem \`.env.example\`). Chưa đặt
  thì số khách chỉ nằm trong nhật ký máy chủ.
- **Địa chỉ thật**: đặt \`NEXT_PUBLIC_DIA_CHI\` để sitemap và robots trỏ đúng.
${kienTruc.duLieuCan.length > 0 ? `\n## Dữ liệu thật còn thiếu\n\n${kienTruc.duLieuCan.map((d) => `- ${d}`).join("\n")}\n` : ""}`,
  });

  return {
    cay: {
      tep,
      hopDong: {
        "src/app/globals.css": "Biến màu/nhịp/góc của cả trang: --nen, --chu, --nhan, --phu, --nhip, --bo",
        "src/components/khoi/*": "Mỗi tệp export default một component không nhận props",
      },
    },
    boQua,
    danhSachTep: tep.map((t) => t.duongDan),
  };
}
