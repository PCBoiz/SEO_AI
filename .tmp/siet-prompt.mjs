import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

// ── 1 · Thêm luật 5 + hàm ngày vào seo-geo.ts ────────────────────────────
{
  const p = "src/domain/modules/seo-geo.ts";
  const s = readFileSync(p, "utf8");
  const d = s.includes("\r\n") ? "\r\n" : "\n";
  const L = s.split(d);

  // luật 5, chèn ngay trước dòng rỗng cuối mảng khongDuocViet
  const i = L.findIndex((l) => l.includes('"4. KHÔNG bịa số.'));
  let kt = i;
  while (!L[kt].trim().endsWith('",')) kt++;
  const luat5 = `  "5. KHÔNG TỰ SUY RA THỜI ĐIỂM HIỆN TẠI. Năm, quý, tháng “hiện tại/mới " +
    "nhất/cập nhật” CHỈ được lấy từ dòng HÔM NAY ở đầu prompt. Mô hình ngôn " +
    "ngữ không biết hôm nay là ngày nào — nó đoán theo dữ liệu đã học, và dữ " +
    "liệu đó luôn cũ hơn thực tế.\\n" +
    "   Đo được ngày 08/09/2026: hai lượt chạy liên tiếp đều ra tiêu đề " +
    "“… mới nhất 2024”. Lệch hai năm, ngay ở tiêu đề.\\n" +
    "   Nếu dòng HÔM NAY không có, TUYỆT ĐỐI không viết năm nào cả — viết " +
    "“hiện tại”, “thời điểm này”, hoặc bỏ hẳn mệnh đề thời gian.",`;
  L.splice(kt + 1, 0, ...luat5.split("\n"));

  // hàm sinh dòng HÔM NAY + preamble dạng hàm
  const j = L.findIndex((l) => l.startsWith("export const seoGeoPreamble = ["));
  let jk = j;
  while (!L[jk].startsWith("].join(")) jk++;
  const moi = `/**
 * Dòng “HÔM NAY” gắn vào đầu mọi system prompt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO MỘT DÒNG NHỎ NÀY QUAN TRỌNG HƠN CẢ MỘT LUẬT CẤM
 *
 * Luật số 4 đã ghi “KHÔNG bịa số” từ lâu, và mô hình vẫn viết “tiến độ mới
 * nhất 2024” hai lượt liên tiếp trong khi hôm nay là 08/09/2026.
 *
 * Nó không cãi lệnh. Với nó, “2024” KHÔNG PHẢI số bịa — đó là hiện tại, theo
 * mọi thứ nó từng đọc. Một mô hình ngôn ngữ không có đồng hồ; mốc thời gian
 * duy nhất nó biết là mốc dữ liệu huấn luyện dừng lại.
 *
 * Cấm một thứ mà không cho thứ thay thế thì lệnh cấm chỉ là lời than. Nên cách
 * sửa đúng không phải viết luật gắt hơn, mà là ĐƯA CHO NÓ CÁI NÓ THIẾU.
 *
 * ⚠️ PHẢI LÀ HÀM, KHÔNG ĐƯỢC LÀ HẰNG. Hằng được tính một lần lúc nạp tệp; máy
 * chủ chạy liên tục nhiều ngày thì ngày đó đứng yên trong khi lịch vẫn trôi —
 * tức là tạo ra đúng cái sai vừa đi sửa, chỉ chậm hơn vài hôm.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function dongHomNay(bayGio: Date = new Date()): string {
  const ngay = bayGio.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const quy = Math.floor(bayGio.getMonth() / 3) + 1;
  return \`HÔM NAY là \${ngay} (quý \${quy}/\${bayGio.getFullYear()}). Mọi mốc “hiện tại”, “mới nhất”, “năm nay” phải tính từ ngày này, không được suy ra từ trí nhớ.\`;
}

// Đoạn preamble ngắn để gắn vào đầu system prompt riêng của từng module.
//
// LÀ HÀM chứ không phải hằng, vì nó nhúng ngày hôm nay — xem ghi chú ở
// \`dongHomNay\`.
//
// Phần “số liệu rõ ràng” và phần “không bịa số” nghe như mâu thuẫn nhưng không
// phải: nó nói hãy CỤ THỂ VỀ THỨ MÌNH BIẾT, đừng làm tròn thứ mình không biết.
export function seoGeoPreamble(): string {
  return [
    dongHomNay(),
    "",
    "Bạn tối ưu đồng thời cho SEO (Google) và GEO (được AI như ChatGPT, Perplexity, Google AI Overviews trích dẫn): câu trả lời trực tiếp, thực thể và số liệu rõ ràng, cấu trúc dễ bóc tách, bám đúng ý định tìm kiếm và ngôn ngữ bản địa.",
    "",
    "RÀNG BUỘC BẮT BUỘC — vi phạm là bài bị từ chối, không đăng được:",
    khongDuocViet,
  ].join("\\n");
}`;
  // xoá khối preamble cũ (gồm cả khối chú thích ngay trên)
  let bd = j;
  while (bd > 0 && !L[bd - 1].startsWith("export const seoGeoPreamble")) {
    if (L[bd - 1].trim() === "" && L[bd - 2]?.startsWith("// bỏ qua")) break;
    if (!L[bd - 1].startsWith("//")) break;
    bd--;
  }
  L.splice(bd, jk - bd + 1, ...moi.split("\n"));
  writeFileSync(p, L.join(d));
  console.log("1 · thêm luật 5 + dongHomNay() + seoGeoPreamble() dạng hàm");
}

// ── 2 · Cập nhật mọi nơi dùng ────────────────────────────────────────────
{
  const thuMuc = "src/domain/modules/definitions";
  let doi = 0;
  for (const f of readdirSync(thuMuc)) {
    if (!f.endsWith(".ts")) continue;
    const p = path.join(thuMuc, f);
    const truoc = readFileSync(p, "utf8");
    const sau = truoc.replace(/\$\{seoGeoPreamble\}/g, "${seoGeoPreamble()}");
    if (sau !== truoc) {
      writeFileSync(p, sau);
      doi++;
      console.log(`   · ${f}`);
    }
  }
  console.log(`2 · cập nhật ${doi} tệp gọi preamble`);
}
