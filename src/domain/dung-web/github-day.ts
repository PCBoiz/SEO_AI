import type { CayTep, TepSinh } from "./moi-truong-dung";
import { lamSlug } from "./dung-cay-tep";

/**
 * ĐẨY WEB KHÁCH LÊN GITHUB → CLOUDFLARE TỰ DỰNG — phần THUẦN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CÓ ĐƯỜNG NÀY
 *
 * Cho tới vòng 45, "đưa web lên mạng" cần một người mở terminal: giải nén,
 * `npm install`, `opennextjs-cloudflare deploy`. Chủ dự án không làm được, và
 * Antigravity chạy trên Vercel thì không dựng hộ được (ổ chỉ đọc, hàm 60–300
 * giây). Câu hỏi "máy nào dựng" (VIEC-CAN-LAM mục 19) treo từ 12/09.
 *
 * Cloudflare có "Workers Builds": nối một kho GitHub, mỗi lần đẩy mã là
 * Cloudflare tự `npm install` + build + deploy trên máy của họ. Vậy Antigravity
 * chỉ cần ĐẨY MÃ NGUỒN LÊN GITHUB — việc đó là vài lượt gọi HTTP, làm được từ
 * Vercel, từ điện thoại. Không cần máy dựng nào cả.
 *
 * Tệp này giữ phần không đụng mạng: chuẩn bị cây tệp cho Cloudflare (cấu hình
 * ra gốc, thêm phụ thuộc) và đổi cây tệp thành danh sách blob cho Git Data
 * API. Gọi mạng nằm ở `lib/dung-web/github-api.ts`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Bản đã chạy thật ở máy (vòng 32 và 44): `opennextjs-cloudflare build` +
 * `wrangler dev --local` phục vụ đủ trang, API, sitemap. Đóng cứng như mọi phụ
 * thuộc khác của web khách — xem lý do ở `dung-cay-tep.ts`.
 */
export const PHIEN_BAN_CLOUDFLARE = {
  opennext: "1.20.6",
  wrangler: "4.131.1",
} as const;

/** Tên kho GitHub cho một website: `web-<slug>`. GitHub cho phép chữ, số, `-`, `_`, `.`. */
export function tenRepo(tenWebsite: string): string {
  return `web-${lamSlug(tenWebsite)}`.slice(0, 100).replace(/-+$/, "");
}

/**
 * Cây tệp SẴN SÀNG CHO CLOUDFLARE WORKERS BUILDS.
 *
 * Tệp nén tải về giữ cấu hình Cloudflare trong `trien-khai/cloudflare/` (để
 * `tsc` không đòi gói chưa cài, và không phải ai cũng dùng Cloudflare). Kho
 * GitHub thì ngược lại: Cloudflare đọc `wrangler.jsonc` ở GỐC và cần hai gói
 * kia trong `package.json` để `npm install` lấy về. Hàm này làm đúng hai việc
 * đó — không sửa gì khác, để bản tải về và bản trên GitHub vẫn là một website.
 */
export function chuanBiChoCloudflare(cay: CayTep): CayTep {
  const doc = (d: string): string | undefined => {
    const t = cay.tep.find((x) => x.duongDan === d);
    return typeof t?.noiDung === "string" ? t.noiDung : undefined;
  };
  const wrangler = doc("trien-khai/cloudflare/wrangler.jsonc");
  const openNext = doc("trien-khai/cloudflare/open-next.config.ts");
  const goiCu = doc("package.json");
  if (!wrangler || !openNext || !goiCu) {
    throw new Error("Cây tệp thiếu cấu hình Cloudflare hoặc package.json — không phải cây do bộ dựng sinh ra.");
  }
  const goi = JSON.parse(goiCu) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [k: string]: unknown;
  };
  goi.scripts = {
    ...goi.scripts,
    // Đúng hai lệnh Cloudflare gọi (Build command / Deploy command).
    "dung-cloudflare": "opennextjs-cloudflare build",
    "day-cloudflare": "opennextjs-cloudflare deploy",
  };
  goi.devDependencies = {
    ...goi.devDependencies,
    "@opennextjs/cloudflare": PHIEN_BAN_CLOUDFLARE.opennext,
    wrangler: PHIEN_BAN_CLOUDFLARE.wrangler,
  };

  const boQua = new Set(["package.json"]);
  const tep: TepSinh[] = cay.tep.filter((t) => !boQua.has(t.duongDan));
  tep.push({ duongDan: "package.json", noiDung: JSON.stringify(goi, null, 2) + "\n" });
  tep.push({ duongDan: "wrangler.jsonc", noiDung: wrangler });
  tep.push({ duongDan: "open-next.config.ts", noiDung: openNext });
  tep.push({
    duongDan: "CLOUDFLARE.md",
    noiDung: `# Kho này do Antigravity đẩy lên — Cloudflare tự dựng

Mỗi lần Antigravity đẩy bản mới, Cloudflare tự cài, dựng và đưa lên mạng.
Không cần chạy lệnh gì trên máy.

**Nối lần đầu (một lần cho mỗi website):** dash.cloudflare.com → Workers & Pages
→ Create → Workers → *Import a repository* → chọn kho này → điền:

- Build command: \`npm run dung-cloudflare\`
- Deploy command: \`npm run day-cloudflare\`

→ Save and Deploy. Biến môi trường (\`LEAD_WEBHOOK_URL\`, \`LEAD_WEBHOOK_TOKEN\`,
\`NEXT_PUBLIC_DIA_CHI\`, \`NEXT_PUBLIC_GA_ID\`) đặt ở Settings → Variables and
Secrets của Worker. Máy dựng của Cloudflare dùng Node 24 mặc định (bản này đã
dựng thử với Node 24); nếu có lỗi phiên bản Node, thêm Build variable
\`NODE_VERSION\` = \`22\`.
`,
  });
  return { ...cay, tep };
}

/** Một mục đưa lên Git: đường dẫn + nội dung đã mã hoá đúng kiểu. */
export interface MucGit {
  duongDan: string;
  /** Tệp nhị phân đi base64; chữ đi utf-8 nguyên. */
  maHoa: "base64" | "utf-8";
  noiDung: string;
}

/**
 * Cây tệp → danh sách blob cho Git Data API.
 *
 * Kiểm đường dẫn ở đây một lần nữa dù bộ dựng đã kiểm: đây là lớp cuối trước
 * khi mã đi ra khỏi máy, và một `..` lọt qua là ghi đè tệp ngoài kho.
 */
export function mucGitTuCay(cay: CayTep): MucGit[] {
  const ra: MucGit[] = [];
  const daCo = new Set<string>();
  for (const t of cay.tep) {
    const d = t.duongDan.replace(/\\/g, "/");
    if (d.startsWith("/") || d.split("/").some((p) => p === "" || p === "." || p === "..")) {
      throw new Error(`Đường dẫn không hợp lệ cho Git: ${t.duongDan}`);
    }
    if (daCo.has(d)) throw new Error(`Đường dẫn lặp: ${d}`);
    daCo.add(d);
    ra.push(
      Buffer.isBuffer(t.noiDung)
        ? { duongDan: d, maHoa: "base64", noiDung: t.noiDung.toString("base64") }
        : { duongDan: d, maHoa: "utf-8", noiDung: t.noiDung },
    );
  }
  return ra.sort((a, b) => (a.duongDan < b.duongDan ? -1 : 1));
}
