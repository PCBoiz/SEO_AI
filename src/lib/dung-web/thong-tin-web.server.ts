import "server-only";

import { docCauHinhDuAn, ghiCauHinhDuAn } from "@/lib/integrations/cau-hinh-du-an.server";

/* ══════════════════════════════════════════════════════════════════════════
   SỐ ĐIỆN THOẠI + ZALO + ẢNH MỞ ĐẦU CỦA WEB KHÁCH — nhớ theo dự án

   Thẻ "Website dựng sẵn" đòi số điện thoại mỗi lần (đúng: máy không được bịa
   số). Nhưng đòi GÕ LẠI mỗi lần mở trang thì sai: chủ dự án đẩy bản mới lên
   GitHub tuần sau lại phải nhớ số của khách đó. Lưu vào `project_integrations`
   loại `dung_web` (không bí mật) ở lần dùng đầu; lần sau thẻ điền sẵn, và tuyến
   trạng thái soát bằng số thật thay vì số giữ chỗ.
   ══════════════════════════════════════════════════════════════════════════ */

const LOAI = "dung_web" as const;

export interface ThongTinWebDaLuu {
  dienThoai: string;
  zalo: string;
  /** Id ảnh Drive chọn làm ảnh mở đầu ("" = để máy lấy tấm đầu). */
  anhMoDau: string;
  luuLuc: string;
}

export async function docThongTinWeb(projectId: string): Promise<ThongTinWebDaLuu | null> {
  const c = (await docCauHinhDuAn(projectId, LOAI)) as Partial<ThongTinWebDaLuu> | null;
  if (!c?.dienThoai) return null;
  return { dienThoai: c.dienThoai, zalo: c.zalo ?? "", anhMoDau: c.anhMoDau ?? "", luuLuc: c.luuLuc ?? "" };
}

export async function ghiThongTinWeb(
  projectId: string,
  thongTin: { dienThoai: string; zalo?: string; anhMoDau?: string },
): Promise<void> {
  const dienThoai = thongTin.dienThoai.trim();
  if (!dienThoai) return;
  await ghiCauHinhDuAn(projectId, LOAI, {
    dienThoai,
    zalo: (thongTin.zalo ?? "").trim(),
    anhMoDau: (thongTin.anhMoDau ?? "").trim(),
    luuLuc: new Date().toISOString(),
  });
}
