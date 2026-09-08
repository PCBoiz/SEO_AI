/**
 * Thử vòng lặp dựng web trên máy, đầu tới cuối.
 *
 * Chạy:  npx tsx scripts/thu-xem-truoc.ts
 *
 * ⚠️ ĐÂY LÀ PHÉP THỬ PHẦN RỦI RO NHẤT, LÀM TRƯỚC MỌI THỨ KHÁC.
 *
 * Cả kiến trúc trình dựng website đứng trên một giả định chưa ai kiểm: rằng
 * Antigravity ghi được cây tệp ra đĩa, cài được phụ thuộc, dựng được, và bật
 * được máy chủ dev thật. Nếu giả định đó sai thì mọi thứ xây bên trên đều đổ,
 * và biết muộn thì đổ nhiều.
 *
 * Kịch bản này đo ba con số quyết định thiết kế:
 *   1. `npm install` mất bao lâu — quyết định có cần đóng sẵn ảnh phụ thuộc.
 *   2. `tsc` + `next build` mất bao lâu — quyết định vòng sửa lỗi chịu được
 *      bao nhiêu lần thử.
 *   3. Máy chủ dev lên sau bao lâu — quyết định người dùng phải chờ bao lâu
 *      mới thấy trang.
 */
import { taoMoiTruongMay } from "@/infrastructure/dung-web/moi-truong-may";
import type { CayTep } from "@/domain/dung-web/moi-truong-dung";

const MA_DU_AN = "thu-nghiem";

/**
 * Khung trang mẫu — Next.js 16 + Tailwind 4, đúng bộ halongxanh360 đang chạy.
 *
 * Form liên hệ CỐ Ý chỉ là nút, theo quyết định của chủ dự án 09/09: đây là
 * khung mẫu, và một nút Zalo với một nút gọi ra kết quả tốt hơn form ở thị
 * trường Việt Nam — halongxanh360 đang làm đúng vậy.
 */
const CAY: CayTep = {
  tep: [
    {
      duongDan: "package.json",
      noiDung: JSON.stringify(
        {
          name: "trang-mau",
          version: "0.1.0",
          private: true,
          scripts: { dev: "next dev", build: "next build", start: "next start" },
          dependencies: {
            next: "16.3.0",
            react: "19.2.8",
            "react-dom": "19.2.8",
          },
          devDependencies: {
            "@tailwindcss/postcss": "^4",
            "@types/node": "^20",
            "@types/react": "^19",
            "@types/react-dom": "^19",
            tailwindcss: "^4",
            typescript: "^5",
          },
        },
        null,
        2,
      ),
    },
    {
      duongDan: "postcss.config.mjs",
      noiDung: `const config = { plugins: { "@tailwindcss/postcss": {} } };\nexport default config;\n`,
    },
    {
      duongDan: "next.config.ts",
      noiDung: `import type { NextConfig } from "next";\nconst nextConfig: NextConfig = {};\nexport default nextConfig;\n`,
    },
    {
      duongDan: "tsconfig.json",
      noiDung: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
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
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
            paths: { "@/*": ["./src/*"] },
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    },
    {
      duongDan: "src/app/globals.css",
      noiDung: `@import "tailwindcss";\n\n:root { --nen: #0b0f14; --chu: #eef2f6; --nhan: #35d0a5; }\nbody { background: var(--nen); color: var(--chu); }\n`,
    },
    {
      duongDan: "src/app/layout.tsx",
      noiDung: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trang mẫu",
  description: "Khung trang do Antigravity dựng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`,
    },
    {
      duongDan: "src/app/page.tsx",
      noiDung: `const MUC = [
  { ten: "Vị trí", mo: "Nằm ở đâu, đi lại thế nào." },
  { ten: "Sản phẩm", mo: "Các dòng nhà đang mở bán." },
  { ten: "Tiến độ", mo: "Công trường đang tới đâu." },
];

export default function Trang() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--nhan)]">
        Khung mẫu
      </p>
      <h1 className="mt-4 text-5xl font-semibold leading-tight text-balance">
        Một trang giới thiệu dự án
      </h1>
      <p className="mt-5 max-w-[60ch] text-lg text-white/70">
        Khung này do Antigravity dựng ra để kiểm chứng vòng lặp: ghi tệp, cài phụ
        thuộc, dựng, rồi bật máy chủ dev thật.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <a
          href="https://zalo.me/0941328658"
          className="rounded-md bg-[var(--nhan)] px-5 py-3 font-medium text-[#06231b]"
        >
          Nhắn Zalo
        </a>
        <a
          href="tel:0941328658"
          className="rounded-md border border-white/25 px-5 py-3 font-medium"
        >
          Gọi ngay
        </a>
      </div>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {MUC.map((m) => (
          <div key={m.ten} className="rounded-lg border border-white/10 p-6">
            <h2 className="text-lg font-medium">{m.ten}</h2>
            <p className="mt-2 text-sm text-white/60">{m.mo}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
`,
    },
  ],
};

const giay = (t: number) => `${(t / 1000).toFixed(1)}s`;

async function main() {
  const mt = taoMoiTruongMay();
  console.log(`Môi trường: ${mt.ten}\n`);

  console.log("1/3 · Ghi cây tệp và cài phụ thuộc…");
  let moc = Date.now();
  await mt.chuanBi(MA_DU_AN, CAY);
  const tCai = Date.now() - moc;
  console.log(`      xong sau ${giay(tCai)} · ${CAY.tep.length} tệp\n`);

  console.log("2/3 · Kiểm chứng (tsc + next build)…");
  const kq = await mt.kiemChung(MA_DU_AN);
  console.log(`      ${kq.dat ? "ĐẠT" : "HỎNG"} sau ${giay(kq.mili)}`);
  if (!kq.dat) {
    console.log(`\n${kq.loi?.slice(-3000)}`);
    process.exit(1);
  }
  console.log();

  console.log("3/3 · Bật máy chủ dev…");
  moc = Date.now();
  const phien = await mt.moXemTruoc(MA_DU_AN);
  const tDev = Date.now() - moc;
  console.log(`      lên sau ${giay(tDev)} → ${phien.url}\n`);

  // Đọc thật một lượt để chắc trang trả về HTML chứ không phải trang lỗi.
  const html = await (await fetch(phien.url)).text();
  const coTieuDe = html.includes("Một trang giới thiệu dự án");
  console.log(`Đọc thử trang: ${html.length} ký tự · tiêu đề ${coTieuDe ? "CÓ" : "KHÔNG"}`);

  await phien.dong();

  console.log("\n─── Ba con số quyết định thiết kế ───");
  console.log(`  npm install       ${giay(tCai)}`);
  console.log(`  tsc + next build  ${giay(kq.mili)}`);
  console.log(`  next dev lên      ${giay(tDev)}`);
  console.log(
    `\n${coTieuDe ? "Vòng lặp chạy được." : "Máy chủ lên nhưng nội dung không đúng."}`,
  );
}

main().catch((loi) => {
  console.error("HỎNG:", loi instanceof Error ? loi.message : loi);
  process.exit(1);
});
