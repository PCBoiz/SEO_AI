import { z } from "zod";
import type { ModuleDefinition } from "@/domain/modules/module-definition";
import { moduleJobBaseShape } from "@/domain/modules/module-job";
import { getVinhomesSiteConfig } from "@/infrastructure/config/vinhomes-site-environment";

// Module 21 · Đăng lên site Vinhomes Global Gate Hạ Long.
//
// KHÔNG gọi model AI — ghép bài từ đầu ra các module trước rồi POST sang cổng
// `/api/ingest` của site. Đây là mảnh ghép khiến Antigravity không còn phụ thuộc
// WordPress: site đích do chính chúng ta code nên hợp đồng dữ liệu do ta định
// nghĩa, và nó giàu hơn hẳn một cục HTML.
//
// Đích đến đọc từ biến môi trường (VINHOMES_SITE_URL, VINHOMES_INGEST_TOKEN)
// chứ không lưu theo dự án — xem ghi chú trong vinhomes-site-environment.ts.

const CHUYEN_MUC = ["Tiến độ", "Chính sách", "Sự kiện", "Thị trường"] as const;

const inputSchema = z
  .object({
    ...moduleJobBaseShape,
    title: z.string().trim().max(300).default(""),
    chuyenMuc: z.enum(CHUYEN_MUC).default("Thị trường"),
    // Cho phép hẹn ngày để rải bài nhiều ngày liên tiếp: site chỉ hiện bài đã
    // tới ngày, nên đẩy sẵn cả loạt cũng không lộ ra cùng lúc.
    ngayDang: z.string().trim().max(30).default(""),
  })
  .strict();
export type VinhomesPublishInput = z.infer<typeof inputSchema>;

const outputSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    result: z.string().min(1),
    postUrl: z.string().min(1),
  })
  .strict();
export type VinhomesPublishOutput = z.infer<typeof outputSchema>;

export const vinhomesPublishModule: ModuleDefinition<
  VinhomesPublishInput,
  VinhomesPublishOutput
> = {
  key: "RIS_VHGG_PUBLISH",
  moduleNumber: 21,
  title: "Đăng lên site Vinhomes Hạ Long",
  description:
    "Ghép bài từ các module trước rồi đẩy sang mục Tin tức của site Vinhomes Global Gate Hạ Long. Có thể hẹn ngày để rải bài nhiều ngày liên tiếp.",
  category: "Publishing",
  inputSchema,
  outputSchema,
  requiresAi: false,
  form: [
    {
      key: "title",
      label: "Tiêu đề bài (tùy chọn)",
      type: "text",
      placeholder: "Để trống sẽ lấy tiêu đề đầu tiên từ Module 7",
    },
    {
      key: "chuyenMuc",
      label: "Chuyên mục",
      type: "select",
      required: true,
      options: CHUYEN_MUC.map((muc) => ({ label: muc, value: muc })),
    },
    {
      key: "ngayDang",
      label: "Ngày đăng (tùy chọn)",
      type: "text",
      placeholder: "2026-08-15 — để trống là đăng ngay hôm nay",
      description:
        "Đặt ngày trong tương lai để hẹn giờ. Site chỉ hiển thị bài đã tới ngày, nên đẩy sẵn cả loạt bài vẫn không lộ ra cùng lúc.",
    },
  ],
  outputBlocks: [{ key: "result", label: "Kết quả đăng bài" }],
  consumes: [
    "RIS_CONTENT_HEADLINE",
    "RIS_CONTENT_INTRO",
    "RIS_CONTENT_SECTIONS",
    "RIS_GEO_SCHEMA",
  ],
  async execute({ input, upstream }) {
    const cauHinh = getVinhomesSiteConfig();

    const title =
      input.title.trim() ||
      firstHeadline(upstream.RIS_CONTENT_HEADLINE) ||
      "Bài viết từ Antigravity OS";

    const doan: string[] = [];
    if (upstream.RIS_CONTENT_INTRO) {
      doan.push(markdownToHtml(stripBlockLabels(upstream.RIS_CONTENT_INTRO)));
    }
    if (upstream.RIS_CONTENT_SECTIONS) {
      doan.push(markdownToHtml(stripBlockLabels(upstream.RIS_CONTENT_SECTIONS)));
    }
    if (upstream.RIS_GEO_SCHEMA) {
      const faq = extractSection(upstream.RIS_GEO_SCHEMA, "FAQ khớp câu hỏi");
      if (faq) doan.push(`<h2>Câu hỏi thường gặp</h2>\n${markdownToHtml(faq)}`);
    }
    if (doan.length === 0) {
      throw new Error(
        "Chưa có nội dung để đăng — hãy chạy các module nội dung (7, 8, 10) trước, hoặc chạy cả luồng ở trang Quy trình.",
      );
    }

    const moTa = firstParagraph(doan[0]) || title;
    const ngayDang = input.ngayDang.trim() || today();
    if (Number.isNaN(new Date(ngayDang).getTime())) {
      throw new Error(`Ngày đăng không hợp lệ: ${input.ngayDang}`);
    }

    const bai = {
      slug: toSlug(title),
      tieuDe: title,
      moTa: moTa.slice(0, 600),
      ngayDang,
      chuyenMuc: input.chuyenMuc,
      noiDung: doan.join("\n\n"),
    };

    const phanHoi = await fetch(cauHinh.ingestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cauHinh.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bai),
      // Không đi theo chuyển hướng: chuẩn fetch xoá header Authorization khi
      // sang host khác, nên job sẽ báo thành công trong khi không bài nào được
      // tạo. Đúng cái bẫy đã gặp với WordPress.
      redirect: "manual",
    });

    if (phanHoi.status >= 300 && phanHoi.status < 400) {
      throw new Error(
        `Site chuyển hướng sang địa chỉ khác (HTTP ${phanHoi.status}). Bài viết CHƯA được tạo — kiểm tra lại VINHOMES_SITE_URL.`,
      );
    }
    if (!phanHoi.ok) {
      const than = await phanHoi.text().catch(() => "");

      // 403 KHÔNG PHẢI LỖI KỸ THUẬT — đừng hiển thị như lỗi kỹ thuật.
      //
      // Site có một cổng chặn nội dung: mã voucher, cam kết lợi nhuận, số điện
      // thoại lạ, danh xưng "nhất". Chạm phải là bài không vào tới hàng chờ.
      //
      // Đổ nguyên chuỗi JSON cắt cụt 300 ký tự vào thông báo lỗi sẽ khiến người
      // dùng đi kiểm token, kiểm mạng, kiểm địa chỉ — tức là đi tìm một lỗi hạ
      // tầng không tồn tại, trong khi việc phải làm là SỬA MỘT CÂU trong bài.
      // Nên bóc đúng phần lý do ra và nói thẳng.
      if (phanHoi.status === 403) {
        let chiTiet = "";
        try {
          const du = JSON.parse(than) as { chiTiet?: string; loi?: string };
          chiTiet = du.chiTiet || du.loi || "";
        } catch {
          chiTiet = than.slice(0, 300);
        }
        throw new Error(
          [
            "Site TỪ CHỐI vì nội dung chạm luật cấm. Đây không phải lỗi kỹ",
            "thuật — token và đường dẫn đều đúng, chỉ có bài là không đăng được.",
            "",
            chiTiet,
            "",
            "Sửa những câu nêu trên rồi chạy lại module này.",
          ].join("\n"),
        );
      }

      const goiY =
        phanHoi.status === 401
          ? "\nToken không khớp — kiểm tra VINHOMES_INGEST_TOKEN ở cả hai bên."
          : phanHoi.status === 503
            ? "\nSite chưa cấu hình INGEST_TOKEN."
            : "";
      throw new Error(
        `Site từ chối (HTTP ${phanHoi.status}): ${than.slice(0, 300)}${goiY}`,
      );
    }

    // ĐỌC TRẠNG THÁI TỪ CHÍNH PHẢN HỒI, không tự suy ra.
    //
    // ⚠️ Site đã thêm HÀNG RÀO DUYỆT BÀI: bài gửi sang KHÔNG lên trang ngay mà
    // vào hàng chờ, đợi chủ trang đọc và bấm duyệt. Trước khi sửa, chỗ này báo
    // "Đăng thành công · Bài hiển thị ngay ở mục Tin tức" — đúng ở thời điểm
    // viết, và sai hoàn toàn từ khi có hàng rào.
    //
    // Cái sai đó tốn thời gian thật: người dùng thấy báo thành công, mở trang
    // tin không thấy gì, rồi đi tìm một lỗi không tồn tại. Nên trạng thái phải
    // lấy từ phản hồi của site, không phải từ giả định của bên gửi.
    const thanThanhCong = await phanHoi.text().catch(() => "");
    let trangThaiSite = "";
    let thongBaoSite = "";
    let canhBaoSite: { luat: string; lyDo: string; trichDan: string }[] = [];
    try {
      const du = JSON.parse(thanThanhCong) as {
        trangThai?: string;
        thongBao?: string;
        canhBao?: { luat: string; lyDo: string; trichDan: string }[];
      };
      trangThaiSite = du.trangThai ?? "";
      thongBaoSite = du.thongBao ?? "";
      canhBaoSite = du.canhBao ?? [];
    } catch {
      // Site bản cũ trả JSON không có hai trường này — không phải lỗi.
    }

    const postUrl = `${cauHinh.siteUrl}/tin-tuc/${bai.slug}`;
    const choDuyet = trangThaiSite === "cho";
    const hen = ngayDang > today();

    return {
      contractVersion: "1.0",
      result: [
        choDuyet
          ? "Đã gửi sang site — ĐANG CHỜ DUYỆT."
          : hen
            ? `Đã hẹn đăng ngày ${ngayDang}.`
            : "Đăng thành công.",
        `Tiêu đề: ${title}`,
        `Chuyên mục: ${bai.chuyenMuc}`,
        `Đường dẫn khi được duyệt: ${postUrl}`,
        choDuyet
          ? thongBaoSite ||
            `Bài CHƯA hiện trên trang. Vào ${cauHinh.siteUrl}/duyet-bai để đọc lại và bấm duyệt.`
          : hen
            ? "Bài đã nằm trên site nhưng chỉ hiển thị khi tới ngày."
            : "Bài hiển thị ngay ở mục Tin tức.",
        // CHỈ ĐÍCH DANH, ĐỪNG DẶN CHUNG CHUNG.
        //
        // Dòng này trước đây là "đọc kỹ phần có con số… trước khi duyệt" —
        // một lời dặn đúng nhưng vô dụng, vì nó giống hệt nhau ở mọi bài nên
        // sau vài lần thì mắt lướt qua. Site nay trả về đúng những câu chạm
        // luật, nên nói thẳng có bao nhiêu chỗ và là chỗ nào.
        choDuyet && canhBaoSite.length > 0
          ? [
              `${canhBaoSite.length} chỗ cần đối chiếu trước khi duyệt:`,
              ...canhBaoSite.map((c) => `  · ${c.lyDo} → “${c.trichDan}”`),
            ].join("\n")
          : choDuyet
            ? "Cổng chặn nội dung không đánh dấu chỗ nào — vẫn nên đọc lại một lượt."
            : "",
      ]
        .filter(Boolean)
        .join("\n"),
      postUrl,
    };
  },
};

/**
 * Hôm nay theo GIỜ VIỆT NAM, dạng `YYYY-MM-DD`.
 *
 * ⚠️ TRƯỚC ĐÂY DÙNG `toISOString()`, TỨC LÀ GIỜ UTC — và đó là lỗi.
 *
 * Việt Nam là UTC+7. Từ 0h tới 7h sáng giờ Việt Nam, ngày UTC vẫn là HÔM QUA.
 * Nên một bài viết lúc 1h sáng bị gắn ngày hôm trước, và phép so `ngayDang >
 * today()` để nhận biết "bài hẹn" cũng lệch đi một ngày trong đúng khung giờ
 * đó.
 *
 * Site đích cũng đã chốt cứng `Asia/Ho_Chi_Minh` cho cùng lý do — hai bên phải
 * hiểu "hôm nay" giống nhau, nếu không thì bài hẹn hôm nay ở bên này là bài
 * quá khứ ở bên kia.
 */
function today(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/**
 * "Tiến độ thi công tháng 8" → "tien-do-thi-cong-thang-8".
 *
 * Bỏ dấu bằng chuẩn hoá Unicode rồi cắt dấu tổ hợp; riêng chữ đ/Đ phải xử lý
 * tay vì nó là một ký tự riêng chứ không phải d kèm dấu.
 */
function toSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Lấy đoạn văn đầu tiên làm mô tả ngắn, bỏ hết thẻ HTML. */
function firstParagraph(html: string): string {
  const khop = /<p>([\s\S]*?)<\/p>/i.exec(html);
  return (khop?.[1] ?? html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstHeadline(headlines: string | undefined): string | null {
  if (!headlines) return null;
  for (const raw of stripBlockLabels(headlines).split("\n")) {
    const line = raw
      .replace(/^[\s>*-]*\d+[.)]\s*/, "")
      .replace(/^[#>*\s-]+/, "")
      .replace(/^["“]|["”]\s*$/g, "")
      .trim();
    if (line.length >= 15 && line.length <= 120) return line;
  }
  return null;
}

function stripBlockLabels(value: string): string {
  return value
    .split("\n")
    .filter((line, index) => !(index === 0 && line.startsWith("## ")))
    .join("\n");
}

function extractSection(value: string, labelPrefix: string): string | null {
  const lines = value.split("\n");
  const start = lines.findIndex(
    (line) => line.startsWith("## ") && line.includes(labelPrefix),
  );
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(inline).join("<br />")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      html.push(
        `<${tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`,
      );
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      html.push(
        `<${heading[1].length >= 3 ? "h3" : "h2"}>${inline(heading[2])}</${heading[1].length >= 3 ? "h3" : "h2"}>`,
      );
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return html.join("\n");
}

function inline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
