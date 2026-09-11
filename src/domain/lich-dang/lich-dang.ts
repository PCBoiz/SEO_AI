import { z } from "zod";
import { aiProviderIds } from "@/domain/ai/ai-model-provider";
import type { ModuleJob } from "@/domain/modules/module-job";

/* ══════════════════════════════════════════════════════════════════════════
   LỊCH ĐĂNG BÀI TỰ ĐỘNG — phần lõi thuần (không mạng, không cơ sở dữ liệu)

   Chủ dự án chốt 12/09/2026: VPS gõ nhịp mỗi 10 phút · bài vào hàng chờ duyệt
   của website, người duyệt tay · chủ đề lấy từ danh sách chủ dự án nhập, hết
   thì lấy truy vấn Search Console · MỖI NGÀY MỘT BÀI.

   Vì sao một lượt chạy nhiều lần gõ: Vercel gói miễn phí cho một lần gọi tối đa
   300 giây; một bước viết có thể mất tới 240 giây (hai lần gọi AI × 120 giây).
   Nên mỗi lần gõ chỉ đi MỘT bước, và tiến độ phải đọc lại được từ đâu đó.

   ⚠️ TIẾN ĐỘ KHÔNG LƯU RIÊNG — NÓ ĐƯỢC SUY RA TỪ BẢNG JOB. Mỗi bước của mỗi
   lượt có khoá chống trùng TẤT ĐỊNH (dự án + ngày + bước + lần thử). Gõ lại
   bao nhiêu lần, gõ trùng lúc bao nhiêu lần, cũng chỉ ra đúng một job cho mỗi
   bước — bảng job đã có ràng buộc duy nhất trên khoá đó. Không có trạng thái
   thứ hai để lệch với trạng thái thật.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Các bước của một lượt, theo thứ tự.
 *
 * Là luồng "Chuỗi bài viết → đẩy thẳng sang site" BỎ BƯỚC #13 (llms.txt /
 * sitemap / robots): bước đăng không đọc đầu ra của nó, và website đã tự sinh
 * mấy tệp đó. Giữ nó là thêm một lượt gọi AI mỗi ngày cho thứ không ai dùng.
 * `tests/unit/lich-dang.test.ts` khoá danh sách này với `registry.ts`.
 */
export const BUOC_LICH_DANG = [
  "RIS_SITEMAP_KEYWORDS",
  "RIS_ICN_KEYWORDS",
  "RIS_ONPAGE_SEO",
  "RIS_CONTENT_HEADLINE",
  "RIS_CONTENT_INTRO",
  "RIS_CONTENT_SECTIONS",
  "RIS_GEO_SCHEMA",
  "RIS_VHGG_PUBLISH",
] as const;

export const CHUYEN_MUC_LICH = ["Tiến độ", "Chính sách", "Sự kiện", "Thị trường"] as const;

/** Phần chủ dự án điền. Giới hạn độ dài khớp các module sẽ nhận các giá trị này. */
export const cauHinhLichSchema = z
  .object({
    bat: z.boolean(),
    /** Giờ Việt Nam bắt đầu viết bài của ngày (0–23). */
    gioChay: z.number().int().min(0).max(23),
    ai: z
      .object({
        provider: z.enum(aiProviderIds),
        model: z.string().trim().min(1).max(120),
      })
      .strict(),
    chuyenMuc: z.enum(CHUYEN_MUC_LICH),
    audienceBrief: z
      .string()
      .trim()
      .min(10, "Mô tả doanh nghiệp / khách hàng cần ít nhất 10 ký tự.")
      .max(4_000),
    location: z.string().trim().min(1, "Thiếu thị trường / địa điểm.").max(160),
    language: z.string().trim().min(1, "Thiếu ngôn ngữ.").max(80),
    tone: z.string().trim().min(1, "Thiếu giọng văn.").max(120),
    // ≤160 vì chủ đề cũng làm "tên trang" cho bước On-Page (giới hạn 160).
    chuDe: z
      .array(z.string().trim().min(3, "Chủ đề quá ngắn.").max(160, "Chủ đề dài quá 160 ký tự."))
      .max(300),
    /** Hết danh sách thì lấy truy vấn Search Console đang ở vị trí 11–30. */
    dungSearchConsole: z.boolean(),
  })
  .strict();
export type CauHinhLich = z.infer<typeof cauHinhLichSchema>;

export type NguonChuDe = "danh-sach" | "search-console";

/** Một lượt = một bài của một ngày. Ghi lúc bắt đầu; `ketQua` ghi lúc chốt. */
export interface LuotLich {
  ngay: string;
  /** Lần thứ mấy trong ngày — lịch tự chạy luôn là 0; "chạy lại hôm nay" bằng tay là 1, 2… */
  lan: number;
  chuDe: string;
  nguon: NguonChuDe;
  batDauLuc: string;
  ketQua?: "da-dang" | "dung" | "het-han";
  postUrl?: string;
  loi?: string;
  xongLuc?: string;
}

/* ─────────────────────────── Giờ Việt Nam ─────────────────────────────── */

// Việt Nam không đổi giờ theo mùa — lệch cố định +7.
const LECH_VN_MS = 7 * 3_600_000;

export function ngayVN(luc: Date): string {
  return new Date(luc.getTime() + LECH_VN_MS).toISOString().slice(0, 10);
}

export function gioVN(luc: Date): number {
  return new Date(luc.getTime() + LECH_VN_MS).getUTCHours();
}

export function congNgay(ngay: string, soNgay: number): string {
  const d = new Date(`${ngay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return d.toISOString().slice(0, 10);
}

/* ─────────────────────────── Chọn chủ đề ──────────────────────────────── */

export function chuanHoaChuDe(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Tách danh sách chủ đề từ ô nhập nhiều dòng: bỏ dòng trống, bỏ trùng. */
export function tachDanhSachChuDe(vanBan: string): string[] {
  const daCo = new Set<string>();
  const ra: string[] = [];
  for (const dong of vanBan.split(/\r?\n/)) {
    const chuDe = dong.replace(/\s+/g, " ").trim();
    const khoa = chuanHoaChuDe(chuDe);
    if (!khoa || daCo.has(khoa)) continue;
    daCo.add(khoa);
    ra.push(chuDe);
  }
  return ra;
}

/**
 * Hai chủ đề có gần như trùng không — tỉ lệ chữ chung (Jaccard) ≥ 0,6.
 *
 * Chỉ dùng cho chủ đề lấy từ Search Console. "giá vinhomes hạ long xanh 2026"
 * và "vinhomes hạ long xanh giá 2026" là CÙNG một bài; viết cả hai là hai trang
 * tự tranh nhau một truy vấn, và là đúng mẫu "scaled content abuse" Google nêu.
 */
export function giongNhau(a: string, b: string): boolean {
  const x = new Set(chuanHoaChuDe(a).split(" ").filter(Boolean));
  const y = new Set(chuanHoaChuDe(b).split(" ").filter(Boolean));
  if (x.size === 0 || y.size === 0) return false;
  let chung = 0;
  for (const chu of x) if (y.has(chu)) chung += 1;
  return chung / (x.size + y.size - chung) >= 0.6;
}

export interface TruyVanGsc {
  truyVan: string;
  viTri: number;
  impressions: number;
}

/** Số lượt HỎNG của một chủ đề trước khi bị bỏ qua, để một chủ đề hỏng mãi không chặn cả hàng. */
export const SO_LAN_HONG_TOI_DA = 2;

/**
 * Chủ đề nào đã "dùng hết": đã đăng, hoặc đã hỏng đủ số lần.
 *
 * Hỏng một lần thì hôm sau thử lại chính chủ đề đó — lỗi thường là tạm thời
 * (hết hạn mức API, mạng). Hỏng hai lần thì bỏ qua, không thì một chủ đề làm
 * website từ chối sẽ chặn hàng đợi mãi mãi.
 */
export function chuDeDaDung(luot: readonly LuotLich[], daDangCu: readonly string[] = []): string[] {
  const demHong = new Map<string, number>();
  const ra = new Set(daDangCu.map(chuanHoaChuDe));
  for (const l of luot) {
    const khoa = chuanHoaChuDe(l.chuDe);
    if (l.ketQua === "da-dang") ra.add(khoa);
    if (l.ketQua === "dung" || l.ketQua === "het-han") {
      const n = (demHong.get(khoa) ?? 0) + 1;
      demHong.set(khoa, n);
      if (n >= SO_LAN_HONG_TOI_DA) ra.add(khoa);
    }
  }
  return [...ra];
}

export function chonChuDe(
  cauHinh: Pick<CauHinhLich, "chuDe" | "dungSearchConsole">,
  daDung: readonly string[],
  truyVanGsc: readonly TruyVanGsc[],
): { chuDe: string; nguon: NguonChuDe } | null {
  const dung = new Set(daDung.map(chuanHoaChuDe));
  for (const c of cauHinh.chuDe) {
    if (!dung.has(chuanHoaChuDe(c))) return { chuDe: c.trim(), nguon: "danh-sach" };
  }
  if (!cauHinh.dungSearchConsole) return null;

  const ungVien = truyVanGsc
    // Vị trí 11–30: Google đã coi trang mình liên quan nhưng chưa lên trang 1 —
    // một bài đúng trọng tâm đẩy được. Dưới 4 chữ thường là truy vấn tên
    // thương hiệu chung chung ("vinhomes hạ long"), viết bài riêng cho nó là
    // tự tranh với trang chủ.
    .filter((t) => t.viTri >= 11 && t.viTri <= 30)
    .filter((t) => t.truyVan.trim().split(/\s+/).length >= 4 && t.truyVan.trim().length <= 160)
    .filter((t) => ![...dung].some((d) => giongNhau(d, t.truyVan)))
    .filter((t) => !cauHinh.chuDe.some((c) => giongNhau(c, t.truyVan)))
    .sort((a, b) => b.impressions - a.impressions);
  return ungVien[0] ? { chuDe: ungVien[0].truyVan.trim(), nguon: "search-console" } : null;
}

/* ─────────────────────────── Tiến độ một lượt ─────────────────────────── */

/** Job không đổi trạng thái quá lâu thì coi như chết — khớp `sweepIfStale` của dịch vụ job. */
export const KET_SAU_MS = 15 * 60_000;

export type TrangThaiBuoc = "chua-chay" | "dang-chay" | "xong" | "hong";

export interface BuocTienDo {
  moduleKey: string;
  trangThai: TrangThaiBuoc;
  lan: 0 | 1;
  jobId?: string;
  loi?: string;
}

export type HanhDong =
  | { loai: "tao"; buoc: number; lan: 0 | 1; upstreamJobIds: string[] }
  | { loai: "cho"; buoc: number; jobId: string }
  /** Job kẹt quá `KET_SAU_MS`: đánh dấu hết giờ rồi tính lại (sẽ ra "thử lại"). */
  | { loai: "danh-dau-ket"; buoc: number; jobId: string }
  | { loai: "xong"; jobIds: string[]; dauRaCuoi: Record<string, unknown> | null }
  | { loai: "dung"; buoc: number; loi: string };

const CHUA_KET_THUC = new Set(["queued", "dispatching", "running"]);

/**
 * Đọc bảng job, trả về việc cần làm kế tiếp cho một lượt.
 *
 * Mỗi bước có tối đa hai lần thử (`lan` 0 và 1). Lần thử 1 tồn tại thì nó là
 * lần thử của bước đó. Hỏng lần 0 → thử lại; hỏng lần 1 → dừng lượt.
 */
export function tinhTienDo(
  buoc: readonly string[],
  khoa: (buoc: number, lan: 0 | 1) => string,
  jobs: readonly ModuleJob[],
  bayGio: Date,
): { hanhDong: HanhDong; cacBuoc: BuocTienDo[] } {
  const theoKhoa = new Map(jobs.map((j) => [j.idempotencyKey, j]));
  const cacBuoc: BuocTienDo[] = buoc.map((moduleKey) => ({
    moduleKey,
    trangThai: "chua-chay",
    lan: 0,
  }));
  const daXong: string[] = [];
  let dauRaCuoi: Record<string, unknown> | null = null;

  for (let i = 0; i < buoc.length; i += 1) {
    const lan1 = theoKhoa.get(khoa(i, 1));
    const lan0 = theoKhoa.get(khoa(i, 0));
    const job = lan1 ?? lan0;
    const lan: 0 | 1 = lan1 ? 1 : 0;
    if (!job) {
      return { hanhDong: { loai: "tao", buoc: i, lan: 0, upstreamJobIds: [...daXong] }, cacBuoc };
    }
    cacBuoc[i] = { moduleKey: buoc[i]!, trangThai: "dang-chay", lan, jobId: job.id };

    if (job.status === "succeeded") {
      cacBuoc[i]!.trangThai = "xong";
      daXong.push(job.id);
      dauRaCuoi = job.output;
      continue;
    }
    if (CHUA_KET_THUC.has(job.status)) {
      const dung = bayGio.getTime() - job.updatedAt.getTime();
      return {
        hanhDong:
          dung > KET_SAU_MS
            ? { loai: "danh-dau-ket", buoc: i, jobId: job.id }
            : { loai: "cho", buoc: i, jobId: job.id },
        cacBuoc,
      };
    }
    // failed / timed_out
    cacBuoc[i]!.trangThai = "hong";
    cacBuoc[i]!.loi = job.errorMessage ?? "Bước không hoàn thành.";
    if (lan === 0) {
      return { hanhDong: { loai: "tao", buoc: i, lan: 1, upstreamJobIds: [...daXong] }, cacBuoc };
    }
    return { hanhDong: { loai: "dung", buoc: i, loi: cacBuoc[i]!.loi! }, cacBuoc };
  }
  return { hanhDong: { loai: "xong", jobIds: daXong, dauRaCuoi }, cacBuoc };
}

/* ─────────────────────────── Dựng đầu vào ─────────────────────────────── */

export interface KhuonModule {
  key: string;
  fieldKeys: readonly string[];
  asLinesKeys: readonly string[];
}

/** Các giá trị dùng chung cho mọi bước của một lượt — như "pool" của trang Quy trình. */
export function poolCuaLuot(
  cauHinh: CauHinhLich,
  duAn: { name: string; website: string },
  luot: Pick<LuotLich, "chuDe" | "ngay">,
): Record<string, string> {
  return {
    primaryKeyword: luot.chuDe,
    pageLabel: luot.chuDe,
    location: cauHinh.location,
    language: cauHinh.language,
    tone: cauHinh.tone,
    audienceBrief: cauHinh.audienceBrief,
    siteName: duAn.name,
    websiteUrl: duAn.website,
    // Bước đăng: tiêu đề để trống → lấy từ bước viết tiêu đề; ngày = ngày của
    // lượt (không phải ngày máy chủ chạy bước cuối — lượt có thể tràn qua nửa đêm).
    chuyenMuc: cauHinh.chuyenMuc,
    ngayDang: luot.ngay,
  };
}

/**
 * Đầu vào cho một bước — cùng quy tắc với `buildInput` của trang Quy trình:
 * chỉ lấy trường module có trong form, bỏ trường trống, tách dòng khi cần.
 * Module dùng schema `.strict()` nên đưa thừa trường là bị từ chối.
 */
export function dungDauVao(
  khuon: KhuonModule,
  pool: Record<string, string>,
  goc: {
    projectId: string;
    idempotencyKey: string;
    ai: CauHinhLich["ai"];
    upstreamJobIds: readonly string[];
  },
): Record<string, unknown> {
  const dauVao: Record<string, unknown> = {
    projectId: goc.projectId,
    idempotencyKey: goc.idempotencyKey,
    ai: { ...goc.ai },
  };
  if (goc.upstreamJobIds.length > 0) dauVao.upstreamJobIds = [...goc.upstreamJobIds];
  for (const truong of khuon.fieldKeys) {
    const giaTri = pool[truong];
    if (giaTri === undefined || giaTri === "") continue;
    dauVao[truong] = khuon.asLinesKeys.includes(truong)
      ? giaTri.split(/\r?\n/).map((d) => d.trim()).filter(Boolean)
      : giaTri;
  }
  return dauVao;
}

/** Lượt đang dở (chưa chốt), mới nhất trước. Tối đa một lượt chạy mỗi lúc. */
export function luotDangDo(luot: readonly LuotLich[]): LuotLich | null {
  return (
    [...luot]
      .filter((l) => !l.ketQua)
      .sort((a, b) => b.ngay.localeCompare(a.ngay) || b.lan - a.lan)[0] ?? null
  );
}

/** Lịch tự chạy có nên bắt đầu lượt mới không — một lượt mỗi ngày, sau giờ đã đặt. */
export function nenBatDauLuotMoi(
  cauHinh: Pick<CauHinhLich, "bat" | "gioChay">,
  luot: readonly LuotLich[],
  bayGio: Date,
): boolean {
  if (!cauHinh.bat) return false;
  if (gioVN(bayGio) < cauHinh.gioChay) return false;
  const homNay = ngayVN(bayGio);
  return !luot.some((l) => l.ngay === homNay);
}

/** Giữ sổ lượt gọn: config là một cột JSON, không phải bảng. */
export const SO_LUOT_GIU = 60;

/** Lượt dở quá 2 ngày thì bỏ — bài "hôm kia" đăng hôm nay là bài lỗi thời. */
export const LUOT_HET_HAN_SAU_NGAY = 2;
