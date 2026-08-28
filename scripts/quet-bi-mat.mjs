// Quét bí mật trước khi đẩy lên kho từ xa.
//
// Quét MỌI file được git theo dõi, ở MỌI commit trong lịch sử — không chỉ cây
// hiện tại. Xoá một bí mật ở commit mới nhất không xoá nó khỏi lịch sử; ai
// clone về vẫn đọc được bằng `git log -p`.
//
// KHÔNG IN GIÁ TRỊ. Chỉ in vị trí và loại.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const KHO = process.argv[2] || process.cwd();
const g = (...a) =>
  execFileSync("git", ["-C", KHO, ...a], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

// Mẫu bí mật THẬT — mỗi mẫu phải khớp được giá trị thật, không khớp chỗ giữ chỗ.
const MAU = [
  // Neon: mật khẩu thật bắt đầu bằng npg_ hoặc là chuỗi ngẫu nhiên sau dấu :
  [/postgres(?:ql)?:\/\/[^\s:@"']+:(?!mat_khau|matkhau|password|<)[^\s:@"']{8,}@/gi, "chuỗi kết nối Postgres có mật khẩu thật"],
  [/\bnpg_[A-Za-z0-9]{16,}/g, "mật khẩu Neon"],
  [/ep-[a-z]+-[a-z]+-[a-z0-9]{6,}/g, "định danh máy chủ Neon thật"],
  // Khoá của các nhà cung cấp
  [/\bsk-(?:ant-|proj-|live_)?[A-Za-z0-9_-]{20,}/g, "khoá API kiểu sk-"],
  [/\bAIza[A-Za-z0-9_-]{30,}/g, "khoá Google API"],
  [/\bghp_[A-Za-z0-9]{30,}/g, "token GitHub"],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}/g, "token GitHub (dạng mới)"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, "token Slack"],
  // Webhook Google Apps Script THẬT (mã triển khai dài, không phải "AKfy...")
  [/script\.google\.com\/macros\/s\/AKfy[A-Za-z0-9_-]{40,}/g, "địa chỉ webhook Apps Script thật"],
  // Khoá riêng
  [/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g, "khoá riêng"],
  // Mã voucher của khách — tuyệt đối không được có
  [/VINHOMES[A-Z0-9]{10,}/g, "mã voucher khách hàng"],
  // Số điện thoại Việt Nam thật
  [/(?:^|[^\d])(0[35789]\d{8})(?!\d)/g, "số điện thoại Việt Nam"],
];

// Chỗ giữ chỗ đã biết — không phải bí mật.
const BO_QUA = [
  /nguoi_dung:mat_khau/,
  /ten:matkhau/,
  /ten_db/,
  // Chuỗi kết nối mẫu trong file cấu hình drizzle của Antigravity:
  // `postgresql://app_placeholder:…@localhost/app_placeholder`. Mật khẩu là
  // chuỗi ngẫu nhiên nên mẫu "mat_khau|password" không bắt được, và bộ quét
  // báo đỏ hai lần cho hai file hoàn toàn vô hại.
  //
  // Chỉ miễn trừ đúng chữ `placeholder`, KHÔNG miễn trừ `localhost`: một chuỗi
  // trỏ localhost vẫn có thể mang mật khẩu thật của máy ai đó.
  /placeholder/i,
  /VINHOMESKIEMTHU/,
  /AKfy\.\.\./,
  /<INGEST_TOKEN>/,
  /0901[ .]?234[ .]?567/, // số mẫu trong tài liệu, không có thật
  // Số dùng trong lệnh chạy thử ở `NHAN-DANG-KY.md`. Đúng khuôn để qua được bộ
  // kiểm của biểu mẫu (`^0[35789]\d{8}$`) nhưng toàn số 0, nên không thuộc về
  // ai. Đây là chỗ giữ chỗ từ đầu, không phải số thật được thay sau.
  //
  // KHÔNG dùng `\b` ở hai đầu, và đó là chủ ý: thiếu nó thì chính DÒNG NÀY —
  // dòng khai chỗ giữ chỗ — bị bộ quét bắt là số điện thoại. Với `\b` thì mẫu
  // không tự khớp được văn bản nguồn của chính nó (`\b` đứng ngay trước `0`,
  // mà `b` và `0` đều là ký tự chữ nên không có ranh giới từ ở đó), và bộ quét
  // báo đỏ về chính danh sách miễn trừ của mình.
  /0900000000/,
];

/**
 * Số điện thoại CÔNG KHAI của chính trang — đọc thẳng từ `src/data/project.ts`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO MIỄN TRỪ, VÀ VÌ SAO KHÔNG MIỄN TRỪ CẢ LOẠI
 *
 * Bộ quét này bắt số điện thoại Việt Nam vì một lý do thật: dữ liệu khách đăng
 * ký tuyệt đối không được lọt vào kho mã. Nhưng hotline của trang cũng là một
 * số Việt Nam, và nó xuất hiện ở BỐN chỗ trong kho — nên mỗi lần quét đều có
 * bốn dòng đỏ không ai sửa được.
 *
 * Cảnh báo không sửa được là cảnh báo người ta học cách bỏ qua, kéo theo cả
 * những cảnh báo thật nằm cạnh nó. Một bộ quét lần nào cũng đỏ thì bằng không
 * có bộ quét.
 *
 * Nên miễn trừ ĐÚNG NHỮNG SỐ trang đang in ra cho khách gọi. Mọi số Việt Nam
 * khác vẫn bị bắt.
 *
 * ĐỌC TỪ MÃ, KHÔNG CHÉP TAY. Chép tay thì đổi hotline là bộ quét lại đỏ, và
 * người sửa sẽ nới rộng luật cho xong việc — lần sau số thật của khách lọt qua.
 * Đọc từ `project.ts` thì miễn trừ luôn bám đúng "số trang đang công khai".
 * ═══════════════════════════════════════════════════════════════════════════
 */
function soCongKhai() {
  const ra = new Set();
  try {
    const nguon = readFileSync(`${KHO}/src/data/project.ts`, "utf8");
    for (const m of nguon.matchAll(/\b(?:hotline|zalo|dienThoai)\s*:\s*"([^"]+)"/g)) {
      const so = m[1].replace(/\D/g, "");
      if (so.length === 10) ra.add(so);
    }
  } catch {
    // Không đọc được thì không miễn trừ gì — quét chặt hơn, không lỏng hơn.
  }
  return ra;
}
const SO_MIEN_TRU = soCongKhai();

function laGiuCho(dong) {
  if (BO_QUA.some((r) => r.test(dong))) return true;

  // Dòng chỉ chứa (các) số công khai của chính trang thì không phải rò rỉ.
  // `every` chứ không `some`: một dòng có cả hotline lẫn một số lạ VẪN bị bắt.
  const soTrongDong = [...dong.matchAll(/0[35789][\d .]{8,12}/g)]
    .map((m) => m[0].replace(/\D/g, ""))
    .filter((s) => s.length === 10);
  return soTrongDong.length > 0 && soTrongDong.every((s) => SO_MIEN_TRU.has(s));
}

function quet(noiDung, nhan, ra) {
  if (noiDung.includes("\u0000")) return; // file nhị phân
  const dong = noiDung.split("\n");
  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];
    if (d.length > 4000) continue; // dòng sinh tự động
    if (laGiuCho(d)) continue;
    for (const [mau, loai] of MAU) {
      mau.lastIndex = 0;
      if (mau.test(d)) {
        ra.push({ nhan, dong: i + 1, loai });
        break;
      }
    }
  }
}

// ── 1. Cây hiện tại ────────────────────────────────────────────────────────
//
// ⚠️ QUÉT CẢ FILE CHƯA ĐƯỢC THEO DÕI, KHÔNG CHỈ FILE ĐÃ THEO DÕI.
//
// Bản đầu chỉ dùng `git ls-files`, tức chỉ file đã nằm trong kho. Nghe hợp lý —
// thứ chưa theo dõi thì chưa đẩy lên được. Nhưng nó bỏ lọt đúng trường hợp
// nguy hiểm nhất: một file MỚI có bí mật, chưa `git add`, đang chờ ai đó gõ
// `git add -A` rồi commit. Bộ quét chạy lúc đó báo sạch, và một phút sau bí
// mật lên kho.
//
// Đã tái hiện: đặt một số điện thoại lạ vào một file mới rồi chạy quét — báo
// "✓ sạch". Bộ quét mù đúng lúc cần nó nhất.
//
// `--cached --others --exclude-standard` = đã theo dõi + chưa theo dõi nhưng
// KHÔNG bị .gitignore chặn. Đúng bằng tập hợp mà `git add -A` sẽ quét vào.
// File đã bị .gitignore chặn (`.env`, `.data/`) thì bỏ qua — chúng không có
// đường lên kho, và quét chúng chỉ tạo báo động giả về chính thứ đang được
// bảo vệ đúng cách.
const files = g("ls-files", "--cached", "--others", "--exclude-standard")
  .trim()
  .split("\n")
  .filter(Boolean);
const rrCay = [];
for (const f of files) {
  let noi;
  try {
    noi = readFileSync(`${KHO}/${f}`, "utf8");
  } catch {
    continue;
  }
  quet(noi, f, rrCay);
}

// ── 2. Toàn bộ lịch sử ─────────────────────────────────────────────────────
const commits = g("log", "--all", "--format=%H").trim().split("\n").filter(Boolean);
const rrSu = [];
for (const c of commits) {
  let dien;
  try {
    dien = g("show", "--format=", "--unified=0", c);
  } catch {
    continue;
  }
  // Chỉ xét dòng THÊM VÀO
  const themVao = dien
    .split("\n")
    .filter((d) => d.startsWith("+") && !d.startsWith("+++"))
    .join("\n");
  quet(themVao, c.slice(0, 7), rrSu);
}

const in_ = (t, r) => {
  console.log(`\n${t}`);
  if (r.length === 0) {
    console.log("  ✓ sạch");
    return;
  }
  const gom = new Map();
  for (const x of r) {
    const k = `${x.nhan}|${x.loai}`;
    if (!gom.has(k)) gom.set(k, { ...x, so: 0 });
    gom.get(k).so++;
  }
  for (const x of gom.values()) {
    console.log(`  ✗ ${x.nhan}:${x.dong}  — ${x.loai}${x.so > 1 ? ` (×${x.so})` : ""}`);
  }
};

console.log(`Quét ${files.length} file được theo dõi và ${commits.length} commit.`);
in_("CÂY HIỆN TẠI", rrCay);
in_("TOÀN BỘ LỊCH SỬ (chỉ dòng thêm vào)", rrSu);

if (rrCay.length || rrSu.length) {
  console.log("\n⚠ CÓ NGHI NGỜ — kiểm từng chỗ trước khi đẩy.");
  process.exitCode = 1;
} else {
  console.log("\n✓ Không thấy bí mật nào. Đẩy được.");
}
