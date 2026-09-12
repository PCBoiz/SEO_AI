import type { CayTep, TepSinh } from "./moi-truong-dung";
import type { KienTrucWeb } from "./kien-truc";
import type { HeThietKe } from "./he-thiet-ke";
import { timMauKhoi, type BoiCanhSinh, type NoiDungKhoi } from "./khoi/mau-khoi";
import { KHOA_MO_TA, chu } from "./khoi/kieu";
import { urlGoogleFont, type FontChoWeb } from "./font-web";
import { kichThuocAnh } from "./kich-thuoc-anh";
import { mauDocDuoc } from "./mau-an-toan";

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

/**
 * Bản Next.js/React đã chạy thật (12/09/2026).
 *
 * `next` 16.3.5 chứ không phải 16.2.11 như hai kho của dự án: bộ chuyển
 * Cloudflare (`@opennextjs/cloudflare` 1.20) đòi `>=16.3.3`, và đường Cloudflare
 * là đường MIỄN PHÍ duy nhất cho phép dùng thương mại (Vercel Hobby thì cấm).
 * Đã dựng thử thật với 16.3.5: `next build` đạt, worker Cloudflare chạy được
 * ở máy (`wrangler dev`), tuyến API vẫn trả lời.
 */
const PHIEN_BAN = {
  next: "16.3.5",
  react: "19.2.4",
  typescript: "5.9.3",
  types_node: "20.19.9",
  types_react: "19.2.2",
  tailwind: "4.1.14",
} as const;

/**
 * Bộ chuyển Cloudflare — bản đã chạy thật ở máy (vòng 32 và 44):
 * `opennextjs-cloudflare build` + `wrangler dev --local` phục vụ đủ trang,
 * API, sitemap. Đóng cứng như mọi phụ thuộc khác. Dùng ở cả HUONG-DAN trong
 * tệp nén lẫn `package.json` của kho đẩy lên GitHub — một chỗ, hai nơi đọc.
 */
export const PHIEN_BAN_CLOUDFLARE = {
  opennext: "1.20.6",
  wrangler: "4.131.1",
} as const;

export interface ThongTinTrang {
  /** Số điện thoại thật — KHÔNG để model bịa. */
  dienThoai: string;
  /** Địa chỉ Zalo (hoặc để trống thì rơi về link gọi). */
  zalo?: string;
  /** Địa chỉ website sẽ chạy, để dựng sitemap/robots. */
  diaChi?: string;
  /**
   * Nơi nhận khách để lại số — tuyến `/api/v1/lien-he/<dự án>` của chính
   * Antigravity, nếu dự án đã lập bảng khách Google Sheets.
   *
   * ⚠️ CHỈ ĐỊA CHỈ, KHÔNG KÈM TOKEN. Tệp nén này có thể đi tới tay khách; một
   * token ghi vào bảng của chủ dự án mà nằm sẵn trong đó là thứ không thu hồi
   * lại được. Chủ dự án tự dán token vào biến môi trường lúc đưa web lên mạng.
   */
  webhookKhach?: string;
}

/** Chữ cho từng khối: khoá là `"<đường trang>#<số thứ tự khối>"`. */
export type NoiDungTheoKhoi = Record<string, NoiDungKhoi>;

/**
 * Một tấm ảnh THẬT của chủ website, đã thu nhỏ cho web.
 *
 * Nguồn duy nhất: thư mục Google Drive của dự án. Không có ảnh thì trang
 * không có ảnh — KHÔNG sinh ảnh bằng AI (chủ dự án đã bác, 12/09).
 */
export interface AnhChoWeb {
  /** Tên tệp trong `public/anh/`, ví dụ `mat-tien.webp`. */
  ten: string;
  /** Chữ thay ảnh — người khiếm thị và Google đều đọc cái này. */
  alt: string;
  bytes: Buffer;
}

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

/**
 * Link Zalo người dùng gõ → link bấm được, hoặc `null` khi trống.
 *
 * Người không rành hay dán SỐ ĐIỆN THOẠI vào ô "Link Zalo" (đó là cách họ mở
 * Zalo hằng ngày). Bản đầu ghi thẳng vào `href` → `href="0912345678"` — một
 * link tương đối, bấm vào ra trang 404 của chính website. Số thì thành
 * `https://zalo.me/<số>`; thiếu `https://` thì thêm; còn lại giữ nguyên.
 */
export function chuanHoaZalo(vao: string | undefined): string | null {
  const s = (vao ?? "").trim();
  if (!s) return null;
  const so = s.replace(/[\s().-]/g, "");
  if (/^\+?\d{8,15}$/.test(so)) return `https://zalo.me/${so.replace(/^\+84/, "0")}`;
  if (/^zalo\.me\//i.test(s)) return `https://${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
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
            // `trien-khai/` chứa tệp cấu hình cho từng nơi chạy (Cloudflare…)
            // nhập gói CHƯA cài — để tsc kiểm chúng là báo lỗi giả.
            exclude: ["node_modules", "trien-khai"],
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
    {
      duongDan: "next.config.ts",
      noiDung: `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Đầu HTTP an toàn cho mọi trang. Không có gì "khoá" cả — chỉ tắt những
  // thứ một trang giới thiệu không bao giờ cần (nhúng vào trang khác, đoán
  // kiểu tệp, đọc vị trí/máy ảnh) để chúng không thành đường vào.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Font tự lưu: tên tệp mang mã băm nội dung — đổi font là đổi tên, nên
        // cache vĩnh viễn an toàn.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Ảnh: lần dựng sau có thể thay ảnh mới mà GIỮ tên — cache một ngày,
        // trong lúc hỏi lại thì dùng tạm bản cũ.
        source: "/anh/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
`,
    },
    { duongDan: "postcss.config.mjs", noiDung: `const config = {\n  plugins: {\n    "@tailwindcss/postcss": {},\n  },\n};\n\nexport default config;\n` },
    { duongDan: ".gitignore", noiDung: `node_modules\n.next\n.open-next\n.dev.vars\n.env*\n!.env.example\n` },
  ];
}

function tepMoiTruong(webhookKhach?: string): TepSinh {
  const khach = webhookKhach
    ? `# Khách để lại số trên website sẽ chảy về bảng Google Sheets của dự án.\n` +
      `# Địa chỉ dưới đây đã điền sẵn; TOKEN thì lấy ở Antigravity → trang dự án\n` +
      `# → thẻ "Khách liên hệ → Google Sheets". Chưa đặt token thì máy chủ chỉ\n` +
      `# ghi ra nhật ký, khách vẫn thấy "đã nhận".\n` +
      `LEAD_WEBHOOK_URL=${webhookKhach}\nLEAD_WEBHOOK_TOKEN=\n`
    : `# Nơi nhận khách để lại số. Chưa đặt thì máy chủ chỉ ghi ra nhật ký.\nLEAD_WEBHOOK_URL=\nLEAD_WEBHOOK_TOKEN=\n`;
  return {
    duongDan: ".env.example",
    noiDung:
      khach +
      `\n# Địa chỉ website khi đã lên mạng (sitemap, robots, thẻ chia sẻ). Để trống\n` +
      `# thì dùng địa chỉ ghi trong src/lib/thong-tin.ts.\nNEXT_PUBLIC_DIA_CHI=\n` +
      `\n# Mã Google Analytics dạng G-XXXXXXX — có thì đếm người vào trang. Để trống\n` +
      `# thì trang không nhúng gì của Google.\nNEXT_PUBLIC_GA_ID=\n`,
  };
}

/* ────────────────────────── Triển khai Cloudflare ──────────────────────── */

/**
 * Cấu hình để đưa website lên Cloudflare Workers — nơi chạy MIỄN PHÍ mà CHO
 * PHÉP dùng thương mại (Vercel Hobby thì cấm). Đã chạy thử thật 12/09/2026:
 * `opennextjs-cloudflare build` xong, `wrangler dev` phục vụ đủ trang + API.
 *
 * Để trong `trien-khai/cloudflare/` chứ không ở gốc: cấu hình này nhập gói
 * chưa cài (`@opennextjs/cloudflare`, thêm ~280 gói), và không phải ai cũng
 * dùng Cloudflare. Ai dùng thì chép hai tệp ra gốc theo HUONG-DAN.md.
 */
/**
 * Cache cho tệp tĩnh trên Cloudflare Workers.
 *
 * Mặc định Cloudflare phục vụ tệp tĩnh với `max-age=0, must-revalidate`: mỗi
 * lần xem lại, trình duyệt hỏi lại MỌI tệp JS/CSS/font/ảnh. OpenNext khuyên
 * đặt `public/_headers` cho `/_next/static/*` (tên có mã băm, cache vĩnh
 * viễn); thêm `/fonts/*` (tên cũng có mã băm) và `/anh/*` (một ngày — ảnh có
 * thể được thay mà giữ tên). Đã kiểm bằng `wrangler dev` 13/09: ba loại tệp
 * nhận đúng Cache-Control, còn `/_headers` không bị phục vụ ra ngoài (404).
 *
 * Chỉ dùng cho Cloudflare: trên VPS (`next start`) tệp này sẽ bị phục vụ như
 * một tệp thường, còn cache ở đó đã do `headers()` của next.config lo.
 */
export const HEADERS_CLOUDFLARE = `/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/anh/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
`;

function tepCloudflare(ten: string): TepSinh[] {
  const slug = lamSlug(ten);
  return [
    {
      duongDan: "trien-khai/cloudflare/wrangler.jsonc",
      noiDung:
        JSON.stringify(
          {
            $schema: "node_modules/wrangler/config-schema.json",
            name: slug,
            main: ".open-next/worker.js",
            compatibility_date: "2025-03-01",
            compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
            assets: { directory: ".open-next/assets", binding: "ASSETS" },
            services: [{ binding: "WORKER_SELF_REFERENCE", service: slug }],
          },
          null,
          2,
        ) + "\n",
    },
    {
      duongDan: "trien-khai/cloudflare/open-next.config.ts",
      noiDung: `import { defineCloudflareConfig } from "@opennextjs/cloudflare";\n\nexport default defineCloudflareConfig({});\n`,
    },
    { duongDan: "trien-khai/cloudflare/_headers", noiDung: HEADERS_CLOUDFLARE },
    {
      duongDan: "trien-khai/cloudflare/HUONG-DAN.md",
      noiDung: `# Đưa website lên Cloudflare (miễn phí, được phép dùng thương mại)

Chạy trong thư mục gốc của website, theo đúng thứ tự:

\`\`\`bash
npm install @opennextjs/cloudflare@${PHIEN_BAN_CLOUDFLARE.opennext}
npm install --save-dev wrangler@${PHIEN_BAN_CLOUDFLARE.wrangler}
cp trien-khai/cloudflare/wrangler.jsonc .
cp trien-khai/cloudflare/open-next.config.ts .
cp trien-khai/cloudflare/_headers public/   # cache tệp tĩnh — thiếu thì mỗi lần xem lại tải lại
echo NEXTJS_ENV=development > .dev.vars
npx opennextjs-cloudflare build     # dựng ra .open-next/
npx wrangler dev --local             # xem thử ở http://127.0.0.1:8787 (không cần tài khoản)
npx wrangler login                   # một lần, mở trình duyệt đăng nhập Cloudflare
npx opennextjs-cloudflare deploy     # đưa lên mạng
\`\`\`

Xong, Cloudflare in ra địa chỉ dạng \`${slug}.<tài-khoản>.workers.dev\`. Gắn tên
miền riêng: dash.cloudflare.com → Workers & Pages → website này → Settings →
Domains & Routes.

Biến môi trường (khách để lại số chảy về bảng tính): Settings → Variables and
Secrets → thêm \`LEAD_WEBHOOK_URL\` và \`LEAD_WEBHOOK_TOKEN\` → Deploy lại.

Lưu ý: bản miễn phí giới hạn 100.000 lượt gọi/ngày cho phần chạy động và 500
lượt dựng/tháng — dư cho một trang giới thiệu.
`,
    },
  ];
}

/* ───────────────────────────── Hệ thiết kế ─────────────────────────────── */

const NHIP: Record<HeThietKe["khoangCach"], string> = { thoang: "6rem", vua: "4.5rem", chat: "3rem" };
const BO: Record<HeThietKe["goc"], string> = { vuong: "0", "bo-nhe": "0.5rem", tron: "1rem" };

function tepCss(tk: HeThietKe, fontCss?: string): TepSinh {
  // Màu đã qua lưới "đọc được" — giữ nguyên nếu đạt, chỉnh vừa đủ nếu chưa.
  const docDuoc = mauDocDuoc(tk);
  return {
    duongDan: "src/app/globals.css",
    noiDung: `@import "tailwindcss";
${
  fontCss
    ? `
/* Font tự lưu trong website (public/fonts/) — không tải từ Google lúc xem
   trang, không chặn hiển thị. Nguồn: Google Fonts, giấy phép OFL/Apache. */
${fontCss}
`
    : ""
}
/* ===========================================================================
   HỆ THIẾT KẾ — do bước "Dựng web · Hệ thiết kế" chọn, đã kiểm tương phản.
   Sửa bốn biến màu bên dưới là đổi cả trang; đừng rải mã màu vào từng khối.
   =========================================================================== */
:root {
  --nen: ${tk.mau.nen};
  --chu: ${docDuoc.chu};
  --nhan: ${tk.mau.nhan};
  --phu: ${docDuoc.phu};
  /* Chữ trên nền màu nhấn (nút chính) và màu nhấn khi làm CHỮ (liên kết):
     chọn/chỉnh tự động cho đủ 4,5:1 — xem mau-an-toan.ts. */
  --chu-tren-nhan: ${docDuoc.chuTrenNhan};
  --nhan-chu: ${docDuoc.nhanChu};
  --vien: color-mix(in oklab, var(--chu) 18%, transparent);
  --nen-nhe: color-mix(in oklab, var(--chu) 5%, var(--nen));
  --canh: ${docDuoc.canh};
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
.chu-nhan { color: var(--nhan-chu); }
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
.nut-chinh { background: var(--nhan); color: var(--chu-tren-nhan); }
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

/* ─────────────────────── Thông tin, meta, icon, 404 ────────────────────── */

/**
 * `src/lib/thong-tin.ts` — MỘT CHỖ cho tên, số điện thoại, Zalo, địa chỉ web.
 *
 * Mọi khuôn khối, thẻ meta, sitemap đọc từ đây lúc chạy. Chủ website đổi số
 * là sửa một dòng; không có chuyện một nút gọi ở chân trang còn số cũ.
 *
 * `src/lib/meta.ts` — thẻ meta cho từng trang, KÈM Open Graph: Zalo và
 * Facebook đọc `og:title`/`og:image` để dựng ô xem trước khi ai đó dán link.
 * Không có thì link chia sẻ chỉ là một dòng địa chỉ trần — với khách Việt
 * (chia sẻ qua Zalo là chính) đây là mặt tiền thứ hai của website.
 */
/**
 * Ảnh chia sẻ kèm kích thước thật: Zalo/Facebook dựng ô xem trước ngay lần
 * dán link đầu tiên, không phải tải ảnh về đo trước.
 */
function anhChiaSeJson(a: AnhChoWeb): { url: string; alt: string; width?: number; height?: number } {
  const kt = kichThuocAnh(a.bytes);
  return { url: `/anh/${a.ten}`, alt: a.alt, ...(kt ? { width: kt.rong, height: kt.cao } : {}) };
}

function tepThongTin(
  ten: string,
  thongTin: ThongTinTrang,
  goc: string,
  anhChiaSe: AnhChoWeb | undefined,
): TepSinh[] {
  const zalo = chuanHoaZalo(thongTin.zalo);
  return [
    {
      duongDan: "src/lib/thong-tin.ts",
      noiDung: `/**
 * THÔNG TIN LIÊN HỆ — SỬA MỘT CHỖ, CẢ TRANG ĐỔI THEO.
 *
 * Mọi nút gọi, link Zalo, tên ở đầu/chân trang, thẻ chia sẻ, sitemap đều đọc
 * từ đây. Đừng gõ số điện thoại vào từng khối.
 */
export const THONG_TIN = {
  /** Tên hiện ở đầu trang, chân trang, tab trình duyệt và khi chia sẻ link. */
  ten: ${js(ten)},
  /** Số hiện trên nút gọi — giữ khoảng trắng cho dễ đọc, link gọi tự bỏ. */
  dienThoai: ${js(thongTin.dienThoai)},
  /** Link Zalo, ví dụ "https://zalo.me/0912345678". \`null\` thì không có nút Zalo. */
  zalo: ${js(zalo)} as string | null,
  /** Địa chỉ website khi đã lên mạng (biến môi trường NEXT_PUBLIC_DIA_CHI thắng). */
  diaChi: ${js(goc)},
};

/** Link bấm để gọi: \`tel:\` + số đã bỏ khoảng trắng. */
export const LINK_GOI = \`tel:\${THONG_TIN.dienThoai.replace(/\\s+/g, "")}\`;
`,
    },
    {
      duongDan: "src/lib/meta.ts",
      noiDung: `import type { Metadata } from "next";
import { THONG_TIN } from "./thong-tin";

/** Gốc địa chỉ: biến môi trường thắng, để cùng mã nguồn chạy được ở nhiều nơi. */
export const GOC = (process.env.NEXT_PUBLIC_DIA_CHI || THONG_TIN.diaChi).replace(/\\/+$/, "");

/** Ảnh hiện trong ô xem trước khi chia sẻ link (tấm đầu tiên trong public/anh/). */
const ANH_CHIA_SE = ${anhChiaSe ? js(anhChiaSeJson(anhChiaSe)) : "null"};

function gocHopLe(): URL {
  try {
    return new URL(GOC);
  } catch {
    return new URL("https://example.com");
  }
}

/**
 * Thẻ meta cho một trang: tiêu đề, mô tả, canonical và Open Graph.
 *
 * Open Graph là thứ Zalo/Facebook đọc để dựng ô xem trước khi dán link. Next
 * KHÔNG gộp sâu \`openGraph\` giữa layout và trang (trang khai là thay cả cụm),
 * nên mỗi trang gọi hàm này để có đủ cụm.
 */
export function meta(tieuDe: string, moTa: string, duong: string): Metadata {
  const title = duong === "/" ? THONG_TIN.ten : \`\${tieuDe} · \${THONG_TIN.ten}\`;
  return {
    metadataBase: gocHopLe(),
    title,
    description: moTa,
    alternates: { canonical: duong },
    openGraph: {
      title,
      description: moTa,
      url: duong,
      siteName: THONG_TIN.ten,
      locale: "vi_VN",
      type: "website",
      ...(ANH_CHIA_SE ? { images: [ANH_CHIA_SE] } : {}),
    },
  };
}
`,
    },
  ];
}

/**
 * Biểu tượng tab trình duyệt: chữ cái đầu của tên trên nền màu nhấn. SVG tĩnh
 * — không cần \`next/og\`, không cần chạy gì lúc build, mọi nơi chạy đều phục vụ
 * được. Không có thì tab hiện một quả cầu xám: trông như trang chưa xong.
 */
function tepIcon(ten: string, tk: HeThietKe): TepSinh {
  const chuDau = ([...ten.trim()].find((c) => /\p{L}/u.test(c)) ?? "W").toUpperCase();
  const anToan = chuDau.replace(/[<>&"']/g, "");
  return {
    duongDan: "src/app/icon.svg",
    noiDung: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${tk.mau.nhan}"/>
  <text x="32" y="45" text-anchor="middle" font-family="${tk.font.tieuDe}, Georgia, serif" font-size="38" font-weight="600" fill="${tk.mau.nen}">${anToan}</text>
</svg>
`,
  };
}

/**
 * Báo trước font chữ thường cần ngay khi vẽ — `ReactDOM.preload` trong một
 * component client, đúng cách tài liệu Next khuyên cho `<link rel="preload">`.
 *
 * Bản đầu ghi thẳng `<link rel="preload">` vào `<head>` của layout: đọc HTML
 * trả về trên Cloudflare 13/09 thấy MỖI tệp ra HAI thẻ (React tự chèn thêm một
 * bản). Trình duyệt không tải hai lần, nhưng head rối và dễ bị báo "tải trước
 * mà không dùng".
 */
function tepTaiTruocFont(taiTruoc: readonly string[]): TepSinh {
  return {
    duongDan: "src/components/tai-truoc-font.tsx",
    noiDung: `"use client";

import ReactDOM from "react-dom";

const TEP = ${js(taiTruoc.map((ten) => `/fonts/${ten}`))} as const;

export default function TaiTruocFont() {
  for (const href of TEP) ReactDOM.preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return null;
}
`,
  };
}

/** Trang 404 bằng tiếng Việt, đúng hệ thiết kế, có lối về và nút gọi. */
function tepKhongTimThay(): TepSinh {
  return {
    duongDan: "src/app/not-found.tsx",
    noiDung: `import Link from "next/link";
import { THONG_TIN, LINK_GOI } from "@/lib/thong-tin";

export default function KhongTimThay() {
  return (
    <section className="nhip">
      <div className="khung max-w-[46rem]">
        <p className="chu-phu text-sm">Lỗi 404</p>
        <h1 className="tieu-de mt-3 text-4xl leading-tight md:text-5xl">Trang này không có</h1>
        <p className="chu-phu mt-4 leading-relaxed">
          Có thể link đã cũ hoặc gõ nhầm. Về trang chủ, hoặc gọi thẳng cho chúng tôi.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="nut nut-chinh">Về trang chủ</Link>
          <a href={LINK_GOI} className="nut nut-phu">{\`Gọi \${THONG_TIN.dienThoai}\`}</a>
        </div>
      </div>
    </section>
  );
}
`,
  };
}

/* ──────────────────────────────── Dựng ─────────────────────────────────── */

export function dungCayTep(
  kienTruc: KienTrucWeb,
  thietKe: HeThietKe,
  thongTin: ThongTinTrang,
  noiDung: NoiDungTheoKhoi = {},
  anh: readonly AnhChoWeb[] = [],
  /** Font tự lưu (xem font-web.ts); null = nạp CSS font từ Google bằng thẻ link. */
  font: FontChoWeb | null = null,
): KetQuaDungCay {
  // Tên tệp ảnh đi thẳng vào đường dẫn: chỉ cho chữ–số–gạch–chấm, và bỏ tấm
  // nào trùng tên. Tên do người dùng đặt trên Drive, không tin được.
  const anhSach: AnhChoWeb[] = [];
  const daCoTen = new Set<string>();
  for (const a of anh) {
    const ten = a.ten.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^[.-]+/, "").slice(0, 80);
    if (!ten || daCoTen.has(ten)) continue;
    daCoTen.add(ten);
    anhSach.push({ ...a, ten });
  }

  const ctx: BoiCanhSinh = {
    tenWebsite: kienTruc.tenWebsite,
    dienThoai: thongTin.dienThoai,
    zalo: chuanHoaZalo(thongTin.zalo),
    trang: kienTruc.trang.map((t) => ({ duong: t.duong, tieuDe: t.tieuDe })),
    anh: anhSach.map((a) => {
      // Kích thước thật đọc từ đầu tệp — để thẻ img có width/height.
      const kt = kichThuocAnh(a.bytes);
      return { ten: a.ten, alt: a.alt, ...(kt ? { rong: kt.rong, cao: kt.cao } : {}) };
    }),
  };

  const goc = thongTin.diaChi?.replace(/\/+$/, "") || "https://example.com";
  const tep: TepSinh[] = [
    ...tepCauHinh(kienTruc.tenWebsite),
    tepMoiTruong(thongTin.webhookKhach),
    tepCss(thietKe, font?.css),
    ...tepCloudflare(kienTruc.tenWebsite),
    ...tepThongTin(kienTruc.tenWebsite, thongTin, goc, anhSach[0]),
    tepIcon(kienTruc.tenWebsite, thietKe),
    tepKhongTimThay(),
  ];
  for (const a of anhSach) tep.push({ duongDan: `public/anh/${a.ten}`, noiDung: a.bytes });
  for (const f of font?.tep ?? []) tep.push({ duongDan: `public/fonts/${f.ten}`, noiDung: f.bytes });
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
      noiDung: `import { meta } from "@/lib/meta";
${[...new Set(nhap)].join("\n")}

export const metadata = meta(${js(trang.tieuDe)}, ${js(trang.mucDich.slice(0, 300))}, ${js(trang.duong)});

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
  const fontUrl = urlGoogleFont(thietKe);
  // Có font tự lưu: báo trước vài tệp chữ thường cần ngay khi vẽ, qua component
  // `TaiTruocFont` (xem tepTaiTruocFont). Không có (tải font hỏng lúc sinh mã):
  // nạp CSS từ Google như bản đầu — chậm hơn, nhưng không mất font.
  const coTaiTruoc = Boolean(font && font.taiTruoc.length > 0);
  if (font && coTaiTruoc) tep.push(tepTaiTruocFont(font.taiTruoc));
  const theFont = font
    ? ""
    : [
        `        <link rel="preconnect" href="https://fonts.googleapis.com" />`,
        `        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />`,
        `        <link rel="stylesheet" href=${js(fontUrl)} />`,
      ].join("\n");
  const nhapChung = chung.map((c) => `import ${c.component} from "@/components/khoi/${c.tenTep}";`);
  const dat = (ten: string) => chung.some((c) => c.component === ten);
  // Khối chung KHÔNG có chỗ cố định (dữ liệu có cấu trúc, marquee…) — vẽ ở
  // cuối body. Bản đầu chỉ vẽ ba khối quen tên; `du-lieu-co-cau-truc` được
  // nhập vào layout rồi… không bao giờ được vẽ. tsc không bắt (nhập thừa
  // không phải lỗi kiểu), soát cũng không — chỉ khi đọc HTML trả về mới thấy
  // thiếu hẳn JSON-LD. Giờ soát có luật riêng cho chuyện nhập-mà-không-dùng.
  const chungKhac = chung.filter((c) => !["DauTrang", "ChanTrang", "LienHeNoi"].includes(c.component));
  tep.push({
    duongDan: "src/app/layout.tsx",
    noiDung: `import type { Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { meta } from "@/lib/meta";
${coTaiTruoc ? `import TaiTruocFont from "@/components/tai-truoc-font";\n` : ""}${nhapChung.join("\n")}

// Thẻ meta mặc định cho trang nào không tự khai (ví dụ trang 404).
export const metadata = meta(${js(kienTruc.trang[0]?.tieuDe ?? "Trang chủ")}, ${js(kienTruc.trang[0]?.mucDich.slice(0, 300) ?? kienTruc.tenWebsite)}, "/");

// Màu thanh địa chỉ trên điện thoại khớp màu nền — không có thì Chrome/Safari
// vẽ một dải trắng chói trên nền tối.
export const viewport: Viewport = { themeColor: ${js(thietKe.mau.nen)} };

// Đo lượt xem bằng Google Analytics — CHỈ khi đặt NEXT_PUBLIC_GA_ID. Không đặt
// thì trang không tải một byte nào từ Google.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function LayoutGoc({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
${theFont}
      </head>
      <body>
${coTaiTruoc ? "        <TaiTruocFont />" : ""}
${dat("DauTrang") ? "        <DauTrang />" : ""}
        <main>{children}</main>
${dat("ChanTrang") ? "        <ChanTrang />" : ""}
${dat("LienHeNoi") ? "        <LienHeNoi />" : ""}
${chungKhac.map((c) => `        <${c.component} />`).join("\n")}
        {GA_ID ? (
          <>
            <Script src={\`https://www.googletagmanager.com/gtag/js?id=\${GA_ID}\`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {\`window.dataLayer = window.dataLayer || []; function gtag(){ dataLayer.push(arguments); } gtag("js", new Date()); gtag("config", "\${GA_ID}");\`}
            </Script>
          </>
        ) : null}
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
/**
 * Giới hạn nhịp theo IP, giữ trong bộ nhớ: 5 lượt / 10 phút.
 *
 * Đủ cho người thật (không ai để lại số 6 lần trong 10 phút) và chặn được bot
 * nhồi rác vào bảng khách của chủ website. Bộ nhớ mất khi máy chủ khởi động
 * lại — chấp nhận được, đây là lưới chứ không phải tường.
 */
const LUOT = new Map<string, number[]>();
const TOI_DA = 5;
const CUA_SO_MS = 10 * 60_000;

function vuotNhip(ip: string): boolean {
  const bayGio = Date.now();
  const cu = (LUOT.get(ip) ?? []).filter((t) => bayGio - t < CUA_SO_MS);
  if (cu.length >= TOI_DA) {
    LUOT.set(ip, cu);
    return true;
  }
  cu.push(bayGio);
  LUOT.set(ip, cu);
  if (LUOT.size > 5_000) LUOT.delete(LUOT.keys().next().value!);
  return false;
}

export async function POST(yeuCau: Request): Promise<Response> {
  const ip = yeuCau.headers.get("cf-connecting-ip") ?? yeuCau.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  if (vuotNhip(ip)) {
    return NextResponse.json({ loi: "Gửi quá nhanh, thử lại sau ít phút." }, { status: 429 });
  }

  let than: { ten?: string; dienThoai?: string; nhuCau?: string; diaChiWeb?: string };
  try {
    than = (await yeuCau.json()) as typeof than;
  } catch {
    return NextResponse.json({ loi: "Dữ liệu không đọc được." }, { status: 400 });
  }
  // BẪY BOT: ô "diaChiWeb" ẩn khỏi người thật (xem biểu mẫu). Bot điền mọi ô
  // nên ô này có chữ = bot. Trả "ok" để nó tưởng đã xong và không thử cách khác.
  if (String(than.diaChiWeb ?? "").trim()) {
    return NextResponse.json({ ok: true, luuO: "bo-qua" });
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
  tep.push({
    duongDan: "src/app/sitemap.ts",
    noiDung: `import type { MetadataRoute } from "next";
import { GOC } from "@/lib/meta";

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
import { GOC } from "@/lib/meta";

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

- **Tên, số điện thoại, Zalo, tên miền**: tất cả ở MỘT tệp
  \`src/lib/thong-tin.ts\` (đang dùng số \`${thongTin.dienThoai}\`). Sửa ở đó,
  cả trang đổi theo — mọi nút gọi, chân trang, thẻ chia sẻ, sitemap.
- **Đo lượt xem**: đặt \`NEXT_PUBLIC_GA_ID\` (mã G-… của Google Analytics) nếu
  muốn. Không đặt thì trang không nhúng gì của Google.
- **Khách để lại số**: ${
      thongTin.webhookKhach
        ? `\`.env.example\` đã điền sẵn địa chỉ nhận (bảng Google Sheets của dự án).
  Chỉ cần dán thêm \`LEAD_WEBHOOK_TOKEN\` lấy ở Antigravity → trang dự án → thẻ
  "Khách liên hệ → Google Sheets".`
        : "đặt \`LEAD_WEBHOOK_URL\` (xem \`.env.example\`). Chưa đặt thì số khách chỉ nằm\n  trong nhật ký máy chủ."
    }
- **Địa chỉ thật**: đặt \`NEXT_PUBLIC_DIA_CHI\` để sitemap và robots trỏ đúng.
- **Đưa lên mạng miễn phí (được phép dùng thương mại)**: xem
  \`trien-khai/cloudflare/HUONG-DAN.md\`. Bản miễn phí của Vercel **không** được
  dùng cho trang thương mại.
${kienTruc.duLieuCan.length > 0 ? `\n## Dữ liệu thật còn thiếu\n\n${kienTruc.duLieuCan.map((d) => `- ${d}`).join("\n")}\n` : ""}`,
  });

  return {
    cay: {
      tep,
      hopDong: {
        "src/lib/thong-tin.ts": "Tên, số điện thoại, Zalo, địa chỉ web — sửa MỘT chỗ, cả trang đổi theo",
        "src/app/globals.css": "Biến màu/nhịp/góc của cả trang: --nen, --chu, --nhan, --phu, --nhip, --bo",
        "src/components/khoi/*": "Mỗi tệp export default một component không nhận props",
      },
    },
    boQua,
    danhSachTep: tep.map((t) => t.duongDan),
  };
}
