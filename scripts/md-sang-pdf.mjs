#!/usr/bin/env node
/**
 * Chuyển một tệp Markdown thành PDF đọc được trên điện thoại.
 *
 * Chạy:  npm run md-sang-pdf VIEC-CAN-LAM.md VIEC-CAN-LAM.pdf
 *
 * ⚠️ TỰ DỰNG BỘ CHUYỂN THAY VÌ THÊM PHỤ THUỘC.
 *
 * Markdown ở đây chỉ dùng vài thứ: tiêu đề, đậm, mã, bảng, danh sách, trích
 * dẫn, đường kẻ. Kéo cả một thư viện Markdown về để dựng chừng ấy là thêm một
 * phụ thuộc phải nuôi, cho một việc chạy vài lần một tuần.
 *
 * Dùng Chromium để in vì tiếng Việt có dấu cần font nhúng đầy đủ — thư viện PDF
 * nhẹ hoặc bỏ dấu, hoặc dựng dấu sai vị trí, và lỗi kiểu đó chỉ lộ khi mở tệp
 * bằng mắt.
 *
 * Ưu tiên Chrome đã cài trên máy, chỉ rơi về bản Playwright tải riêng khi không
 * có — bản đó nặng 150MB và phải `npx playwright install` mới có.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const [, , vao, ra] = process.argv;
if (!vao || !ra) {
  console.error("Thiếu tham số. Ví dụ:");
  console.error("  node scripts/md-sang-pdf.mjs VIEC-CAN-LAM.md VIEC-CAN-LAM.pdf");
  process.exit(1);
}

const thoat = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Định dạng trong một dòng: `mã`, **đậm**, *nghiêng*. */
function trongDong(t) {
  return thoat(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

function dungHtml(md) {
  // ⚠️ TÁCH DÒNG PHẢI TÍNH CẢ KÝ TỰ XUỐNG DÒNG KIỂU WINDOWS.
  //
  // Kho này nằm trên Windows nên tệp lưu bằng CRLF. Tách chỉ bằng ký tự xuống
  // dòng thường sẽ để lại một ký tự "về đầu dòng" ở cuối MỖI dòng — và trong
  // JavaScript, dấu chấm trong biểu thức chính quy KHÔNG khớp ký tự đó.
  //
  // Hậu quả: mọi biểu thức kết thúc bằng neo cuối dòng đều trượt. Tiêu đề,
  // bảng, danh sách, trích dẫn — tất cả rơi xuống nhánh cuối và thành `<p>`.
  //
  // Hỏng im lặng và trông rất thật: PDF vẫn in ra, đúng tên tệp, đủ chữ, chỉ là
  // không còn một tiêu đề hay một bảng nào. ĐÃ XẢY RA THẬT ngày 09/09/2026 —
  // phát hiện được vì ĐẾM phần tử dựng ra rồi đối chiếu với markdown gốc
  // (6 dấu `##` → 0 thẻ h2). Nhìn lướt qua thì không thấy.
  const dong = md.split(/\r?\n/);
  const ra = [];
  let trongDs = null; // "ul" | "ol" | null
  let trongBang = false;

  const dongDs = () => {
    if (trongDs) {
      ra.push(`</${trongDs}>`);
      trongDs = null;
    }
  };
  const dongBang = () => {
    if (trongBang) {
      ra.push("</tbody></table>");
      trongBang = false;
    }
  };

  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];

    // Bảng: dòng có | và dòng kế là dòng phân cách ---
    if (!trongBang && /^\|/.test(d) && /^\|[\s:|-]+\|$/.test(dong[i + 1] ?? "")) {
      dongDs();
      const cot = d.split("|").slice(1, -1).map((c) => c.trim());
      ra.push("<table><thead><tr>");
      for (const c of cot) ra.push(`<th>${trongDong(c)}</th>`);
      ra.push("</tr></thead><tbody>");
      trongBang = true;
      i++; // bỏ dòng phân cách
      continue;
    }
    if (trongBang) {
      if (!/^\|/.test(d)) {
        dongBang();
      } else {
        const o = d.split("|").slice(1, -1).map((c) => c.trim());
        ra.push("<tr>" + o.map((c) => `<td>${trongDong(c)}</td>`).join("") + "</tr>");
        continue;
      }
    }

    if (/^\s*$/.test(d)) {
      dongDs();
      continue;
    }
    if (/^---+$/.test(d)) {
      dongDs();
      ra.push("<hr>");
      continue;
    }

    const tieuDe = d.match(/^(#{1,6})\s+(.*)$/);
    if (tieuDe) {
      dongDs();
      const c = tieuDe[1].length;
      ra.push(`<h${c}>${trongDong(tieuDe[2])}</h${c}>`);
      continue;
    }

    const dsCham = d.match(/^\s*[-*]\s+(.*)$/);
    if (dsCham) {
      if (trongDs !== "ul") {
        dongDs();
        ra.push("<ul>");
        trongDs = "ul";
      }
      ra.push(`<li>${trongDong(dsCham[1])}</li>`);
      continue;
    }

    const dsSo = d.match(/^\s*\d+\.\s+(.*)$/);
    if (dsSo) {
      if (trongDs !== "ol") {
        dongDs();
        ra.push("<ol>");
        trongDs = "ol";
      }
      ra.push(`<li>${trongDong(dsSo[1])}</li>`);
      continue;
    }

    const trich = d.match(/^>\s?(.*)$/);
    if (trich) {
      dongDs();
      ra.push(`<blockquote>${trongDong(trich[1])}</blockquote>`);
      continue;
    }

    // ⚠️ GỘP CÁC DÒNG LIỀN NHAU THÀNH MỘT ĐOẠN, đừng mỗi dòng một `<p>`.
    //
    // Markdown gói câu xuống dòng cho vừa 80 cột, nhưng một đoạn vẫn là một
    // đoạn. Xử lý từng dòng riêng thì hỏng ở đúng chỗ định dạng vắt qua hai
    // dòng — `**đăng ba ảnh do AI sinh\nra**` không khớp được, và dấu sao lọt
    // nguyên vào PDF.
    //
    // Đo thật ngày 09/09: 8 dấu `**` còn sót, tất cả đều là đậm vắt dòng.
    dongDs();
    const gom = [d];
    while (
      i + 1 < dong.length &&
      dong[i + 1].trim() !== "" &&
      !/^(#{1,6}\s|>|---+$|\s*[-*]\s|\s*\d+\.\s|\|)/.test(dong[i + 1])
    ) {
      gom.push(dong[++i]);
    }
    ra.push(`<p>${trongDong(gom.join(" "))}</p>`);
  }
  dongDs();
  dongBang();
  return ra.join("\n");
}

const KIEU = `
@page { size: A4; margin: 15mm 15mm 13mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", "Times New Roman", serif; color: #12151a;
       font-size: 10.5pt; line-height: 1.55; margin: 0; }
h1 { font-size: 19pt; margin: 0 0 3mm; border-bottom: 1.5pt solid #12151a;
     padding-bottom: 2.5mm; }
h2 { font-size: 13pt; margin: 7mm 0 2.5mm; padding-bottom: 1.2mm;
     border-bottom: .6pt solid #b9c0c9; break-after: avoid; }
h3 { font-size: 11pt; margin: 5mm 0 1.5mm; break-after: avoid; }
p { margin: 0 0 2.2mm; max-width: 74ch; }
ul, ol { margin: 0 0 2.5mm; padding-left: 6mm; max-width: 74ch; }
li { margin-bottom: 1.2mm; }
code { font-family: Consolas, monospace; font-size: 9pt; background: #f1f3f5;
       padding: .3mm 1mm; border-radius: 2px; }
blockquote { margin: 2mm 0 2mm 3mm; padding-left: 3mm;
             border-left: 2pt solid #d0d5dc; color: #333a44; font-size: 10pt; }
table { width: 100%; border-collapse: collapse; margin: 2.5mm 0 4mm;
        font-size: 9.5pt; break-inside: avoid; }
th { text-align: left; font-size: 8pt; text-transform: uppercase;
     letter-spacing: .05em; color: #4a525e; border-bottom: .8pt solid #12151a;
     padding: 1.5mm 2mm; }
td { border-bottom: .4pt solid #ccd2da; padding: 2mm; vertical-align: top; }
hr { border: 0; border-top: .6pt solid #ccd2da; margin: 5mm 0; }
em { color: #4a525e; }
`;

/**
 * Đếm phần tử dựng ra và đối chiếu với markdown gốc.
 *
 * ⚠️ ĐÂY KHÔNG PHẢI TRANG TRÍ — nó là thứ đã bắt được lỗi CRLF ở trên.
 *
 * Một bộ chuyển hỏng vẫn in ra PDF trông bình thường: đúng tên tệp, đủ chữ,
 * đúng số trang. Cái mất là cấu trúc, mà cấu trúc thì phải đếm mới thấy.
 */
function doiChieu(md, html) {
  const dem = (re, s) => (s.match(re) ?? []).length;
  const canh = [
    ["tiêu đề ##", dem(/^## /gm, md), dem(/<h2>/g, html)],
    ["tiêu đề ###", dem(/^### /gm, md), dem(/<h3>/g, html)],
    // ⚠️ NEO CUỐI DÒNG `$` LÀ BẮT BUỘC, KHÔNG PHẢI TRANG TRÍ.
    //
    // Thiếu nó thì một dòng TIÊU ĐỀ có ô đầu để trống — `| | cột A | cột B |`
    // — bị đếm là dòng phân cách, vì ba ký tự đầu của nó đúng là `| |`.
    //
    // Đã xảy ra thật (10/09/2026): bộ kiểm báo "bảng: markdown 7 → html 6" và
    // chặn không cho in PDF, trong khi bộ chuyển dựng ĐÚNG cả 6 bảng. Phép
    // kiểm sai chặn một kết quả đúng — tệ theo kiểu khác với phép kiểm bỏ sót,
    // nhưng vẫn là tệ: nó dạy người ta tắt phép kiểm đi.
    //
    // Phần dò bảng của chính bộ chuyển vốn đã có `$` từ đầu; chỉ phép đối chiếu
    // này quên.
    ["bảng", dem(/^\|[\s:|-]+\|$/gm, md), dem(/<table>/g, html)],
  ];
  const lech = canh.filter(([, a, b]) => a !== b);
  if (lech.length === 0) return null;
  return lech.map(([ten, a, b]) => `${ten}: markdown ${a} → html ${b}`).join("; ");
}

const md = readFileSync(vao, "utf8");
const than = dungHtml(md);
const lech = doiChieu(md, than);
if (lech) {
  console.error(`Bộ chuyển dựng thiếu cấu trúc — ${lech}`);
  process.exit(1);
}

const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>${thoat(basename(vao))}</title><style>${KIEU}</style></head>
<body>${than}</body></html>`;

async function moTrinhDuyet() {
  for (const kenh of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel: kenh });
    } catch {
      // thử kênh sau
    }
  }
  return chromium.launch();
}

const trinhDuyet = await moTrinhDuyet();
try {
  const trang = await trinhDuyet.newPage();
  await trang.setContent(html, { waitUntil: "load" });
  await trang.pdf({ path: ra, format: "A4", printBackground: true });
} finally {
  await trinhDuyet.close();
}
console.log(`đã in: ${ra}`);
