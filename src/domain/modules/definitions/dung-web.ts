import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { noPreamble } from "@/domain/modules/generate-with-retry";
import { upstreamBlock } from "@/domain/modules/definitions/shared";
import { danhMucChoAi } from "@/domain/dung-web/danh-muc-thanh-phan";
import { coMauKhoi } from "@/domain/dung-web/khoi/mau-khoi";
import { chuanHoaKienTruc, kiemKienTruc, moTaKienTruc } from "@/domain/dung-web/kien-truc";
import { FONT_TIENG_VIET, docHeThietKe, kiemHeThietKe, moTaHeThietKe } from "@/domain/dung-web/he-thiet-ke";
import { kienTrucSchema } from "@/domain/dung-web/kien-truc";
import { docJson } from "@/domain/dung-web/doc-json";
import { KHOA_DAU_KIEN_TRUC, dauKienTruc } from "@/domain/dung-web/tu-dau-ra";
import { docChuTrang, khoiCanChu, kiemChuTrang, moTaTruongChoAi } from "@/domain/dung-web/noi-dung-khoi";

/* ══════════════════════════════════════════════════════════════════════════
   TRÌNH DỰNG WEBSITE — ba bước đầu (Ý định → Kiến trúc → Hệ thiết kế).

   Theo `docs/nghien-cuu-dung-website.md` §4 và `docs/nghien-cuu-xem-truoc-va-
   skills.md` §5. Ba bước này là phần "nghĩ" của trình dựng: chưa sinh một tệp
   mã nào. Đó là cố ý — bước sinh tệp + kiểm chứng (tsc, next build) phải chạy
   trên máy (Vercel 300 s, ổ chỉ đọc), làm sau khi ba bước này ra hợp đồng
   đứng vững.

   Mỗi bước là một ModuleDefinition bình thường, nối luồng qua `upstream`
   như mọi module khác. Đầu ra bước 2 và 3 là JSON KIỂM ĐƯỢC Ở CODE (mã khối
   phải có trong danh mục; màu phải là hex; font phải có tiếng Việt; tương
   phản phải đủ) — model sai thì `generateWithRetry` nhắc đúng chỗ sai.
   ══════════════════════════════════════════════════════════════════════════ */

const KHOA_Y_DINH = "RIS_WEB_Y_DINH";
const KHOA_KIEN_TRUC = "RIS_WEB_KIEN_TRUC";
const KHOA_THIET_KE = "RIS_WEB_THIET_KE";
const KHOA_VIET_CHU = "RIS_WEB_VIET_CHU";

const heThong = (vai: string) =>
  [
    `${vai} Làm việc cho một người KHÔNG biết lập trình: họ mô tả bằng lời, bạn biến thành thứ máy dựng được.`,
    "Chỉ trả về đúng thứ được yêu cầu — không lời dẫn, không giải thích quy trình, không hỏi lại.",
    "Không bịa số liệu, giá, địa chỉ, tên người: chỗ nào cần dữ liệu thật thì ghi rõ là cần chủ website cung cấp.",
    "Viết tiếng Việt có dấu, xưng hô trung tính.",
  ].join(" ");

/* ───────────────────── #24 · Ý định ───────────────────────────────────── */

// Tên trường DÙNG LẠI khoá chung của trang Quy trình (`audienceBrief`,
// `siteName`, `websiteUrl`) — trang đó rót đầu vào theo tên khoá, nên đặt tên
// riêng (`moTa`, `tenDoanhNghiep`) là chạy lẻ được mà chạy cả luồng thì bước
// đầu chết vì thiếu ô. Nhãn hiển thị vẫn nói đúng việc của bước này.
const yDinhInput = z
  .object({
    ...moduleJobBaseShape,
    audienceBrief: z.string().trim().min(20, "Mô tả ít nhất 20 ký tự — nói website để làm gì, cho ai.").max(6_000),
    siteName: z.string().trim().min(1, "Thiếu tên doanh nghiệp / thương hiệu.").max(120),
    nganh: z.string().trim().max(120).default(""),
    websiteUrl: z.string().trim().max(300).default(""),
  })
  .strict();
export type WebYDinhInput = z.infer<typeof yDinhInput>;

const yDinhOutput = z.object({ contractVersion: z.literal("1.0"), yDinh: z.string().min(1) }).strict();
export type WebYDinhOutput = z.infer<typeof yDinhOutput>;

export const webYDinhModule: ModuleDefinition<WebYDinhInput, WebYDinhOutput> = {
  key: KHOA_Y_DINH,
  moduleNumber: 24,
  title: "Dựng web · Ý định",
  description:
    "Bước 1/3 của trình dựng website: từ mô tả bằng lời rút ra vấn đề, kết quả mong muốn, đối tượng, ràng buộc, và những gì KHÔNG làm.",
  category: "Website",
  inputSchema: yDinhInput,
  outputSchema: yDinhOutput,
  form: [
    { key: "siteName", label: "Tên doanh nghiệp / thương hiệu", type: "text", required: true, prefillFromProject: "name" },
    {
      key: "audienceBrief",
      label: "Website này để làm gì, cho ai?",
      type: "textarea",
      required: true,
      rows: 6,
      placeholder:
        "Ví dụ: Tôi môi giới biệt thự ở Hạ Long. Muốn một trang để khách xem quỹ căn, giá thực trả, rồi để lại số. Không cần đăng nhập. Phải xem tốt trên điện thoại.",
      description: "Nói như nói với một người bạn. Càng cụ thể về khách và việc họ cần làm trên trang càng tốt.",
    },
    { key: "nganh", label: "Ngành (tùy chọn)", type: "text", placeholder: "Ví dụ: bất động sản, phòng khám, quán cà phê" },
    { key: "websiteUrl", label: "Website hiện có (nếu có)", type: "text", prefillFromProject: "website" },
  ],
  outputBlocks: [{ key: "yDinh", label: "Ý định" }],
  consumes: ["RIS_SITE_SCAN"],
  async execute({ input, generate, upstream }) {
    const boiCanh = upstreamBlock(upstream, [{ key: "RIS_SITE_SCAN", label: "Website hiện có đã quét (Module 20)" }]);
    const yDinh = await generate({
      systemPrompt: heThong("Bạn là người phân tích yêu cầu website, nhiều năm làm với chủ doanh nghiệp nhỏ."),
      prompt: [
        `Doanh nghiệp: ${input.siteName}${input.nganh ? ` · ngành: ${input.nganh}` : ""}${input.websiteUrl ? ` · website hiện có: ${input.websiteUrl}` : ""}`,
        "",
        "Chủ website mô tả:",
        input.audienceBrief,
        boiCanh,
        "",
        "Viết bản Ý ĐỊNH theo đúng 6 mục, mỗi mục là tiêu đề `## ` rồi gạch đầu dòng ngắn:",
        "## Vấn đề — người xem đang cần gì mà chưa được đáp ứng",
        "## Kết quả mong muốn — sau khi xem trang, người xem làm gì (một hành động chính, tối đa hai)",
        "## Đối tượng — ai xem, xem bằng gì (điện thoại?), họ đã biết gì rồi",
        "## Nội dung phải có — liệt kê từng thứ, ghi (cần chủ website cung cấp) ở chỗ cần dữ liệu thật",
        "## Ràng buộc — kỹ thuật, pháp lý, thời gian, ngân sách; luôn có: không ảnh AI, không bịa số",
        "## Không làm — những thứ cố ý bỏ ở bản đầu (đăng nhập, thanh toán, đa ngôn ngữ…)",
        "",
        "Tối đa 400 chữ. Vào thẳng mục đầu tiên.",
      ].join("\n"),
      maxOutputTokens: 1_800,
      validate: noPreamble,
    });
    return { contractVersion: "1.0", yDinh };
  },
};

/* ───────────────────── #25 · Kiến trúc ─────────────────────────────────── */

const kienTrucInput = z
  .object({
    ...moduleJobBaseShape,
    /** Để trống thì lấy Ý định từ bước trước (nối luồng). */
    yDinh: z.string().trim().max(8_000).default(""),
    nganh: z.enum(["chung", "bat-dong-san"]).default("chung"),
    soTrangToiDa: z.coerce.number().int().min(1).max(8).default(5),
  })
  .strict();
export type WebKienTrucInput = z.infer<typeof kienTrucInput>;

const kienTrucOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    /** Bản chữ cho người đọc. */
    moTa: z.string().min(1),
    /** JSON trong fence ```json — bước sau đọc lại bằng `docJson`. */
    json: z.string().min(1),
    ghiChu: z.string().min(1),
  })
  .strict();
export type WebKienTrucOutput = z.infer<typeof kienTrucOutput>;

export const webKienTrucModule: ModuleDefinition<WebKienTrucInput, WebKienTrucOutput> = {
  key: KHOA_KIEN_TRUC,
  moduleNumber: 25,
  title: "Dựng web · Kiến trúc",
  description:
    "Bước 2/3: từ Ý định ra danh sách trang, mỗi trang là dãy khối CHỌN TỪ DANH MỤC đã chạy thật (halongxanh360) — mã lạ bị loại.",
  category: "Website",
  // Đếm ảnh trong thư mục Drive của dự án để không đề xuất khối cần ảnh khi
  // không có tấm nào — khối ảnh rỗng thì tự biến mất, và người đọc kiến trúc
  // thấy "dải ảnh" nhưng mở trang ra không có gì.
  needsDrive: true,
  inputSchema: kienTrucInput,
  outputSchema: kienTrucOutput,
  form: [
    {
      key: "nganh",
      label: "Bộ khối",
      type: "select",
      options: [
        { label: "Ngành chung (khối dùng được cho mọi ngành)", value: "chung" },
        { label: "Bất động sản (thêm bảng hàng, giá thực trả, sơ đồ phân khu…)", value: "bat-dong-san" },
      ],
    },
    { key: "soTrangToiDa", label: "Số trang tối đa", type: "text", placeholder: "5", description: "1–8. Bản đầu nên ít trang, mỗi trang làm tốt một việc." },
    {
      key: "yDinh",
      label: "Ý định (để trống thì lấy từ bước Ý định)",
      type: "textarea",
      rows: 6,
      description: "Dán bản Ý định nếu chạy lẻ; chạy trong quy trình thì tự nối.",
    },
  ],
  outputBlocks: [
    { key: "moTa", label: "Kiến trúc" },
    { key: "json", label: "JSON kiến trúc" },
    { key: "ghiChu", label: "Ghi chú" },
  ],
  consumes: [KHOA_Y_DINH],
  async execute({ input, generate, upstream, drive }) {
    const yDinh = input.yDinh || upstream[KHOA_Y_DINH] || "";
    if (!yDinh) {
      throw new Error("Thiếu Ý định: chạy bước «Dựng web · Ý định» trước, hoặc dán bản Ý định vào ô.");
    }
    // Có bao nhiêu ảnh thật? Chưa nối Drive hoặc thư mục rỗng thì nói thẳng
    // cho model, đừng để nó vẽ ra một dải ảnh không có ảnh nào.
    const soAnh = drive ? await drive.lietKe().then((a) => a.length).catch(() => 0) : 0;
    const van = await generate({
      systemPrompt: heThong("Bạn là kiến trúc sư thông tin cho website tĩnh nhiều mục."),
      prompt: [
        "Ý ĐỊNH của website:",
        yDinh,
        "",
        soAnh > 0
          ? `Thư mục ảnh của dự án có ${soAnh} tấm ảnh thật — dùng được cho khối cần ảnh.`
          : "Dự án CHƯA có tấm ảnh nào. KHÔNG chọn khối cần ảnh (dai-anh-lon); trang sẽ toàn chữ.",
        "",
        "DANH MỤC KHỐI — chỉ được dùng đúng các mã dưới đây (chép nguyên văn mã trong ngoặc vuông đầu dòng):",
        // Chỉ mời khối có khuôn dựng — xem ghi chú ở `danhMucChoAi`.
        danhMucChoAi(input.nganh, coMauKhoi),
        "",
        `Thiết kế tối đa ${input.soTrangToiDa} trang. Trang chủ bắt buộc có duong "/". Mỗi trang 2–12 khối, xếp theo thứ tự người đọc cuộn xuống.`,
        // Thứ tự đã chạy thật trên halongxanh360 và là thứ tự người Việt hay
        // đọc một trang bán hàng: thấy ngay có gì → lý do gọi ngay → giá/sản
        // phẩm → ai đứng sau → hỏi đáp → để lại số. Không ép, chỉ nêu làm mặc định.
        "Thứ tự nên theo cho trang chủ: mở đầu (hero-anh) → lý do liên hệ ngay hoặc dải quyết định → sản phẩm/giá → niềm tin (đội ngũ, hồ sơ mở) → hỏi đáp → biểu mẫu để lại số. Trang con: mở bằng nội dung chính, kết bằng khối chốt hoặc biểu mẫu — đừng để trang kết thúc bằng một bảng.",
        "Mỗi trang chỉ MỘT biểu mẫu (dang-ky-form); trang không có biểu mẫu thì kết bằng khoi-chot.",
        "Khối có trên mọi trang (đầu trang, chân trang, nút liên hệ nổi) đưa vào khoiChung, KHÔNG lặp lại trong từng trang.",
        "Khối nào cần mà danh mục không có → ghi vào canVietMoi (tên, vai trò, mô tả), KHÔNG bịa mã.",
        "Dữ liệu thật chủ website phải cung cấp (số điện thoại, giá, ảnh, giấy tờ…) → liệt kê ở duLieuCan.",
        "",
        "Trả về đúng MỘT khối JSON theo khuôn này, không chữ nào ngoài khối:",
        "```json",
        JSON.stringify(
          {
            tenWebsite: "tên",
            nganh: input.nganh,
            khoiChung: ["site-header", "site-footer", "lien-he-noi"],
            trang: [
              { duong: "/", tieuDe: "Trang chủ", mucDich: "một câu", khoi: [{ ma: "hero-anh", noiDung: "một–hai câu: khối này nói gì ở đây" }] },
            ],
            canVietMoi: [{ ten: "tên khối", vaiTro: "vai trò", moTa: "mô tả" }],
            duLieuCan: ["số điện thoại tư vấn"],
          },
          null,
          2,
        ),
        "```",
      ].join("\n"),
      maxOutputTokens: 4_000,
      validate: kiemKienTruc,
    });
    const chuan = chuanHoaKienTruc(van);
    if (!chuan) {
      throw new Error("Model không trả về kiến trúc đọc được sau hai lần — chạy lại, hoặc mô tả Ý định rõ hơn.");
    }
    const soKhoi = chuan.kienTruc.trang.reduce((n, t) => n + t.khoi.length, 0);
    return {
      contractVersion: "1.0",
      moTa: moTaKienTruc(chuan.kienTruc),
      json: "```json\n" + JSON.stringify(chuan.kienTruc, null, 2) + "\n```",
      ghiChu: [
        `${chuan.kienTruc.trang.length} trang · ${soKhoi} khối từ danh mục · ${chuan.kienTruc.canVietMoi.length} khối cần viết mới · ${chuan.kienTruc.duLieuCan.length} mục dữ liệu cần chủ website.`,
        ...chuan.canhBao.map((c) => `⚠️ ${c}`),
      ].join("\n"),
    };
  },
};

/* ───────────────────── #26 · Hệ thiết kế ───────────────────────────────── */

const thietKeInput = z
  .object({
    ...moduleJobBaseShape,
    yDinh: z.string().trim().max(8_000).default(""),
    /** Gợi ý bằng lời: "xanh rêu trầm, sang, ít màu". Để trống thì AI tự chọn theo ý định. */
    goiY: z.string().trim().max(600).default(""),
    /** Màu thương hiệu đã có (hex) — nếu có thì phải giữ. */
    mauThuongHieu: z
      .string()
      .trim()
      .regex(/^(#[0-9a-fA-F]{6})?$/, "Màu thương hiệu phải là mã hex 6 số, ví dụ #1a6b4a")
      .default(""),
  })
  .strict();
export type WebThietKeInput = z.infer<typeof thietKeInput>;

const thietKeOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    moTa: z.string().min(1),
    json: z.string().min(1),
  })
  .strict();
export type WebThietKeOutput = z.infer<typeof thietKeOutput>;

export const webThietKeModule: ModuleDefinition<WebThietKeInput, WebThietKeOutput> = {
  key: KHOA_THIET_KE,
  moduleNumber: 26,
  title: "Dựng web · Hệ thiết kế",
  description:
    "Bước 3/3: bốn màu, cặp font có tiếng Việt, khoảng cách, góc bo — kiểm tương phản ở code, không tin mắt model.",
  category: "Website",
  inputSchema: thietKeInput,
  outputSchema: thietKeOutput,
  form: [
    { key: "goiY", label: "Gợi ý cảm giác (tùy chọn)", type: "text", placeholder: "Ví dụ: xanh rêu trầm, sang, ít màu, chữ to" },
    { key: "mauThuongHieu", label: "Màu thương hiệu đã có (tùy chọn)", type: "text", placeholder: "#1a6b4a" },
    { key: "yDinh", label: "Ý định (để trống thì lấy từ bước Ý định)", type: "textarea", rows: 4 },
  ],
  outputBlocks: [
    { key: "moTa", label: "Hệ thiết kế" },
    { key: "json", label: "JSON hệ thiết kế" },
  ],
  consumes: [KHOA_Y_DINH, KHOA_KIEN_TRUC],
  async execute({ input, generate, upstream }) {
    const yDinh = input.yDinh || upstream[KHOA_Y_DINH] || "";
    const kienTruc = upstream[KHOA_KIEN_TRUC] ? `\nKIẾN TRÚC đã chốt (để biết trang có những khối gì):\n${upstream[KHOA_KIEN_TRUC].slice(0, 3_000)}` : "";
    const van = await generate({
      systemPrompt: heThong("Bạn là người làm hệ thiết kế cho website, coi trọng dễ đọc hơn đẹp."),
      prompt: [
        yDinh ? `Ý ĐỊNH của website:\n${yDinh}` : "Không có bản Ý định — chọn theo ngành và gợi ý bên dưới.",
        kienTruc,
        input.goiY ? `\nGợi ý của chủ website: ${input.goiY}` : "",
        input.mauThuongHieu ? `\nMàu thương hiệu PHẢI GIỮ làm màu nhấn: ${input.mauThuongHieu}` : "",
        "",
        "Chọn: 4 màu hex 6 số (nen, chu, nhan, phu); chữ trên nền phải tương phản ≥ 4,5:1, màu nhấn trên nền ≥ 3:1.",
        `Font tiêu đề và font thân CHỈ được lấy trong danh sách này (có bộ chữ tiếng Việt): ${FONT_TIENG_VIET.join(", ")}.`,
        "khoangCach: thoang | vua | chat. goc: vuong | bo-nhe | tron. giong: 2–4 tính từ. lyDo: 2–3 câu vì sao hợp với đối tượng.",
        "",
        "Trả về đúng MỘT khối JSON, không chữ nào ngoài khối:",
        "```json",
        JSON.stringify(
          { mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#c9a86a" }, font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" }, khoangCach: "thoang", goc: "vuong", giong: ["điềm đạm", "rõ ràng"], lyDo: "..." },
          null,
          2,
        ),
        "```",
      ].join("\n"),
      maxOutputTokens: 900,
      validate: kiemHeThietKe,
    });
    const h = docHeThietKe(van);
    if (!h) throw new Error("Model không trả về hệ thiết kế đọc được sau hai lần — chạy lại.");
    if (input.mauThuongHieu && h.mau.nhan.toLowerCase() !== input.mauThuongHieu.toLowerCase()) {
      // Model đổi màu thương hiệu: ghi đè lại, người dùng đã nói rõ phải giữ.
      h.mau.nhan = input.mauThuongHieu.toLowerCase();
    }
    return {
      contractVersion: "1.0",
      moTa: moTaHeThietKe(h),
      json: "```json\n" + JSON.stringify(h, null, 2) + "\n```",
    };
  },
};

/* ───────────────────── #27 · Viết chữ cho từng khối ───────────────────── */

const vietChuInput = z
  .object({
    ...moduleJobBaseShape,
    /** Để trống thì lấy JSON kiến trúc từ bước #25 (nối luồng). */
    kienTrucJson: z.string().trim().max(20_000).default(""),
    tone: z.string().trim().min(1, "Giọng văn không được để trống").max(120).default("Rõ ràng, điềm đạm"),
    /**
     * Sự thật của chủ website: số điện thoại, giá, giờ mở, giấy tờ, tên người.
     * Model CHỈ được dùng con số/tên riêng có ở đây.
     */
    suThat: z.string().trim().max(6_000).default(""),
    /**
     * Yêu cầu sửa khi chạy lại: "ngắn hơn", "bớt khoa trương", "nhấn giờ mở
     * cửa"… — đường "sửa chữ" cho người không muốn đụng JSON: chạy lại bước
     * này với một câu, bước sau tự lấy bản mới.
     */
    yeuCauSua: z.string().trim().max(600).default(""),
  })
  .strict();
export type WebVietChuInput = z.infer<typeof vietChuInput>;

const vietChuOutput = z
  .object({
    contractVersion: z.literal("1.0"),
    chu: z.string().min(1),
    json: z.string().min(1),
    ghiChu: z.string().min(1),
  })
  .strict();
export type WebVietChuOutput = z.infer<typeof vietChuOutput>;

export const webVietChuModule: ModuleDefinition<WebVietChuInput, WebVietChuOutput> = {
  key: KHOA_VIET_CHU,
  moduleNumber: 27,
  title: "Dựng web · Viết chữ",
  description:
    "Viết chữ thật cho từng khối của từng trang — mỗi trang một lượt gọi để các khối ăn khớp nhau. Chỉ dùng con số/tên riêng chủ website cung cấp.",
  category: "Website",
  inputSchema: vietChuInput,
  outputSchema: vietChuOutput,
  form: [
    {
      key: "suThat",
      label: "Sự thật của bạn — số điện thoại, giá, giờ mở, giấy tờ",
      type: "textarea",
      rows: 6,
      description:
        "Máy CHỈ được dùng con số và tên riêng có trong ô này. Để trống thì trang không có con số nào — an toàn, nhưng nhạt.",
      placeholder:
        "Ví dụ: Điện thoại 0912 345 678, mở 8h–22h kể cả chủ nhật. Trám răng từ 350.000đ. Nhổ răng khôn 1.800.000đ. Bác sĩ Nguyễn A, 12 năm nghề, chứng chỉ 0123/BYT.",
    },
    { key: "tone", label: "Giọng văn", type: "text", prefillFromProject: "tone" },
    {
      key: "yeuCauSua",
      label: "Muốn sửa gì so với lần trước? (tùy chọn)",
      type: "text",
      placeholder: "Ví dụ: ngắn hơn, bớt khoa trương, nhấn mạnh giờ mở cửa buổi tối",
      description: "Chạy lại bước này với một câu ở đây là đủ để sửa chữ — không phải sửa JSON. Bước dựng web tự lấy bản mới nhất.",
    },
    {
      key: "kienTrucJson",
      label: "JSON kiến trúc (để trống thì lấy từ bước Kiến trúc)",
      type: "textarea",
      rows: 4,
    },
  ],
  outputBlocks: [
    { key: "chu", label: "Chữ đã viết" },
    { key: "json", label: "JSON chữ" },
    { key: "ghiChu", label: "Ghi chú" },
  ],
  consumes: [KHOA_Y_DINH, KHOA_KIEN_TRUC],
  async execute({ input, generate, upstream }) {
    const nguon = input.kienTrucJson || upstream[KHOA_KIEN_TRUC] || "";
    if (!nguon) {
      throw new Error("Thiếu kiến trúc: chạy bước «Dựng web · Kiến trúc» trước, hoặc dán JSON kiến trúc vào ô.");
    }
    const tho = docJson(nguon);
    const kq = kienTrucSchema.safeParse(tho);
    if (!kq.success) {
      throw new Error("JSON kiến trúc không đọc được — chạy lại bước Kiến trúc rồi thử lại.");
    }
    const kienTruc = kq.data;

    const suThat = input.suThat
      ? `SỰ THẬT của chủ website — CHỈ được dùng con số, tên riêng, địa chỉ có trong đây:\n${input.suThat}`
      : "Chủ website CHƯA cung cấp con số nào. Viết câu KHÔNG có số, không có tên riêng, không có giờ giấc cụ thể.";

    const gop: Record<string, unknown> = {};
    const thieuTatCa: string[] = [];

    // Mỗi trang một lượt gọi — xem lý do ở đầu `domain/dung-web/noi-dung-khoi.ts`.
    for (const trang of kienTruc.trang) {
      const can = khoiCanChu(trang);
      if (can.length === 0) continue;
      const van = await generate({
        systemPrompt: heThong("Bạn là người viết chữ cho website bán hàng, viết ngắn và thật."),
        prompt: [
          `Website: ${kienTruc.tenWebsite}. Trang: ${trang.tieuDe} (${trang.duong}).`,
          `Mục đích trang: ${trang.mucDich}`,
          `Giọng: ${input.tone}.`,
          input.yeuCauSua ? `Yêu cầu của chủ website cho lần viết này: ${input.yeuCauSua}` : "",
          "",
          suThat,
          "",
          "Viết chữ cho từng khối dưới đây. Các khối nằm trên CÙNG một trang nên phải ăn khớp: khối đầu hứa gì thì khối sau trả bấy nhiêu, không lặp ý, không lặp câu.",
          moTaTruongChoAi(trang),
          "",
          `Trả về đúng MỘT khối JSON, khoá là số thứ tự khối (${can.map((i) => `"${i}"`).join(", ")}), không chữ nào ngoài khối:`,
          "```json",
          JSON.stringify(
            Object.fromEntries(can.slice(0, 2).map((i) => [String(i), { "…": "theo đúng các ô đã liệt kê ở trên" }])),
            null,
            2,
          ),
          "```",
        ].join("\n"),
        maxOutputTokens: 2_400,
        validate: kiemChuTrang(trang),
      });
      const doc = docChuTrang(van, trang);
      if (!doc) {
        thieuTatCa.push(`${trang.duong}: không đọc được JSON`);
        continue;
      }
      for (const [i, nd] of Object.entries(doc.noiDung)) gop[`${trang.duong}#${i}`] = nd;
      for (const i of doc.thieu) thieuTatCa.push(`${trang.duong}#${i} (${trang.khoi[i]?.ma ?? "?"})`);
    }

    const soKhoi = Object.keys(gop).length;
    if (soKhoi === 0) throw new Error("Không viết được chữ cho khối nào — chạy lại, hoặc kiểm lại kiến trúc.");
    // Dấu kiến trúc: bên đọc biết chữ này viết cho trang/khối nào — xem
    // `KHOA_DAU_KIEN_TRUC` trong `domain/dung-web/tu-dau-ra.ts`.
    gop[KHOA_DAU_KIEN_TRUC] = dauKienTruc(kienTruc);

    // Bản chữ cho người đọc: đọc thẳng, không phải mở JSON ra soi.
    const dong: string[] = [];
    for (const trang of kienTruc.trang) {
      const cua = trang.khoi
        .map((khoi, i) => ({ khoi, i, nd: gop[`${trang.duong}#${i}`] as Record<string, unknown> | undefined }))
        .filter((x) => x.nd);
      if (cua.length === 0) continue;
      dong.push(`## ${trang.duong} — ${trang.tieuDe}`);
      for (const { khoi, nd } of cua) {
        dong.push(`### [${khoi.ma}]`);
        for (const [khoa, giaTri] of Object.entries(nd!)) {
          if (Array.isArray(giaTri)) {
            for (const m of giaTri) {
              dong.push(typeof m === "string" ? `- ${m}` : `- **${(m as { tieuDe: string }).tieuDe}** — ${(m as { than: string }).than}`);
            }
          } else {
            dong.push(`**${khoa}**: ${String(giaTri)}`);
          }
        }
        dong.push("");
      }
    }

    return {
      contractVersion: "1.0",
      chu: dong.join("\n").trim(),
      json: "```json\n" + JSON.stringify(gop, null, 2) + "\n```",
      ghiChu: [
        `Đã viết chữ cho ${soKhoi} khối trên ${kienTruc.trang.length} trang.`,
        input.suThat ? "" : "⚠️ Chưa có ô “sự thật” nên chữ không có con số nào — điền vào rồi chạy lại để trang chắc tay hơn.",
        thieuTatCa.length > 0 ? `⚠️ Chưa có chữ: ${thieuTatCa.join(", ")} — những khối này sẽ dùng câu ý đồ của bước Kiến trúc.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

export const dungWebModuleKeys = [KHOA_Y_DINH, KHOA_KIEN_TRUC, KHOA_THIET_KE, KHOA_VIET_CHU] as const;
