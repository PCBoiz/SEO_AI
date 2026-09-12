/**
 * DANH MỤC THÀNH PHẦN — những khối đã chạy thật trên halongxanh360.vn.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO CÓ DANH MỤC NÀY (đọc `docs/nghien-cuu-xem-truoc-va-skills.md` §4.4)
 *
 * Trình dựng website sinh trang mới bằng cách CHỌN-VÀ-GHÉP từ đây trước, chỉ
 * viết mới khi không có sẵn. Ghép khối đã chạy thì gần như chắc chắn build
 * được; viết mới thì mỗi lần là một lần rủi ro. Cùng nguyên tắc với module
 * chọn ảnh: AI chỉ được CHỌN từ danh sách đánh số, không được "nhớ ra" một
 * khối không tồn tại — đầu ra được kiểm lại theo danh mục, mã lạ thì loại.
 *
 * Danh mục VIẾT TAY, không sinh tự động từ mã nguồn: cái AI cần biết là VAI
 * TRÒ của khối (mở đầu, FAQ, biểu mẫu…) và nó ĐÒI GÌ (props hay tệp dữ liệu),
 * chứ không phải chữ ký TypeScript. Tệp gốc ghi ở `tep` để bước "sinh tệp"
 * sau này chép/chuyển thể; test kiểm tệp có tồn tại khi kho website ở cạnh.
 *
 * KHÔNG đưa vào: `bang-duyet` (màn quản trị), `theo-doi-bam` (đo lường),
 * `preloader`/`smooth-scroll` (hiệu ứng toàn trang, gắn ở layout chứ không
 * phải khối trang), `use-in-view` (hook).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type VaiTroKhoi =
  | "dieu-huong"
  | "chan-trang"
  | "mo-dau"
  | "thong-diep"
  | "san-pham"
  | "gia"
  | "so-sanh"
  | "faq"
  | "bieu-mau"
  | "lien-he"
  | "doi-ngu"
  | "vi-tri"
  | "so-do"
  | "tien-do"
  | "tien-ich"
  | "minh-bach"
  | "chot"
  | "anh"
  | "dai-chu"
  | "tim-kiem"
  | "seo"
  | "khung"
  | "tieu-de"
  | "gap-mo"
  | "hieu-ung"
  | "nen";

export interface ThanhPhan {
  /** Mã ổn định để AI chọn — trùng tên tệp bỏ đuôi. */
  ma: string;
  ten: string;
  /** Đường dẫn trong kho website, tính từ `src/components/`. */
  tep: string;
  vaiTro: VaiTroKhoi;
  /** Một câu: khối này làm gì trên trang. */
  moTa: string;
  /**
   * Khối đòi gì để chạy:
   *   `khong`   — tự đủ, đặt vào là chạy;
   *   `props`   — truyền vài giá trị (ghi ở `props`);
   *   `du-lieu` — đọc tệp `src/data/project.ts` của website gốc; muốn dùng
   *               cho website khác thì bước sinh tệp phải viết tệp dữ liệu
   *               cùng khuôn (ghi ở `ghiChu`).
   */
  duLieu: "khong" | "props" | "du-lieu";
  props?: string;
  /** `chung` dùng được cho mọi ngành; `bat-dong-san` gắn chặt với bán nhà đất. */
  nganh: "chung" | "bat-dong-san";
  ghiChu?: string;
}

export const DANH_MUC_THANH_PHAN: readonly ThanhPhan[] = [
  // ── Khung trang ────────────────────────────────────────────────────────
  { ma: "site-header", ten: "Đầu trang có điều hướng gom nhóm", tep: "site/site-header.tsx", vaiTro: "dieu-huong", moTa: "Thanh điều hướng trên cùng, gom nhóm menu, có nút gọi/Zalo; co lại khi cuộn.", duLieu: "du-lieu", nganh: "chung", ghiChu: "Đọc tên dự án, số điện thoại, danh sách trang từ dữ liệu." },
  { ma: "site-footer", ten: "Chân trang", tep: "site/site-footer.tsx", vaiTro: "chan-trang", moTa: "Chân trang: liên hệ, sơ đồ trang, dòng pháp lý.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "khung", ten: "Khung nội dung chuẩn", tep: "ui/khung.tsx", vaiTro: "khung", moTa: "Bọc mọi mảng: căn giữa, bề rộng `rong` (bố cục/ảnh) hoặc `doc` (chữ dài).", duLieu: "props", props: "rong?: 'rong' | 'doc'", nganh: "chung" },
  { ma: "tieu-de-mang", ten: "Đầu mảng: nhãn — tiêu đề — dẫn nhập — liên kết", tep: "ui/tieu-de-mang.tsx", vaiTro: "tieu-de", moTa: "Đầu của một mảng nội dung; tiêu đề có thể in nghiêng một từ bằng *dấu sao*.", duLieu: "props", props: "nhan?, tieuDe, dan?, lienKet?: {nhan, href}", nganh: "chung" },

  // ── Mở đầu & thông điệp ────────────────────────────────────────────────
  { ma: "hero-anh", ten: "Mảng mở đầu một tấm ảnh thật", tep: "site/hero-anh.tsx", vaiTro: "mo-dau", moTa: "Ảnh lớn phủ màn, chữ đè lên; ảnh 'thở' nhẹ một lần rồi dừng.", duLieu: "props", props: "anh: tên ảnh trong kho ảnh; children: chữ đè", nganh: "chung", ghiChu: "Cần một ảnh thật ≥1600px; không dùng ảnh AI (chủ dự án đã cấm)." },
  { ma: "thanh-quyet-dinh", ten: "Dải quyết định nhanh dưới mảng mở đầu", tep: "site/thanh-quyet-dinh.tsx", vaiTro: "thong-diep", moTa: "Ba–bốn ô: câu hỏi người xem đang có → link tới trang trả lời.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "moc-voucher", ten: "Móc đầu phễu (ưu đãi / lý do liên hệ ngay)", tep: "site/moc-voucher.tsx", vaiTro: "thong-diep", moTa: "Một khối ngắn đặt đầu trang chủ nêu lý do nên để lại số ngay.", duLieu: "du-lieu", nganh: "bat-dong-san", ghiChu: "Nội dung gắn với voucher Vinhomes; muốn dùng ngành khác thì viết lại chữ." },
  { ma: "ho-so-minh-bach", ten: "Hồ sơ mở / minh bạch pháp lý", tep: "site/ho-so-minh-bach.tsx", vaiTro: "minh-bach", moTa: "Bảng liệt kê giấy tờ, chủ đầu tư, tình trạng pháp lý — thứ người mua hỏi đầu tiên.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "khoi-chot", ten: "Khối chốt cuối trang", tep: "site/khoi-chot.tsx", vaiTro: "chot", moTa: "Câu chốt + lời mời liên hệ; đặt cuối trang KHÔNG có biểu mẫu.", duLieu: "props", props: "dan?: một câu nối với nội dung vừa đọc", nganh: "chung" },
  { ma: "marquee", ten: "Dải chữ chạy ngang", tep: "ui/marquee.tsx", vaiTro: "dai-chu", moTa: "Dải chữ chạy, đổi chiều theo cuộn — nhấn một thông điệp ngắn.", duLieu: "props", props: "items: string[]; duration?", nganh: "chung" },

  // ── Sản phẩm, giá, so sánh ─────────────────────────────────────────────
  { ma: "danh-sach-san-pham", ten: "Danh sách dòng sản phẩm", tep: "site/danh-sach-san-pham.tsx", vaiTro: "san-pham", moTa: "Lưới các dòng sản phẩm, mỗi ô: tên, một câu, số liệu chính, link trang riêng.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "so-lieu-dong-san-pham", ten: "Bảng số liệu một dòng sản phẩm", tep: "site/so-lieu-dong-san-pham.tsx", vaiTro: "san-pham", moTa: "Bảng thông số thật của một dòng (diện tích, giá, số căn…).", duLieu: "props", props: "ma: mã dòng sản phẩm", nganh: "bat-dong-san" },
  { ma: "bang-so-sanh", ten: "Bảng so sánh các dòng cạnh nhau", tep: "site/bang-so-sanh.tsx", vaiTro: "so-sanh", moTa: "Đặt các dòng sản phẩm cạnh nhau theo tiêu chí; cuộn ngang trên điện thoại.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "gia-thuc-tra", ten: "Giá thực trả", tep: "site/gia-thuc-tra.tsx", vaiTro: "gia", moTa: "Tính tiền phải trả thật sau ưu đãi/vay — chỗ người mua tin nhất.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "quy-can-xem-truoc", ten: "Quỹ căn xem trước", tep: "site/quy-can-xem-truoc.tsx", vaiTro: "san-pham", moTa: "Vài dòng bảng hàng nổi bật ở trang chủ, link sang bảng đầy đủ.", duLieu: "khong", nganh: "bat-dong-san" },
  { ma: "bang-hang", ten: "Bảng hàng đầy đủ (lọc, sắp xếp)", tep: "site/bang-hang.tsx", vaiTro: "san-pham", moTa: "Bảng tất cả căn đang mở, lọc theo loại/giá, sắp xếp; đọc từ dữ liệu.", duLieu: "khong", nganh: "bat-dong-san" },
  { ma: "bang-hang-quanh-day", ten: "Bảng hàng của khu đang xem", tep: "site/bang-hang-quanh-day.tsx", vaiTro: "san-pham", moTa: "Bảng hàng rút gọn cho trang một phân khu.", duLieu: "khong", nganh: "bat-dong-san" },
  { ma: "tim-can-phu-hop", ten: "Bộ gợi ý sản phẩm theo nhu cầu", tep: "site/tim-can-phu-hop.tsx", vaiTro: "tim-kiem", moTa: "Vài câu hỏi (ngân sách, mục đích) → gợi ý dòng phù hợp.", duLieu: "du-lieu", nganh: "chung" },

  // ── Vị trí, sơ đồ, tiến độ, tiện ích ───────────────────────────────────
  { ma: "so-do-ket-noi", ten: "Sơ đồ kết nối (dự án ở tâm)", tep: "site/so-do-ket-noi.tsx", vaiTro: "vi-tri", moTa: "Sơ đồ vẽ: điểm chính ở tâm, các điểm quan trọng đặt đúng hướng và xa gần.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "so-do-phan-khu", ten: "Sơ đồ quy hoạch bấm chọn", tep: "site/so-do-phan-khu.tsx", vaiTro: "so-do", moTa: "Bản đồ phân khu bấm được, mỗi khu một trang.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "phan-tich-phan-khu", ten: "Phân tích từng khu", tep: "site/phan-tich-phan-khu.tsx", vaiTro: "vi-tri", moTa: "Mỗi khu một đoạn: vị trí, điểm mạnh, ai nên chọn.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "cap-nhat-tien-do", ten: "Cập nhật tiến độ", tep: "site/cap-nhat-tien-do.tsx", vaiTro: "tien-do", moTa: "Dòng thời gian các mốc thi công/bàn giao, nuôi bằng bài viết.", duLieu: "khong", nganh: "bat-dong-san" },
  { ma: "bieu-do-tien-ich", ten: "Biểu đồ quy mô tiện ích", tep: "site/bieu-do-tien-ich.tsx", vaiTro: "tien-ich", moTa: "Thanh ngang so quy mô các hạng mục tiện ích.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "dai-anh-lon", ten: "Dải ảnh trượt ngang, không chữ", tep: "site/dai-anh-lon.tsx", vaiTro: "anh", moTa: "Một dải ảnh lớn cuộn ngang bằng CSS — cho khách 'nhìn' thay vì đọc.", duLieu: "khong", nganh: "chung", ghiChu: "Ảnh lấy từ kho ảnh đã duyệt; không ảnh AI." },
  { ma: "bang-truot", ten: "Dải trượt ngang (bọc bất kỳ nội dung)", tep: "ui/bang-truot.tsx", vaiTro: "anh", moTa: "Bọc các thẻ con thành dải cuộn ngang bằng CSS, không JavaScript.", duLieu: "props", props: "children", nganh: "chung" },

  // ── Niềm tin, hỏi đáp, liên hệ ─────────────────────────────────────────
  { ma: "doi-ngu-tu-van", ten: "Đội ngũ / người phụ trách", tep: "site/doi-ngu-tu-van.tsx", vaiTro: "doi-ngu", moTa: "Ai đứng sau trang này: tên, vai trò, cách liên hệ thẳng.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "cau-hoi-thuong-gap", ten: "Câu hỏi thường gặp", tep: "site/cau-hoi-thuong-gap.tsx", vaiTro: "faq", moTa: "Danh sách hỏi–đáp gấp mở; kèm dữ liệu có cấu trúc FAQ cho Google.", duLieu: "du-lieu", nganh: "chung" },
  { ma: "gap-mo", ten: "Khối gấp mở (mở sẵn trên máy bàn)", tep: "ui/gap-mo.tsx", vaiTro: "gap-mo", moTa: "Một câu tóm tắt luôn thấy, nội dung bên trong gấp lại trên màn hẹp.", duLieu: "props", props: "tomTat; children; gapCaOMayBan?", nganh: "chung" },
  { ma: "dang-ky-form", ten: "Biểu mẫu nhận yêu cầu tư vấn", tep: "site/dang-ky-form.tsx", vaiTro: "bieu-mau", moTa: "Tên + số điện thoại + nhu cầu → gửi về bảng khách (Google Sheets) qua webhook.", duLieu: "du-lieu", nganh: "chung", ghiChu: "Cần biến LEAD_WEBHOOK_URL/TOKEN trên máy chủ; thiếu thì lưu tệp." },
  { ma: "lien-he-noi", ten: "Nút liên hệ nổi (gọi / Zalo)", tep: "site/lien-he-noi.tsx", vaiTro: "lien-he", moTa: "Cụm nút nổi góc màn hình: gọi, Zalo — luôn trong tầm tay trên điện thoại.", duLieu: "du-lieu", nganh: "chung" },

  // ── SEO & nền ──────────────────────────────────────────────────────────
  { ma: "du-lieu-co-cau-truc", ten: "Dữ liệu có cấu trúc schema.org", tep: "site/du-lieu-co-cau-truc.tsx", vaiTro: "seo", moTa: "JSON-LD Organization/WebSite (+FAQ khi bật) đặt ở layout.", duLieu: "props", props: "coFaq?: boolean", nganh: "chung" },
  { ma: "du-lieu-quy-can", ten: "Dữ liệu có cấu trúc cho bảng hàng", tep: "site/du-lieu-quy-can.tsx", vaiTro: "seo", moTa: "JSON-LD Product/Offer cho từng dòng sản phẩm.", duLieu: "du-lieu", nganh: "bat-dong-san" },
  { ma: "project-image", ten: "Ảnh dự án (bọc next/image, có ảnh mờ)", tep: "ui/project-image.tsx", vaiTro: "anh", moTa: "Mọi ảnh đi qua đây: kích thước thật, ảnh mờ chờ tải, alt bắt buộc.", duLieu: "props", props: "ten: tên ảnh trong kho; alt; ...", nganh: "chung" },
  { ma: "reveal", ten: "Hiện dần khi cuộn tới", tep: "ui/reveal.tsx", vaiTro: "hieu-ung", moTa: "Bọc ảnh/đoạn văn để hiện dần; tôn trọng 'giảm chuyển động'.", duLieu: "props", props: "children; delay?", nganh: "chung" },
  { ma: "split-reveal", ten: "Tiêu đề hiện từng chữ", tep: "ui/split-reveal.tsx", vaiTro: "hieu-ung", moTa: "Tiêu đề lớn hiện từng từ; *dấu sao* in nghiêng một từ.", duLieu: "props", props: "text", nganh: "chung" },
  { ma: "karst-backdrop", ten: "Nền trang trí núi đá vôi", tep: "ui/karst-backdrop.tsx", vaiTro: "nen", moTa: "Nét vẽ mảnh các lớp núi vịnh Hạ Long làm nền một mảng.", duLieu: "props", props: "className?", nganh: "bat-dong-san", ghiChu: "Hình gắn với Hạ Long; ngành khác thì bỏ." },
  { ma: "tuoi-du-lieu", ten: "Số ngày kể từ mốc dữ liệu", tep: "ui/tuoi-du-lieu.tsx", vaiTro: "minh-bach", moTa: "'Cập nhật N ngày trước' cạnh bảng số liệu — nói thật dữ liệu cũ tới đâu.", duLieu: "props", props: "moc: ISO date", nganh: "chung" },
];

const THEO_MA = new Map(DANH_MUC_THANH_PHAN.map((t) => [t.ma, t]));

export function timThanhPhan(ma: string): ThanhPhan | null {
  return THEO_MA.get(ma.trim().toLowerCase()) ?? null;
}

export function laMaThanhPhan(ma: string): boolean {
  return THEO_MA.has(ma.trim().toLowerCase());
}

/** Những khối dùng được cho ngành bất kỳ — mặc định cho website ngoài bất động sản. */
export function thanhPhanChoNganh(nganh: "chung" | "bat-dong-san"): ThanhPhan[] {
  return nganh === "bat-dong-san" ? [...DANH_MUC_THANH_PHAN] : DANH_MUC_THANH_PHAN.filter((t) => t.nganh === "chung");
}

/**
 * Danh mục dạng chữ cho lời nhắc — MỘT dòng mỗi khối, có mã để AI chép lại
 * nguyên văn. Không đưa đường dẫn tệp (AI không cần) và không đưa ghi chú kỹ
 * thuật dài (tốn token, không đổi lựa chọn).
 */
export function danhMucChoAi(nganh: "chung" | "bat-dong-san"): string {
  return thanhPhanChoNganh(nganh)
    .filter((t) => !["khung", "hieu-ung", "nen", "tieu-de", "gap-mo"].includes(t.vaiTro))
    .map((t) => `- ${t.ma} [${t.vaiTro}] — ${t.ten}: ${t.moTa}${t.duLieu === "du-lieu" ? " (cần tệp dữ liệu)" : ""}`)
    .join("\n");
}
