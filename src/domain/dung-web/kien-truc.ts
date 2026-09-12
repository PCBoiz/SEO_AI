import { z } from "zod";
import type { FormatIssue } from "@/domain/modules/generate-with-retry";
import { docJson } from "./doc-json";
import { laMaThanhPhan, timThanhPhan } from "./danh-muc-thanh-phan";
import { coMauKhoi } from "./khoi/mau-khoi";

/**
 * KIẾN TRÚC WEBSITE — hợp đồng giữa bước "Kiến trúc" và các bước sau.
 *
 * Đây là "bảng hợp đồng" trong nghiên cứu (§4, bước 2): danh sách trang, mỗi
 * trang là một dãy KHỐI chọn từ danh mục, mỗi khối kèm một câu nội dung. Bước
 * sinh tệp sau này đọc đúng khuôn này, mỗi tệp một lượt gọi model, chỉ mang
 * theo hợp đồng chứ không mang mã tệp khác.
 *
 * Kiểm ở code, không tin model:
 *   · mã khối phải có trong danh mục — mã lạ thì bắt sửa (retry) rồi loại;
 *   · phải có trang chủ `/`; đường dẫn duy nhất, dạng /chu-thuong-gach-ngang;
 *   · mỗi trang 2–12 khối, tối đa 8 trang — nhiều hơn là bản đầu không kiểm
 *     chứng nổi.
 */

const duongTrang = z
  .string()
  .trim()
  .regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/, "Đường dẫn dạng /chu-thuong-gach-ngang");

const khoiSchema = z
  .object({
    ma: z.string().trim().min(1).max(60),
    /** Một–hai câu: khối này nói gì trên trang này. */
    noiDung: z.string().trim().min(1).max(600),
  })
  .strict();

const trangSchema = z
  .object({
    duong: duongTrang,
    tieuDe: z.string().trim().min(1).max(120),
    mucDich: z.string().trim().min(1).max(400),
    khoi: z.array(khoiSchema).min(2, "Mỗi trang ít nhất 2 khối").max(12, "Mỗi trang tối đa 12 khối"),
  })
  .strict();

export const kienTrucSchema = z
  .object({
    tenWebsite: z.string().trim().min(1).max(120),
    nganh: z.enum(["chung", "bat-dong-san"]),
    /** Khối có trên MỌI trang (đầu trang, chân trang, nút liên hệ nổi). */
    khoiChung: z.array(z.string().trim().min(1).max(60)).max(6).default([]),
    trang: z.array(trangSchema).min(1).max(8, "Bản đầu tối đa 8 trang"),
    /** Khối cần viết mới vì danh mục không có — bước sinh tệp xử lý. */
    canVietMoi: z
      .array(
        z
          .object({
            ten: z.string().trim().min(1).max(80),
            vaiTro: z.string().trim().min(1).max(40),
            moTa: z.string().trim().min(1).max(400),
          })
          .strict(),
      )
      .max(10)
      .default([]),
    /** Dữ liệu thật phải hỏi chủ website (số điện thoại, giá, ảnh…). */
    duLieuCan: z.array(z.string().trim().min(1).max(160)).max(30).default([]),
  })
  .strict();

export type KienTrucWeb = z.infer<typeof kienTrucSchema>;

/** Kiểm định dạng cho `generateWithRetry` — mỗi lỗi một câu tiếng Việt để nhắc model. */
export function kiemKienTruc(text: string): FormatIssue[] {
  const du = docJson(text);
  if (du === null) return [{ message: "Không đọc được JSON — trả về đúng MỘT khối JSON, không chữ nào ngoài khối." }];
  const kq = kienTrucSchema.safeParse(du);
  if (!kq.success) {
    return kq.error.issues.slice(0, 5).map((i) => ({ message: `${i.path.join(".") || "gốc"}: ${i.message}` }));
  }
  const loi: FormatIssue[] = [];
  const kt = kq.data;
  if (!kt.trang.some((t) => t.duong === "/")) loi.push({ message: "Thiếu trang chủ có duong = \"/\"." });
  const duong = new Set<string>();
  for (const t of kt.trang) {
    if (duong.has(t.duong)) loi.push({ message: `Đường dẫn ${t.duong} bị trùng.` });
    duong.add(t.duong);
    for (const k of t.khoi) {
      // Có trong danh mục nhưng CHƯA có khuôn dựng cũng tính là không dùng
      // được: người dùng không quan tâm khối nằm ở tầng nào, họ quan tâm khối
      // đó có hiện trên trang hay không.
      if (!laMaThanhPhan(k.ma) || !coMauKhoi(k.ma)) {
        loi.push({ message: `Trang ${t.duong}: mã khối «${k.ma}» không dùng được — chọn đúng mã trong danh mục đã liệt kê, hoặc bỏ khối đó và ghi vào canVietMoi.` });
      }
    }
  }
  for (const m of kt.khoiChung) {
    if (!laMaThanhPhan(m) || !coMauKhoi(m)) loi.push({ message: `khoiChung: mã «${m}» không dùng được.` });
  }
  return loi.slice(0, 8);
}

export interface KienTrucDaChuan {
  kienTruc: KienTrucWeb;
  /** Những gì đã bị sửa để hợp lệ — ghi vào kết quả cho người đọc. */
  canhBao: string[];
}

/**
 * Chuẩn hoá SAU khi model đã được nhắc một lần: mã lạ còn sót thì loại khỏi
 * trang và chuyển sang `canVietMoi` (không ném lỗi — người dùng đã trả tiền
 * cho hai lượt gọi). Trả `null` chỉ khi JSON không đọc được hay sai khuôn.
 */
export function chuanHoaKienTruc(text: string): KienTrucDaChuan | null {
  const du = docJson(text);
  if (du === null) return null;
  const kq = kienTrucSchema.safeParse(du);
  if (!kq.success) return null;
  const kt = structuredClone(kq.data);
  const canhBao: string[] = [];

  kt.khoiChung = kt.khoiChung.map((m) => m.trim().toLowerCase()).filter((m) => {
    if (laMaThanhPhan(m) && coMauKhoi(m)) return true;
    canhBao.push(`Bỏ khối chung «${m}»: chưa có bản dựng.`);
    return false;
  });

  const daThay = new Set<string>();
  kt.trang = kt.trang.map((t) => {
    const khoi = t.khoi.filter((k) => {
      const ma = k.ma.trim().toLowerCase();
      if (laMaThanhPhan(ma) && coMauKhoi(ma)) {
        k.ma = ma;
        return true;
      }
      if (!daThay.has(ma)) {
        daThay.add(ma);
        kt.canVietMoi.push({ ten: k.ma, vaiTro: "chua-ro", moTa: k.noiDung });
        canhBao.push(`Trang ${t.duong}: khối «${k.ma}» không có trong danh mục → chuyển sang "cần viết mới".`);
      }
      return false;
    });
    return { ...t, khoi };
  });

  // Bỏ trang trùng đường dẫn (giữ trang đầu) và trang còn dưới 2 khối.
  const thay = new Set<string>();
  kt.trang = kt.trang.filter((t) => {
    if (thay.has(t.duong)) {
      canhBao.push(`Bỏ trang ${t.duong} trùng đường dẫn.`);
      return false;
    }
    thay.add(t.duong);
    if (t.khoi.length < 2) {
      canhBao.push(`Bỏ trang ${t.duong}: còn dưới 2 khối hợp lệ.`);
      return false;
    }
    return true;
  });
  if (!kt.trang.some((t) => t.duong === "/")) {
    if (kt.trang.length === 0) return null;
    kt.trang[0]!.duong = "/";
    canhBao.push("Không có trang chủ — lấy trang đầu tiên làm trang chủ.");
  }
  kt.canVietMoi = kt.canVietMoi.slice(0, 10);
  return { kienTruc: kt, canhBao };
}

/** Bản chữ dễ đọc cho khối kết quả — người dùng xem, bước sau đọc lại JSON. */
export function moTaKienTruc(kt: KienTrucWeb): string {
  const dong: string[] = [`# ${kt.tenWebsite} (${kt.nganh === "bat-dong-san" ? "bất động sản" : "ngành chung"})`];
  if (kt.khoiChung.length > 0) dong.push(`Khối trên mọi trang: ${kt.khoiChung.map((m) => timThanhPhan(m)?.ten ?? m).join(", ")}`);
  for (const t of kt.trang) {
    dong.push("", `## ${t.duong} — ${t.tieuDe}`, t.mucDich);
    t.khoi.forEach((k, i) => dong.push(`${i + 1}. [${k.ma}] ${timThanhPhan(k.ma)?.ten ?? k.ma} — ${k.noiDung}`));
  }
  if (kt.canVietMoi.length > 0) {
    dong.push("", "## Cần viết mới (danh mục chưa có)");
    for (const m of kt.canVietMoi) dong.push(`- ${m.ten} [${m.vaiTro}]: ${m.moTa}`);
  }
  if (kt.duLieuCan.length > 0) {
    dong.push("", "## Dữ liệu thật cần chủ website cung cấp");
    for (const d of kt.duLieuCan) dong.push(`- ${d}`);
  }
  return dong.join("\n");
}
