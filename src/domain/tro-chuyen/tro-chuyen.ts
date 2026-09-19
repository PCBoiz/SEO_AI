/**
 * TRÒ CHUYỆN VỚI TRỢ LÝ — phần THUẦN (không mạng, không cơ sở dữ liệu).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CÓ, VÀ CHẠY BẰNG GÌ
 *
 * Chủ dự án chốt 15/09/2026: làm khung trò chuyện trước (nhờ AI lên ý tưởng
 * website, viết nội dung). Trò chuyện chạy bằng KHOÁ AI người dùng đã lưu trong
 * Antigravity (BYOK) — cùng khoá 24 module đang dùng.
 *
 * KHÔNG dùng gói Claude Pro/Max của người dùng: gói trả phí không kèm quyền gọi
 * API, và Anthropic cấm đem đăng nhập của gói tiêu dùng sang sản phẩm khác
 * (support.claude.com, bài 9876003; chi tiết `docs/nghien-cuu-dung-website.md`
 * mục 6).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type VaiTro = "nguoi-dung" | "tro-ly";

export interface TinNhan {
  vai: VaiTro;
  noiDung: string;
}

export const GIOI_HAN_TRO_CHUYEN = {
  /** Một tin nhắn người dùng gửi. */
  kyTuMoiTin: 4_000,
  /** Tổng ký tự lịch sử gửi kèm cho model mỗi lượt — giữ chi phí mỗi lượt có trần. */
  kyTuLichSu: 24_000,
  soTinLichSuToiDa: 30,
  tokenTraLoiToiDa: 2_048,
  tieuDeToiDa: 60,
} as const;

export function kiemTinNhan(
  noiDung: unknown,
): { ok: true; noiDung: string } | { ok: false; lyDo: string } {
  const chu = typeof noiDung === "string" ? noiDung.trim() : "";
  if (!chu) return { ok: false, lyDo: "Chưa có nội dung để gửi." };
  if (chu.length > GIOI_HAN_TRO_CHUYEN.kyTuMoiTin) {
    return {
      ok: false,
      lyDo: `Tin nhắn dài ${chu.length.toLocaleString("vi-VN")} ký tự, quá ${GIOI_HAN_TRO_CHUYEN.kyTuMoiTin.toLocaleString("vi-VN")} — chia làm nhiều tin.`,
    };
  }
  return { ok: true, noiDung: chu };
}

/**
 * Chọn phần lịch sử gửi kèm cho model: các tin MỚI NHẤT vừa trần ký tự và trần
 * số tin, theo đúng thứ tự thời gian.
 *
 * Hai ràng buộc của nhà cung cấp, xử lý ở đây cho cả bốn:
 * - Lượt đầu phải là người dùng (Anthropic từ chối hội thoại mở đầu bằng trợ
 *   lý) → bỏ các tin trợ lý đứng đầu sau khi cắt.
 * - Hai tin liền nhau cùng vai (người dùng gửi lại sau khi lượt trước lỗi) →
 *   gộp làm một, để không nhà cung cấp nào nhận hai lượt người dùng liền nhau.
 *
 * Tin mới nhất LUÔN được giữ, kể cả khi riêng nó đã vượt trần (đã qua
 * `kiemTinNhan` nên không quá 4.000 ký tự).
 */
export function catLichSu(
  tin: readonly TinNhan[],
  kyTuToiDa: number = GIOI_HAN_TRO_CHUYEN.kyTuLichSu,
  soTinToiDa: number = GIOI_HAN_TRO_CHUYEN.soTinLichSuToiDa,
): TinNhan[] {
  const giu: TinNhan[] = [];
  let tong = 0;
  for (let i = tin.length - 1; i >= 0; i--) {
    const t = tin[i]!;
    if (giu.length > 0 && (giu.length >= soTinToiDa || tong + t.noiDung.length > kyTuToiDa)) break;
    giu.unshift(t);
    tong += t.noiDung.length;
  }
  while (giu.length > 0 && giu[0]!.vai !== "nguoi-dung") giu.shift();
  const gop: TinNhan[] = [];
  for (const t of giu) {
    const cuoi = gop[gop.length - 1];
    if (cuoi && cuoi.vai === t.vai) cuoi.noiDung = `${cuoi.noiDung}\n\n${t.noiDung}`;
    else gop.push({ vai: t.vai, noiDung: t.noiDung });
  }
  return gop;
}

/** Tiêu đề cuộc trò chuyện từ tin đầu: dòng đầu, gọn khoảng trắng, tối đa 60 ký tự. */
export function tieuDeTuTinDau(noiDung: string): string {
  const dong = noiDung.trim().split(/\r?\n/)[0]?.replace(/\s+/g, " ").trim() ?? "";
  if (!dong) return "Cuộc trò chuyện mới";
  const toiDa = GIOI_HAN_TRO_CHUYEN.tieuDeToiDa;
  return dong.length <= toiDa ? dong : `${dong.slice(0, toiDa - 1).trimEnd()}…`;
}

export interface NguCanhDuAn {
  ten: string;
  website?: string | null;
  ngonNgu?: string | null;
  giongVan?: string | null;
  /**
   * Bản dựng website ĐÃ CÓ của dự án (tên + các trang). Có thì trợ lý biết
   * "sửa" là sửa bản này — ra khối với `yeuCauSua` (1 lượt gọi) thay vì dựng
   * lại từ đầu (4 lượt), và giữ đúng tên website.
   */
  webDaDung?: { tenWebsite: string; trang: string[] } | null;
}

/**
 * Lời dặn hệ thống cho trợ lý.
 *
 * Ba điều đã trả giá thật ở chỗ khác trong kho, nên nói thẳng với model:
 * - KHÔNG BỊA SỐ (giá, diện tích, pháp lý) — luật chung của cả dự án.
 * - ĐƯA NGÀY HÔM NAY: model không có đồng hồ, "mới nhất" sẽ ra năm cũ
 *   (`dongHomNay` trong `domain/modules/seo-geo.ts`, đo 09/09).
 * - Trợ lý DỰNG ĐƯỢC WEBSITE ngay trong cuộc trò chuyện (từ 18/09/2026) bằng
 *   một khối lệnh ở cuối câu trả lời — xem `hanh-dong.ts`. Nhưng nó không
 *   được nói "đã dựng xong": Antigravity mới là bên chạy, và hiện kết quả
 *   ngay dưới tin. Việc khác (đăng bài, lịch, Drive) vẫn chỉ màn để bấm.
 */
export function dungLoiDanTroLy(tuyChon: { homNay: string; duAn?: NguCanhDuAn | null }): string {
  const dong = [
    "Bạn là trợ lý trong Antigravity — công cụ giúp chủ doanh nghiệp (thường là sàn/môi giới bất động sản) có website, nội dung và khách tìm thấy trên Google.",
    "Việc của bạn: cùng người dùng lên ý tưởng website (trang nào, mục nào, nói gì), viết và sửa nội dung (tiêu đề, đoạn giới thiệu, bài viết, câu hỏi thường gặp), góp ý SEO — và DỰNG WEBSITE ngay trong cuộc trò chuyện (xem dưới).",
    "",
    "Cách trả lời:",
    "- Tiếng Việt, ngắn gọn, cụ thể. Liệt kê thì dùng gạch đầu dòng. Người dùng không rành công nghệ: tránh thuật ngữ, có thuật ngữ thì giải thích một câu.",
    "- KHÔNG BỊA SỐ LIỆU: giá, diện tích, pháp lý, tiến độ, số thống kê. Người dùng chưa cho con số thì hỏi lại, hoặc để chỗ trống ghi rõ [cần điền].",
    `- Hôm nay là ${tuyChon.homNay}. Nói "mới nhất", "năm nay" thì theo ngày này.`,
    "- Không bao giờ xin khoá API, mật khẩu hay mã bí mật.",
    "",
    "DỰNG WEBSITE: khi người dùng muốn có website (hoặc muốn sửa bản đã dựng) và bạn đã biết (1) tên doanh nghiệp/thương hiệu, (2) website để làm gì, cho ai, muốn khách làm gì — thì LÀM LUÔN: trả lời 2–4 câu nói bạn sẽ dựng gì, rồi kết thúc câu trả lời bằng đúng MỘT khối như sau (đúng chữ `antigravity` sau ba dấu huyền):",
    "```antigravity",
    '{"hanhDong":"dung-website","tenWebsite":"Tên doanh nghiệp","moTa":"Website để làm gì, cho ai, muốn khách làm gì, trang/mục người dùng nhắc — 2 đến 6 câu.","nganh":"bất động sản","goiY":"cảm giác thiết kế nếu người dùng nói (để trống nếu không)","mauThuongHieu":"","suThat":"CHỈ con số, tên riêng, địa chỉ người dùng đã cho — không có thì để trống","yeuCauSua":"","phamVi":"tat-ca"}',
    "```",
    "- Thiếu (1) hoặc (2) thì hỏi MỘT lượt, gọn — đừng hỏi thêm những thứ khác; đủ rồi thì ra khối, đừng viết bản mẫu giấy dài thay cho việc dựng.",
    "- Antigravity sẽ chạy khối này (4 bước, bằng khoá của người dùng) và hiện BẢN XEM THỬ ngay dưới tin của bạn, kèm nút Ưng ý / Cần sửa. Vì thế KHÔNG nói \"tôi đã dựng xong\" — nói \"đang dựng, xem bên dưới\".",
    "- Người dùng muốn đổi bản đã dựng: ra lại khối với `yeuCauSua` ghi đúng điều họ muốn; `phamVi` là \"chu\" nếu chỉ đổi chữ/giọng (rẻ, giữ nguyên trang và màu), \"tat-ca\" nếu đổi trang, khối, màu, bố cục.",
    "- Cuộc trò chuyện chưa gắn dự án thì vẫn ra khối — Antigravity sẽ hỏi người dùng chọn hoặc tạo dự án tên `tenWebsite`.",
    "",
    "Việc khác cần máy làm thì chỉ đúng chỗ, và không nói là bạn đã làm:",
    "- Viết một bài và đẩy sang website: màn Bắt đầu → \"Viết một bài mới\" (/bat-dau).",
    "- Lịch đăng bài tự động, ảnh từ Google Drive, khách liên hệ về Google Sheets, đưa website lên mạng: trang của dự án (/projects).",
    "- Chạy lại từng bước dựng web bằng tay: màn Quy trình (/pipelines?luong=website_draft). Số liệu tìm kiếm Google: /analytics. Khoá AI: /ai-keys.",
  ];
  const d = tuyChon.duAn;
  if (d) {
    dong.push("", "Dự án người dùng đang nói tới:", `- Tên: ${d.ten}`);
    if (d.website) dong.push(`- Website: ${d.website}`);
    if (d.ngonNgu) dong.push(`- Ngôn ngữ nội dung: ${d.ngonNgu}`);
    if (d.giongVan) dong.push(`- Giọng văn: ${d.giongVan}`);
    if (d.webDaDung) {
      dong.push(
        `- ĐÃ CÓ bản dựng website «${d.webDaDung.tenWebsite}» (trang: ${d.webDaDung.trang.join(", ")}). Người dùng muốn đổi gì thì ra khối với \`tenWebsite\` giữ nguyên «${d.webDaDung.tenWebsite}», \`yeuCauSua\` ghi đúng điều họ muốn, và \`phamVi\` theo luật ở trên — đừng dựng lại từ đầu khi họ chỉ muốn sửa chữ.`,
      );
    }
  }
  return dong.join("\n");
}
