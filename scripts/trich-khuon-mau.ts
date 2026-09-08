/**
 * Trích kho halongxanh360 thành danh mục component dùng lại được.
 *
 * Chạy:  npx tsx scripts/trich-khuon-mau.ts "D:/vinhomes_ha_long_xanh"
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO TRÍCH TỪ MỘT KHO ĐANG CHẠY THẬT, KHÔNG DÙNG THƯ VIỆN CHUNG
 *
 * Kho halongxanh360 có 40 component đã chạy trên production. Chúng hơn mọi thư
 * viện chung ở bốn điểm mà không thư viện nào bù được:
 *
 *   1. ĐÚNG NGÀNH — bảng hàng, quỹ căn, giá thực trả, tiến độ. Không thư viện
 *      nước ngoài nào có những khối này.
 *   2. ĐÚNG TIẾNG — nhãn, cách xưng hô, cách viết số đã tiếng Việt sẵn.
 *   3. ĐÃ QUA KIỂM DUYỆT của chủ trang, kể cả những thứ đã bị bác bỏ.
 *   4. ĐÃ CHẠY THẬT — không phải mẫu trình diễn.
 *
 * Cái được lớn nhất không phải nhanh hơn, mà là ÍT RỦI RO HƠN: ghép component
 * đã chạy thì gần như chắc chắn build được. Viết mới thì mỗi lần là một lần
 * rủi ro, và mỗi lần hỏng là một vòng sửa tốn token.
 *
 * ⚠️ ĐỌC BẰNG TRÌNH BIÊN DỊCH TYPESCRIPT, KHÔNG BẰNG BIỂU THỨC CHÍNH QUY.
 *
 * Regex trên mã nguồn hỏng ở đúng những chỗ khó thấy: kiểu generic có dấu ngoặc
 * nhọn lồng nhau, props viết trải nhiều dòng, chuỗi có chứa dấu ngoặc. Nó sẽ
 * chạy đúng trên 35 tệp rồi âm thầm bỏ sót 5 tệp — và 5 tệp đó không ai biết
 * là thiếu cho tới khi tác tử gọi một component không tồn tại.
 *
 * ⚠️ VÀ TRÍCH CẢ CHÚ THÍCH ĐẦU TỆP. Kho đó viết chú thích để giải thích VÌ SAO,
 * không phải LÀM GÌ — gồm cả những cách làm đã thử rồi bỏ. Với tác tử sinh mã,
 * một dòng "ĐÃ GỠ Ô NÀY, ĐỪNG ĐƯA LẠI" đáng giá hơn cả trang mô tả.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

interface MucKhuonMau {
  /** Đường dẫn tương đối trong kho gốc. */
  tep: string;
  /** Tên các thành phần được xuất ra. */
  xuat: string[];
  /** Props của thành phần chính, dạng chữ nguyên văn. */
  props: string | null;
  /** Chú thích đầu tệp — phần giải thích VÌ SAO. */
  vieSao: string | null;
  /** Các module bên ngoài mà tệp này cần. */
  can: string[];
  soDong: number;
}

function docTep(duongDan: string): string {
  return readFileSync(duongDan, "utf8");
}

function quetThuMuc(goc: string, thuMuc: string): string[] {
  const ra: string[] = [];
  const day = join(goc, thuMuc);
  let muc: string[];
  try {
    muc = readdirSync(day);
  } catch {
    return ra;
  }
  for (const ten of muc) {
    if (ten.endsWith(".tsx") || ten.endsWith(".ts")) ra.push(join(day, ten));
  }
  return ra;
}

/** Lấy khối chú thích /** … *​/ đứng đầu tệp, nếu có. */
function chuThichDau(nguon: string): string | null {
  const khop = nguon.match(/^\s*(?:import[^\n]*\n|\n)*\s*(\/\*\*[\s\S]*?\*\/)/);
  if (!khop) return null;
  return khop[1]
    .split("\n")
    .map((d) => d.replace(/^\s*\/?\*+\/?\s?/, "").trimEnd())
    .filter((d, i, a) => !(i === a.length - 1 && d === ""))
    .join("\n")
    .trim();
}

function docMotTep(gocKho: string, duongDan: string): MucKhuonMau | null {
  const nguon = docTep(duongDan);
  const cay = ts.createSourceFile(duongDan, nguon, ts.ScriptTarget.Latest, true);

  const xuat: string[] = [];
  const can = new Set<string>();
  let props: string | null = null;

  cay.forEachChild((nut) => {
    // Nhập từ đâu — để biết component này kéo theo những gì.
    if (ts.isImportDeclaration(nut) && ts.isStringLiteral(nut.moduleSpecifier)) {
      can.add(nut.moduleSpecifier.text);
      return;
    }

    const coExport = ts
      .getModifiers(nut as ts.HasModifiers)
      ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!coExport) return;

    if (ts.isFunctionDeclaration(nut) && nut.name) {
      xuat.push(nut.name.text);
      // Tham số đầu tiên của một component React chính là props của nó.
      const thamSo = nut.parameters[0];
      if (thamSo?.type && props === null) {
        props = thamSo.type.getText(cay).replace(/\s+/g, " ").trim();
      }
    } else if (ts.isVariableStatement(nut)) {
      for (const khai of nut.declarationList.declarations) {
        if (ts.isIdentifier(khai.name)) xuat.push(khai.name.text);
      }
    } else if (ts.isInterfaceDeclaration(nut) || ts.isTypeAliasDeclaration(nut)) {
      xuat.push(nut.name.text);
    }
  });

  if (xuat.length === 0) return null;

  return {
    tep: relative(gocKho, duongDan).replace(/\\/g, "/"),
    xuat,
    props,
    vieSao: chuThichDau(nguon),
    can: [...can].filter((c) => c.startsWith("@/")),
    soDong: nguon.split("\n").length,
  };
}

function main() {
  const gocKho = process.argv[2];
  if (!gocKho) {
    console.error('Thiếu đường dẫn kho. Ví dụ:\n  npx tsx scripts/trich-khuon-mau.ts "D:/vinhomes_ha_long_xanh"');
    process.exit(1);
  }

  const tepCan = [
    ...quetThuMuc(gocKho, "src/components/site"),
    ...quetThuMuc(gocKho, "src/components/ui"),
  ];

  const muc: MucKhuonMau[] = [];
  const bo: string[] = [];
  for (const t of tepCan) {
    const m = docMotTep(gocKho, t);
    if (m) muc.push(m);
    else bo.push(relative(gocKho, t).replace(/\\/g, "/"));
  }

  const raThuMuc = join(process.cwd(), "src", "data");
  mkdirSync(raThuMuc, { recursive: true });
  const raTep = join(raThuMuc, "khuon-mau-halongxanh360.json");
  writeFileSync(
    raTep,
    JSON.stringify(
      {
        nguon: "halongxanh360.vn",
        trichLuc: new Date().toISOString(),
        soMuc: muc.length,
        muc,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Đã quét ${tepCan.length} tệp → ${muc.length} mục có thể dùng lại`);
  if (bo.length) console.log(`Bỏ qua ${bo.length} tệp không xuất gì: ${bo.join(", ")}`);
  console.log(`\nCó chú thích giải thích: ${muc.filter((m) => m.vieSao).length}/${muc.length}`);
  console.log(`Có khai báo props:      ${muc.filter((m) => m.props).length}/${muc.length}`);
  console.log(`\nGhi ra: ${relative(process.cwd(), raTep)}`);

  const dai = [...muc].sort((a, b) => b.soDong - a.soDong).slice(0, 5);
  console.log("\nNăm component lớn nhất:");
  for (const m of dai) console.log(`  ${String(m.soDong).padStart(4)} dòng  ${m.tep}`);
}

main();
