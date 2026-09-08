// Kiểm thử TOÀN TUYẾN: gõ chủ đề → AI viết bài → đẩy sang site → vào hàng chờ.
//
// ═══════════════════════════════════════════════════════════════════════════
// KHÁC GÌ HAI BÀI KIỂM KIA
//
//   e2e-vinhomes.ts    hai hệ thống nối được với nhau (upstream viết sẵn)
//   e2e-cong-chan.ts   hàng rào nội dung chặn đúng thứ cần chặn
//   BÀI NÀY            AI thật sinh nội dung thật, rồi mới đi qua cả hai
//
// Hai bài trên dùng upstream viết tay, nên chúng chứng minh được ĐƯỜNG ỐNG
// nhưng không chứng minh được thứ chảy trong ống. Bài này gọi model thật với
// đúng prompt của từng module — nghĩa là nếu một prompt sinh ra thứ mà module
// sau không đọc được, hoặc sinh ra câu chạm luật cấm, thì lộ ra ở đây.
//
// ⚠️ CHẠY BẰNG BIẾN MÔI TRƯỜNG, KHÔNG LƯU KHOÁ VÀO FILE NÀO.
//
//   Windows PowerShell:
//     $env:OPENAI_API_KEY="sk-..."
//     npm run e2e:day-du
//
//   Đích đến mặc định là site chạy cục bộ ở cổng 3211. Đổi bằng
//   VINHOMES_SITE_URL / VINHOMES_INGEST_TOKEN.
// ═══════════════════════════════════════════════════════════════════════════

import {
  headlineModule,
  introModule,
  sectionsModule,
} from "@/domain/modules/definitions/content-modules";
import { geoSchemaModule } from "@/domain/modules/definitions/geo-schema";
import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";
import { flattenModuleOutput } from "@/domain/modules/module-definition";
import type { ModuleGenerate } from "@/domain/modules/module-definition";

// ═══════════════════════════════════════════════════════════════════════════
// NẠP KHOÁ TỪ `.env.local`, KHÔNG NHẬN QUA DÒNG LỆNH.
//
// Khoá dán vào dòng lệnh nằm lại trong lịch sử shell, trong nhật ký phiên làm
// việc, và trong mọi ảnh chụp màn hình. Hai khoá của dự án này đã lộ đúng theo
// đường đó — một lần qua ghi chú, một lần qua cửa sổ chat.
//
// `.env.local` bị .gitignore chặn nên khoá ở đó không bao giờ lên GitHub. Bộ
// đọc dưới đây cố ý viết tay thay vì kéo thêm thư viện: nó chỉ cần tách
// KHOÁ=GIÁ TRỊ, và mỗi thứ bớt đi là một thứ bớt phải tin.
// ═══════════════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from "node:fs";

for (const tep of [".env.local", ".env"]) {
  if (!existsSync(tep)) continue;
  for (const dong of readFileSync(tep, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(dong.trim());
    if (!m) continue;
    // ⚠️ GỠ CẢ NHÁY LẪN NGOẶC NHỌN. Ngoặc nhọn nghe vô lý cho tới khi nó xảy ra.
    //
    // Hướng dẫn dán khoá hay viết chỗ điền dạng `<dán khoá vào đây>`. Người làm
    // theo rất dễ thay phần chữ bên trong mà GIỮ NGUYÊN cặp ngoặc — và đã xảy ra
    // đúng như vậy với dự án này. OpenAI trả 401 kèm khoá đã che, nên nhìn thông
    // báo lỗi cũng không thấy hai ký tự thừa ở hai đầu.
    //
    // Ngoặc nhọn không bao giờ là một phần của khoá thật, nên gỡ đi không nới
    // lỏng gì cả. Cùng lý do với `.trim()`: chỗ nào người dán tay được thì chỗ
    // đó phải chịu được cách dán của con người.
    process.env[m[1]] ??= m[2].trim().replace(/^["'<]+|["'>]+$/g, "");
  }
}

process.env.VINHOMES_SITE_URL ??= "http://localhost:3211";
process.env.VINHOMES_INGEST_TOKEN ??= "e2e-thu-nghiem-987";

const KHOA = process.env.OPENAI_API_KEY;
if (!KHOA) {
  console.error("Thiếu OPENAI_API_KEY. Đặt bằng biến môi trường, đừng ghi vào file.");
  process.exit(1);
}
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

/** Che mọi thứ trông như khoá trước khi in ra — nhật ký cũng là nơi rò rỉ. */
function che(cau: string): string {
  return cau.replace(/sk-[A-Za-z0-9_-]{12,}/g, "<khoá-đã-che>");
}

let luotGoi = 0;
const generate: ModuleGenerate = async ({ systemPrompt, prompt, maxOutputTokens }) => {
  luotGoi++;
  const phanHoi = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KHOA}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxOutputTokens ?? 1600,
      temperature: 0.7,
    }),
  });
  if (!phanHoi.ok) {
    throw new Error(che(`OpenAI trả ${phanHoi.status}: ${(await phanHoi.text()).slice(0, 300)}`));
  }
  const du = (await phanHoi.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return du.choices?.[0]?.message?.content ?? "";
};

// Trường nhập gộp cho mọi module nội dung. Engine thật lấy từ form; ở đây gõ
// thẳng vì mục đích là kiểm đường ống, không phải kiểm form.
const NHAP = {
  projectId: "e2e-day-du",
  primaryKeyword: "tiến độ xây dựng Vinhomes Global Gate Hạ Long",
  tone: "chuyên nghiệp",
  angle: "cập nhật tiến độ thực tế cho người đang cân nhắc mua",
  language: "Tiếng Việt",
  country: "Việt Nam",
  city: "Quảng Ninh",
  contractVersion: "1.0",
  headline: "",
  intro: "",
  sections: "",
  headlines: "",
  // `outline` là MẢNG, không phải chuỗi — module #10 gọi .length rồi .map lên nó.
  // Bỏ trống thì nó tự sinh dàn ý, nên mảng rỗng là đúng ý đồ chứ không phải né lỗi.
  outline: [] as string[],
  pageUrl: "https://halongxanh360.vn/tin-tuc",
};

async function main(): Promise<void> {
  console.log(`TOÀN TUYẾN — model ${MODEL} → ${process.env.VINHOMES_SITE_URL}`);
  console.log("=".repeat(74));

  const upstream: Record<string, string> = {};
  const buoc = [
    { m: headlineModule, ten: "#7  Tiêu đề" },
    { m: introModule, ten: "#8  Mở đầu" },
    { m: sectionsModule, ten: "#10 Thân bài" },
    { m: geoSchemaModule, ten: "#11 FAQ + JSON-LD" },
  ];

  for (const { m, ten } of buoc) {
    const t0 = Date.now();
    const ra = (await m.execute({
      input: NHAP as never,
      generate,
      upstream,
      integrations: {},
    })) as Record<string, unknown>;
    upstream[m.key] = flattenModuleOutput(m, ra);
    const soTu = upstream[m.key].split(/\s+/).filter(Boolean).length;
    console.log(
      `✅ ${ten.padEnd(20)} ${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s  ${String(soTu).padStart(5)} từ`,
    );
  }

  console.log("\n── Đẩy sang site ──");
  const ketQua = await vinhomesPublishModule.execute({
    input: { projectId: "e2e-day-du", title: "", chuyenMuc: "Tiến độ", ngayDang: "" } as never,
    upstream,
    integrations: {},
    generate: (() => {
      throw new Error("Module #21 không được phép gọi AI.");
    }) as never,
  });
  console.log(ketQua.result);
  console.log(`\n${"=".repeat(74)}`);
  console.log(`Xong. ${luotGoi} lượt gọi model.`);
}

void main().catch((loi) => {
  console.error("\n❌ " + che(loi instanceof Error ? loi.message : String(loi)));
  process.exitCode = 1;
});
