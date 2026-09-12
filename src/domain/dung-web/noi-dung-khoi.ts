import type { FormatIssue } from "@/domain/modules/generate-with-retry";
import { docJson } from "./doc-json";
import { timMauKhoi } from "./khoi/mau-khoi";
import { tachTieuDeThan, type MucNoiDung, type NoiDungKhoi, type TruongKhoi } from "./khoi/kieu";
import type { KienTrucWeb } from "./kien-truc";

/**
 * CHỮ CHO TỪNG KHỐI — hợp đồng giữa bước "viết chữ" (#27) và bộ sinh mã.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MỖI TRANG MỘT LƯỢT GỌI, KHÔNG PHẢI MỖI KHỐI MỘT LƯỢT.
 *
 * Nghiên cứu 09/09 chốt "mỗi tệp một lượt gọi" cho bước SINH MÃ, vì mã dài và
 * nhồi cả kho vào một lời nhắc làm model kém đi. Chữ thì ngược lại: các khối
 * trong một trang phải ĂN KHỚP nhau — mở đầu hứa gì thì phần dưới trả bấy
 * nhiêu, câu chốt không lặp lại câu mở. Tách mỗi khối một lượt là mất đúng
 * chỗ đó, và tốn gấp năm lần tiền.
 *
 * ⚠️ KHÔNG BỊA SỐ. Lời nhắc nêu rõ: chỉ được dùng con số / tên riêng / địa chỉ
 * có trong phần "sự thật" do chủ website cung cấp. Không có thì viết câu không
 * có số. Đây là ràng buộc đã trả giá ở luồng viết bài: website từ chối bài vì
 * model tự nghĩ ra "cam kết sinh lời 12%/năm".
 * ═══════════════════════════════════════════════════════════════════════════
 */

const DAI_TOI_DA: Record<TruongKhoi["kieu"], number> = { chu: 160, doan: 600, "danh-sach": 120, muc: 400 };

/** Khoá trong JSON model trả về: số thứ tự khối trong trang, dạng chuỗi. */
export function moTaTruongChoAi(trang: KienTrucWeb["trang"][number]): string {
  const dong: string[] = [];
  for (const [i, khoi] of trang.khoi.entries()) {
    const mau = timMauKhoi(khoi.ma);
    if (!mau) continue;
    if (mau.truong.length === 0) continue;
    const o = mau.truong
      .map((t) => {
        const kieu =
          t.kieu === "muc"
            ? `danh sách ${t.toiDa ?? 6} mục, mỗi mục {"tieuDe","than"}`
            : t.kieu === "danh-sach"
              ? `danh sách ${t.toiDa ?? 6} chuỗi ngắn`
              : t.kieu === "doan"
                ? "một–hai câu"
                : "một câu ngắn";
        return `      "${t.khoa}": ${kieu} — ${t.nhan}${t.goiY ? ` (${t.goiY})` : ""}`;
      })
      .join("\n");
    dong.push(`  "${i}"  [${khoi.ma}] — ý đồ: ${khoi.noiDung}\n${o}`);
  }
  return dong.join("\n");
}

/** Khối nào của trang này thật sự cần chữ. */
export function khoiCanChu(trang: KienTrucWeb["trang"][number]): number[] {
  return trang.khoi
    .map((khoi, i) => ({ khoi, i }))
    .filter(({ khoi }) => (timMauKhoi(khoi.ma)?.truong.length ?? 0) > 0)
    .map(({ i }) => i);
}

function catChuoi(v: unknown, toiDa: number): string {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, toiDa);
}

function docMuc(v: unknown, toiDa: number, daiMuc: number): MucNoiDung[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): MucNoiDung | null => {
      if (typeof x === "string") {
        const s = catChuoi(x, daiMuc);
        if (!s) return null;
        const cap = tachTieuDeThan(s);
        return { tieuDe: cap.tieuDe.slice(0, 120), than: cap.than };
      }
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const tieuDe = catChuoi(o.tieuDe ?? o.ten ?? o.title, 120);
        const than = catChuoi(o.than ?? o.moTa ?? o.noiDung ?? o.text, daiMuc);
        return tieuDe ? { tieuDe, than } : null;
      }
      return null;
    })
    .filter((x): x is MucNoiDung => Boolean(x))
    .slice(0, toiDa);
}

export interface KetQuaDocChu {
  /** Khoá `<số thứ tự khối>` → chữ đã chuẩn hoá. */
  noiDung: Record<string, NoiDungKhoi>;
  /** Khối model bỏ sót — không chặn, bộ sinh mã rơi về câu ý đồ. */
  thieu: number[];
}

/**
 * Đọc và CHUẨN HOÁ chữ model trả về cho một trang.
 *
 * Bỏ mọi khoá lạ (khối không có trong trang, ô không có trong khuôn), cắt độ
 * dài, ép kiểu danh sách. Model trả thừa thì không sao; trả thiếu thì bộ sinh
 * mã đã có đường lui.
 */
export function docChuTrang(van: string, trang: KienTrucWeb["trang"][number]): KetQuaDocChu | null {
  const du = docJson(van);
  if (du === null || typeof du !== "object") return null;
  const vao = du as Record<string, unknown>;
  const noiDung: Record<string, NoiDungKhoi> = {};
  const thieu: number[] = [];

  for (const i of khoiCanChu(trang)) {
    const mau = timMauKhoi(trang.khoi[i]!.ma)!;
    const o = vao[String(i)] ?? vao[`${i}`] ?? vao[trang.khoi[i]!.ma];
    if (!o || typeof o !== "object") {
      thieu.push(i);
      continue;
    }
    const oo = o as Record<string, unknown>;
    const ra: NoiDungKhoi = {};
    for (const t of mau.truong) {
      const v = oo[t.khoa];
      if (v === undefined || v === null) continue;
      if (t.kieu === "muc") {
        const muc = docMuc(v, t.toiDa ?? 6, DAI_TOI_DA.muc);
        if (muc.length > 0) ra[t.khoa] = muc;
      } else if (t.kieu === "danh-sach") {
        const ds = (Array.isArray(v) ? v : [v])
          .map((x) => catChuoi(x, DAI_TOI_DA["danh-sach"]))
          .filter(Boolean)
          .slice(0, t.toiDa ?? 6);
        if (ds.length > 0) ra[t.khoa] = ds;
      } else {
        const s = catChuoi(v, DAI_TOI_DA[t.kieu]);
        if (s) ra[t.khoa] = s;
      }
    }
    if (Object.keys(ra).length === 0) thieu.push(i);
    else noiDung[String(i)] = ra;
  }
  return { noiDung, thieu };
}

/** Kiểm định dạng cho `generateWithRetry` — nhắc model đúng chỗ sai. */
export function kiemChuTrang(trang: KienTrucWeb["trang"][number]): (van: string) => FormatIssue[] {
  const can = khoiCanChu(trang);
  return (van: string) => {
    const kq = docChuTrang(van, trang);
    if (!kq) return [{ message: "Không đọc được JSON — trả về đúng MỘT khối JSON, không chữ nào ngoài khối." }];
    if (kq.thieu.length > 0) {
      return [
        {
          message: `Thiếu chữ cho khối ${kq.thieu.map((i) => `"${i}" (${trang.khoi[i]!.ma})`).join(", ")}. Trả đủ ${can.length} khoá: ${can.map((i) => `"${i}"`).join(", ")}.`,
        },
      ];
    }
    return [];
  };
}
