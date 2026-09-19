import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, posix } from "node:path";
import { compile } from "tailwindcss";
import { transform } from "sucrase";
import { h, type ComponentType } from "preact";
import * as preactCompat from "preact/compat";
import * as preactJsx from "preact/jsx-runtime";
import { renderToString } from "preact-render-to-string";
import type { CayTep } from "@/domain/dung-web/moi-truong-dung";
import { thuMucTrang } from "@/domain/dung-web/dung-cay-tep";

/**
 * VẼ MỘT TRANG CỦA WEBSITE KHÁCH THÀNH HTML TĨNH — không `npm install`, không
 * `next dev`, không tiến trình con. Chạy được ở mọi nơi Antigravity chạy, kể
 * cả Vercel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO LÀM ĐƯỢC, VÀ VÌ SAO CẦN
 *
 * Chủ dự án hỏi (18/09/2026): "có cách nào xem trực tiếp website mà chưa cần
 * đẩy đi đâu không — chắc gì tạo bản mẫu phát là ưng luôn". Câu hỏi đúng: bản
 * xem thử cũ (`moi-truong-may.ts`) chạy `next dev` thật nên chỉ có khi
 * Antigravity chạy trên máy; bản Vercel — bản chị dùng — trả 501.
 *
 * Làm được vì mã trang khách KHÔNG do model viết tự do: nó được ghép từ các
 * khuôn khối cố định (`domain/dung-web/khoi/mau-khoi.ts`), chỉ dùng React +
 * lớp CSS trong `globals.css` + tiện ích Tailwind, không phụ thuộc ngoài. Nên
 * ba bước là đủ:
 *   1. sucrase: TSX → JS (chỉ bỏ kiểu và dịch JSX, ~1 ms một tệp);
 *   2. preact/compat + preact-render-to-string: chạy component, ra HTML;
 *   3. tailwindcss (API JS của v4, cùng gói kho đang dùng): biên dịch đúng
 *      những lớp có trong HTML — 26 ms lần đầu, vài ms các lần sau.
 * Cả ba là thư viện thuần JS; đo ngày 18/09: dưới 50 ms một trang.
 *
 * VÌ SAO PREACT CHỨ KHÔNG PHẢI REACT
 *
 * Tuyến API của Next 16 được biên dịch và CHẠY theo điều kiện `react-server`:
 * `react-dom/server` bị chặn lúc biên dịch, và `require("react")` lúc chạy
 * trả bản RSC không có `useState` (đo 18/09 — kể cả qua `createRequire`).
 * Preact không dính điều kiện đó, nhỏ (4 KB), và với mã khuôn (className,
 * htmlFor, srcSet, useState, style) cho ra HTML y hệt.
 *
 * KHÔNG PHẢI BẢN THẬT — nói rõ ở giao diện: không có JS phía khách (biểu mẫu
 * không gửi, không cuộn mượt), ảnh không qua bộ tối ưu của Next, font nạp từ
 * Google thay vì tự lưu. Bố cục, chữ, màu, ảnh, liên kết: đúng như bản thật.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type KetQuaVe =
  | { ok: true; html: string; tieuDe: string }
  | { ok: false; loi: string };

export interface TuyChonVe {
  /**
   * Tiền tố gắn trước mọi liên kết nội bộ và ảnh (`/bang-gia` →
   * `<tienTo>/bang-gia`, `/anh/x.webp` → `<tienTo>/anh/x.webp`), để trang
   * trong iframe trỏ về đúng tuyến xem thử thay vì về gốc Antigravity.
   */
  tienTo: string;
  /** Nonce cho đoạn script nhỏ trong trang (Content-Security-Policy). */
  nonce: string;
}

type ModuleRa = Record<string, unknown>;

/** Mô-đun có sẵn thay cho gói thật — chỉ những gì khuôn khối dùng. */
function moDunCoSan(): Record<string, ModuleRa> {
  /** Bỏ những prop chỉ Next hiểu — vào thẻ HTML thường thì thành thuộc tính rác. */
  const bo = (p: Record<string, unknown>, ...khoa: string[]) => {
    const con = { ...p };
    for (const k of khoa) delete con[k];
    return con;
  };
  const Link = (p: Record<string, unknown>) => {
    const { href, children } = p;
    return h("a", { ...bo(p, "href", "children", "prefetch", "replace", "scroll"), href: String(href ?? "#") }, children as never);
  };
  const Image = (p: Record<string, unknown>) => {
    const { src } = p;
    const nguon = typeof src === "string" ? src : ((src as { src?: string } | null)?.src ?? "");
    return h("img", { ...bo(p, "src", "fill", "priority", "quality", "placeholder", "blurDataURL", "loader", "unoptimized"), src: nguon });
  };
  const KhongVe = () => null;
  return {
    react: preactCompat as unknown as ModuleRa,
    "react-dom": preactCompat as unknown as ModuleRa,
    "react/jsx-runtime": preactJsx as unknown as ModuleRa,
    "react/jsx-dev-runtime": preactJsx as unknown as ModuleRa,
    "next/link": { __esModule: true, default: Link },
    "next/image": { __esModule: true, default: Image },
    "next/script": { __esModule: true, default: KhongVe },
    next: { __esModule: true },
    "next/navigation": { __esModule: true, notFound: () => undefined },
    "next/headers": { __esModule: true },
  };
}

/** `process` giả cho mã khách: không biến môi trường nào (GA tắt, địa chỉ lấy từ thong-tin.ts). */
const PROCESS_GIA = { env: {} as Record<string, string | undefined> };

/**
 * Bộ nạp mô-đun cho cây tệp trong bộ nhớ: `@/x` → `src/x(.tsx|.ts)`,
 * `./y` tương đối với tệp đang nạp, `*.css` → rỗng, gói ngoài → bản có sẵn.
 */
function taoBoNap(tep: ReadonlyMap<string, string>): (spec: string, tu: string) => ModuleRa {
  const coSan = moDunCoSan();
  const daNap = new Map<string, { exports: ModuleRa }>();

  function timTep(goc: string): string | null {
    for (const duoi of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
      if (tep.has(goc + duoi)) return goc + duoi;
    }
    return null;
  }

  function nap(spec: string, tu: string): ModuleRa {
    if (spec in coSan) return coSan[spec]!;
    if (/\.css$/i.test(spec)) return {};
    let duong: string | null = null;
    if (spec.startsWith("@/")) duong = timTep(`src/${spec.slice(2)}`);
    else if (spec.startsWith(".")) duong = timTep(posix.normalize(posix.join(posix.dirname(tu), spec)));
    if (!duong) throw new Error(`Bản xem thử không nạp được "${spec}" (từ ${tu}).`);

    const daCo = daNap.get(duong);
    if (daCo) return daCo.exports;

    const js = transform(tep.get(duong)!, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "automatic",
      production: true,
      disableESTransforms: true,
      filePath: duong,
    }).code;
    const moDun = { exports: {} as ModuleRa };
    // Ghi vào kho TRƯỚC khi chạy: hai tệp nhập lẫn nhau thì không lặp vô hạn.
    daNap.set(duong, moDun);
    const chay = new Function("require", "module", "exports", "process", js) as (
      require: (s: string) => ModuleRa,
      module: { exports: ModuleRa },
      exports: ModuleRa,
      process: typeof PROCESS_GIA,
    ) => void;
    chay((s) => nap(s, duong!), moDun, moDun.exports, PROCESS_GIA);
    return moDun.exports;
  }
  return nap;
}

/* ─────────────────────────── Tailwind trên máy chủ ─────────────────────── */

type TrinhBienDich = Awaited<ReturnType<typeof compile>>;

let gocTailwind: string | null = null;
function thuMucTailwind(): string {
  if (gocTailwind) return gocTailwind;
  try {
    // `require` thật (không qua bộ đóng gói) để tìm thư mục gói. Gốc là
    // `process.cwd()` chứ KHÔNG phải `import.meta.url`: trong gói Turbopack
    // `import.meta.url` bị đổi thành đường giả `[project]/…` (đo 18/09/2026:
    // ENOENT `…/[project]/node_modules/tailwindcss/index.css`). Ba tệp CSS
    // của Tailwind khai trong `outputFileTracingIncludes` để bản Vercel mang theo.
    gocTailwind = dirname(createRequire(join(process.cwd(), "package.json")).resolve("tailwindcss/package.json"));
  } catch {
    gocTailwind = join(process.cwd(), "node_modules", "tailwindcss");
  }
  return gocTailwind;
}

/** Trình biên dịch theo nội dung `globals.css` — mỗi hệ thiết kế một cái, giữ vài cái gần nhất. */
const KHO_BIEN_DICH = new Map<string, Promise<TrinhBienDich>>();

async function trinhBienDich(cssNguon: string): Promise<TrinhBienDich> {
  const daCo = KHO_BIEN_DICH.get(cssNguon);
  if (daCo) return daCo;
  const goc = thuMucTailwind();
  const hua = compile(cssNguon, {
    base: goc,
    async loadStylesheet(id, base) {
      const duong = id === "tailwindcss" ? join(goc, "index.css") : join(base, id);
      return { path: duong, base: dirname(duong), content: await readFile(duong, "utf8") };
    },
    async loadModule(id) {
      throw new Error(`Bản xem thử không nạp plugin Tailwind (${id}).`);
    },
  });
  KHO_BIEN_DICH.set(cssNguon, hua);
  if (KHO_BIEN_DICH.size > 8) KHO_BIEN_DICH.delete(KHO_BIEN_DICH.keys().next().value!);
  // Biên dịch hỏng thì không giữ lại — lần sau thử lại từ đầu.
  hua.catch(() => KHO_BIEN_DICH.delete(cssNguon));
  return hua;
}

/** Mọi lớp CSS xuất hiện trong `class="…"` của HTML — ứng viên cho Tailwind. */
export function lopTrongHtml(html: string): string[] {
  const ra = new Set<string>();
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) {
    for (const lop of m[1]!.split(/\s+/)) if (lop) ra.add(lop);
  }
  return [...ra];
}

/* ─────────────────────────────── Vẽ trang ──────────────────────────────── */

function thoatHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Đổi liên kết nội bộ và ảnh sang tuyến xem thử. */
export function doiDuongDan(html: string, tienTo: string): string {
  // Một lượt duy nhất cho href/src: `/` → tiền tố, `/x` → tiền tố + `/x`.
  // Hai lượt nối nhau sẽ gắn tiền tố hai lần, vì tiền tố cũng bắt đầu bằng `/`.
  const doi = (gia: string) => (gia === "/" ? tienTo : `${tienTo}${gia}`);
  return html
    .replace(/\s(href|src)="(\/(?!\/)[^"]*)"/g, (_, thuoc: string, gia: string) => ` ${thuoc}="${doi(gia)}"`)
    .replace(/\ssrcset="([^"]*)"/g, (_, gia: string) => ` srcset="${gia.replace(/(^|,\s*)(\/(?!\/)\S*)/g, (__, dau: string, u: string) => `${dau}${doi(u)}`)}"`);
}

/**
 * Vẽ trang `duong` của cây tệp thành một tài liệu HTML tự chứa: CSS đã biên
 * dịch nằm trong `<style>`, liên kết/ảnh trỏ về `tienTo`, một đoạn script nhỏ
 * báo trang đang xem cho khung ngoài và chặn gửi biểu mẫu.
 */
export async function veTrangTinh(cay: CayTep, duong: string, tuyChon: TuyChonVe): Promise<KetQuaVe> {
  const tep = new Map<string, string>();
  for (const t of cay.tep) if (typeof t.noiDung === "string") tep.set(t.duongDan, t.noiDung);

  const tepTrang = thuMucTrang(duong);
  if (!tep.has(tepTrang)) return { ok: false, loi: `Website không có trang "${duong}".` };
  const cssNguon = tep.get("src/app/globals.css");
  if (!cssNguon || !tep.has("src/app/layout.tsx")) return { ok: false, loi: "Cây tệp thiếu layout hoặc globals.css." };

  let than: string;
  let tieuDe: string;
  try {
    const nap = taoBoNap(tep);
    const layout = nap("@/app/layout", "src/app/page.tsx");
    const trang = nap(`@/${tepTrang.slice(4, -4)}`, "src/app/page.tsx");
    const Layout = layout.default as ComponentType<{ children?: unknown }>;
    const Trang = trang.default as ComponentType;
    if (typeof Layout !== "function" || typeof Trang !== "function") {
      return { ok: false, loi: "Layout hoặc trang không xuất component mặc định." };
    }
    const meta = (trang.metadata ?? layout.metadata) as { title?: unknown } | undefined;
    tieuDe = typeof meta?.title === "string" ? meta.title : duong;
    than = renderToString(h(Layout, null, h(Trang, null)));
  } catch (loi) {
    return { ok: false, loi: `Không vẽ được trang: ${loi instanceof Error ? loi.message : String(loi)}` };
  }

  let css: string;
  try {
    css = (await trinhBienDich(cssNguon)).build(lopTrongHtml(than));
  } catch (loi) {
    return { ok: false, loi: `Không biên dịch được CSS: ${loi instanceof Error ? loi.message : String(loi)}` };
  }

  const { tienTo, nonce } = tuyChon;
  const dau = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1">`,
    `<title>${thoatHtml(tieuDe)}</title>`,
    tep.has("src/app/icon.svg") ? `<link rel="icon" href="${tienTo}/icon.svg" type="image/svg+xml">` : "",
    `<style>${css}</style>`,
  ].join("");
  // Báo trang đang xem cho khung ngoài (để tô đúng tab), và chặn gửi biểu mẫu:
  // bản xem thử không có máy chủ nhận.
  const script =
    `<script nonce="${nonce}">(function(){` +
    `try{parent.postMessage({loai:"xem-truoc-web",duong:${JSON.stringify(duong)}},location.origin)}catch(e){}` +
    `document.addEventListener("submit",function(e){e.preventDefault();var n=document.getElementById("xem-truoc-bao");if(n)n.hidden=false});` +
    `})()</script>`;
  const bao =
    `<div id="xem-truoc-bao" hidden role="status" style="position:fixed;left:50%;bottom:5.5rem;transform:translateX(-50%);` +
    `max-width:calc(100% - 2rem);padding:.75rem 1rem;border-radius:.5rem;background:#111;color:#fff;font:14px/1.4 system-ui,sans-serif;z-index:99">` +
    `Đây là bản xem thử — biểu mẫu sẽ gửi được khi website lên mạng.</div>`;

  let html = doiDuongDan(than, tienTo);
  // CSS font Google trong <head> CHẶN vẽ trang tới khi tải xong (đo 19/09: khung
  // trắng 1–3 s). Đưa xuống cuối body: chữ hiện ngay bằng font hệ thống, font
  // thật tới thì đổi (`display=swap` có sẵn trong địa chỉ). Trang thật không
  // gặp chuyện này vì tự lưu font.
  const linkFont: string[] = [];
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*"\/?>/g, (m) => {
    linkFont.push(m);
    return "";
  });
  html = html.includes("<head>") ? html.replace("<head>", `<head>${dau}`) : html.replace(/<html([^>]*)>/, `<html$1><head>${dau}</head>`);
  const cuoiBody = `${linkFont.join("")}${bao}${script}`;
  html = html.includes("</body>") ? html.replace("</body>", `${cuoiBody}</body>`) : `${html}${cuoiBody}`;
  return { ok: true, html: `<!DOCTYPE html>${html}`, tieuDe };
}

/** Tệp nhị phân (ảnh) hoặc chữ (icon) trong cây theo đường dẫn — cho tuyến phục vụ tài nguyên của bản xem thử. */
export function tepTrongCay(cay: CayTep, duongDan: string): { noiDung: Buffer | string; kieu: string } | null {
  const t = cay.tep.find((x) => x.duongDan === duongDan);
  if (!t) return null;
  const duoi = duongDan.slice(duongDan.lastIndexOf(".") + 1).toLowerCase();
  const kieu =
    { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif" }[duoi] ??
    "application/octet-stream";
  return { noiDung: t.noiDung, kieu };
}
