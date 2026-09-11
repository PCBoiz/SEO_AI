"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Copy, ExternalLink, KeyRound, Loader2, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { AiVietHo } from "@/components/ai/ai-viet-ho";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import {
  BUOC_LICH_DANG,
  CHUYEN_MUC_LICH,
  tachDanhSachChuDe,
  type CauHinhLich,
  type LuotLich,
} from "@/domain/lich-dang/lich-dang";

interface BuocTienDoView {
  moduleKey: string;
  trangThai: "chua-chay" | "dang-chay" | "xong" | "hong";
  lan: 0 | 1;
  loi?: string;
  capNhatLuc?: string;
}

interface TrangThai {
  daLap: boolean;
  cauHinh: CauHinhLich | null;
  coMa: boolean;
  luot: LuotLich[];
  lanGoCuoi: string | null;
  ketQuaGoCuoi: string | null;
  nguonGoCuoi: "vps" | "tu-go" | "tay" | null;
  lanGoVpsCuoi: string | null;
  dangDo: { luot: LuotLich; cacBuoc: BuocTienDoView[] } | null;
  tickPath: string;
}

interface NhaCungCap {
  id: AiProviderId;
  label: string;
  /** Model người dùng đã verify ở trang API Keys — null = chưa có khoá. */
  model: string | null;
}

const TEN_BUOC: Record<string, string> = {
  RIS_SITEMAP_KEYWORDS: "Từ khoá",
  RIS_ICN_KEYWORDS: "Cụm chủ đề",
  RIS_ONPAGE_SEO: "On-page",
  RIS_CONTENT_HEADLINE: "Tiêu đề",
  RIS_CONTENT_INTRO: "Mở đầu",
  RIS_CONTENT_SECTIONS: "Thân bài",
  RIS_GEO_SCHEMA: "FAQ + JSON-LD",
  RIS_VHGG_PUBLISH: "Đẩy sang website",
};

/** Đã bao nhiêu phút kể từ `iso` — để nói "đứng im 23 phút" thay vì hai mốc giờ. */
function phutTruoc(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** Lượt đang dở mà không ai gõ quá chừng này phút thì là KẸT — nói to. */
const PHUT_DUNG_IM = 12;

const TEN_NGUON: Record<NonNullable<TrangThai["nguonGoCuoi"]>, string> = {
  vps: "VPS",
  "tu-go": "tự gõ tiếp",
  tay: "bấm tay",
};

function gioVN(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Thẻ "Lịch đăng bài tự động" trên trang dự án.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MÃ KÍCH HOẠT CHỈ HIỆN ĐÚNG MỘT LẦN — ngay sau lần lưu đầu (hoặc khi bấm "Tạo
 * mã mới"). Kho chỉ giữ bản mã hoá. Thẻ đưa nguyên DÒNG CRONTAB để dán, vì
 * việc chủ dự án phải làm trên VPS là đúng một lần dán.
 *
 * Lịch chạy bằng khoá AI của NGƯỜI BẤM LƯU. Hộp chọn nhà cung cấp chỉ hiện
 * những nhà cung cấp người đó đã có khoá; máy chủ kiểm lại lúc lưu.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function LichDangCard({
  projectId,
  tenDuAn,
  website,
  canEdit,
  canRotate,
  macDinh,
  nhaCungCap,
}: {
  projectId: string;
  tenDuAn: string;
  website: string;
  canEdit: boolean;
  canRotate: boolean;
  macDinh: { location: string; language: string; tone: string };
  nhaCungCap: NhaCungCap[];
}) {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [form, setForm] = useState<{
    bat: boolean;
    gioChay: string;
    provider: AiProviderId;
    chuyenMuc: (typeof CHUYEN_MUC_LICH)[number];
    audienceBrief: string;
    location: string;
    language: string;
    tone: string;
    chuDe: string;
    dungSearchConsole: boolean;
  } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string>();
  const [thongBao, setThongBao] = useState<string>();
  const [maVuaCap, setMaVuaCap] = useState<string | null>(null);

  const coKhoa = nhaCungCap.filter((n) => n.model);

  // Cập nhật theo HÀM, không `{ ...form }` từ closure: hai ô đổi liên tiếp trước
  // khi React vẽ lại thì bản sau đè mất bản trước (gặp thật khi thử bằng máy).
  function dat<K extends keyof NonNullable<typeof form>>(khoa: K, giaTri: NonNullable<typeof form>[K]): void {
    setForm((f) => (f ? { ...f, [khoa]: giaTri } : f));
  }

  useEffect(() => {
    let huy = false;
    fetch(`/api/v1/projects/${projectId}/lich-dang`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TrangThai>) : null))
      .then((d) => {
        if (huy || !d) return;
        setTt(d);
        const c = d.cauHinh;
        setForm({
          bat: c?.bat ?? false,
          gioChay: String(c?.gioChay ?? 6),
          provider: c?.ai.provider ?? coKhoa[0]?.id ?? "deepseek",
          chuyenMuc: c?.chuyenMuc ?? "Thị trường",
          audienceBrief: c?.audienceBrief ?? "",
          location: c?.location ?? macDinh.location,
          language: c?.language ?? macDinh.language,
          tone: c?.tone ?? macDinh.tone,
          chuDe: c?.chuDe.join("\n") ?? "",
          dungSearchConsole: c?.dungSearchConsole ?? true,
        });
      })
      .catch(() => {
        if (!huy) setTt(null);
      });
    return () => {
      huy = true;
    };
    // `coKhoa`/`macDinh` chỉ để điền mặc định lần đầu — không tải lại khi chúng đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function taiLai(): Promise<void> {
    const r = await fetch(`/api/v1/projects/${projectId}/lich-dang`, { cache: "no-store" });
    if (r.ok) setTt((await r.json()) as TrangThai);
  }

  async function luu(): Promise<void> {
    if (!form) return;
    const model = nhaCungCap.find((n) => n.id === form.provider)?.model;
    if (!model) {
      setLoi(`Bạn chưa có API key ${form.provider} — vào trang API Keys thêm trước.`);
      return;
    }
    setDangLuu(true);
    setLoi(undefined);
    setThongBao(undefined);
    try {
      const than: CauHinhLich = {
        bat: form.bat,
        gioChay: Number(form.gioChay),
        ai: { provider: form.provider, model },
        chuyenMuc: form.chuyenMuc,
        audienceBrief: form.audienceBrief.trim(),
        location: form.location.trim(),
        language: form.language.trim(),
        tone: form.tone.trim(),
        chuDe: tachDanhSachChuDe(form.chuDe),
        dungSearchConsole: form.dungSearchConsole,
      };
      const r = await fetch(`/api/v1/projects/${projectId}/lich-dang`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(than),
      });
      const d = (await r.json().catch(() => ({}))) as { maMoi?: string | null; error?: { message?: string } };
      if (!r.ok) throw new Error(d.error?.message ?? "Không lưu được lịch.");
      if (d.maMoi) setMaVuaCap(d.maMoi);
      setThongBao(form.bat ? "Đã lưu. Lịch sẽ chạy mỗi ngày sau giờ đã đặt — khi VPS có gõ nhịp." : "Đã lưu. Lịch đang tắt.");
      await taiLai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được lịch.");
    } finally {
      setDangLuu(false);
    }
  }

  async function taoMaMoi(): Promise<void> {
    if (!window.confirm("Mã cũ trên VPS sẽ hết hiệu lực NGAY. Sau khi tạo phải sửa lại dòng crontab. Tiếp tục?")) return;
    setLoi(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/lich-dang/ma-moi`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { ma?: string; error?: { message?: string } };
      if (!r.ok || !d.ma) throw new Error(d.error?.message ?? "Không tạo được mã.");
      setMaVuaCap(d.ma);
      await taiLai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tạo được mã.");
    }
  }

  /** Lượt đang dở: gõ một nhịp bằng tay — cùng cổng với VPS, không mở lượt mới. */
  async function goTiep(): Promise<void> {
    setDangChay(true);
    setLoi(undefined);
    setThongBao(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/lich-dang/chay-ngay`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { trangThai?: string; buoc?: number; lan?: number; loi?: string; error?: { message?: string } };
      if (!r.ok) throw new Error(d.error?.message ?? "Không gõ được.");
      setThongBao(
        d.trangThai === "da-tao"
          ? `Đã tạo bước ${(d.buoc ?? 0) + 1}${d.lan ? " (thử lại)" : ""} — đang chạy, tải lại sau một phút.`
          : d.trangThai === "dang-cho"
            ? `Bước ${(d.buoc ?? 0) + 1} vẫn đang chạy, chưa quá 15 phút — chờ thêm rồi gõ lại.`
            : d.trangThai === "xong"
              ? "Lượt đã xong — bài đang chờ duyệt."
              : `Kết quả: ${d.trangThai}${d.loi ? ` — ${d.loi}` : ""}`,
      );
      await taiLai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không gõ được.");
    } finally {
      setDangChay(false);
    }
  }

  async function chayNgay(): Promise<void> {
    if (!window.confirm("Viết và đẩy MỘT bài ngay bây giờ (tốn ~8 lượt gọi AI bằng khoá của bạn). Bài vào hàng chờ duyệt, chưa lên trang. Tiếp tục?")) return;
    setDangChay(true);
    setLoi(undefined);
    setThongBao(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/lich-dang/chay-ngay`, { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { trangThai?: string; loi?: string; lyDo?: string; error?: { message?: string } };
      if (!r.ok) throw new Error(d.error?.message ?? "Không chạy được.");
      setThongBao(
        d.trangThai === "da-tao"
          ? "Đã bắt đầu. Các bước tự nối nhau — tải lại thẻ này sau vài phút để xem tiến độ."
          : d.trangThai === "het-chu-de"
            ? "Không còn chủ đề nào chưa viết — thêm chủ đề rồi thử lại."
            : `Kết quả: ${d.trangThai}${d.loi ? ` — ${d.loi}` : ""}${d.lyDo ? ` — ${d.lyDo}` : ""}`,
      );
      await taiLai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không chạy được.");
    } finally {
      setDangChay(false);
    }
  }

  const goc = typeof window === "undefined" ? "" : window.location.origin;
  // Ngữ cảnh cho "AI viết hộ": các ô khác của thẻ + dự án.
  const boiCanhVietHo: Record<string, string> = form
    ? {
        siteName: tenDuAn,
        websiteUrl: website,
        location: form.location,
        language: form.language,
        tone: form.tone,
        audienceBrief: form.audienceBrief,
        chuDe: form.chuDe,
        chuyenMuc: form.chuyenMuc,
      }
    : {};
  const dongCrontab = (ma: string) =>
    `*/10 * * * * curl -s -m 60 -X POST -H "Authorization: Bearer ${ma}" ${goc}${tt?.tickPath ?? `/api/v1/lich-dang/${projectId}/tick`} >> /var/log/lich-dang.log 2>&1`;

  return (
    <section className="glass flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarClock className="h-4 w-4 text-geo" /> Lịch đăng bài tự động
        </h2>
        {tt?.daLap && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px]"
            style={{
              background: `color-mix(in oklab, ${tt.cauHinh?.bat ? "var(--success)" : "var(--muted-foreground)"} 15%, transparent)`,
              color: "var(--foreground)",
            }}
          >
            {tt.cauHinh?.bat ? `Đang bật · ${tt.cauHinh.gioChay}:00 mỗi ngày` : "Đang tắt"}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Mỗi ngày một bài: viết theo chủ đề trong danh sách (hết thì lấy truy vấn Search Console đang ở
        trang 2), rồi đẩy sang website vào <strong>hàng chờ duyệt</strong> — bài chỉ lên trang khi bạn
        duyệt. Chạy bằng API key của người bấm Lưu.
      </p>

      {tt === null || form === null ? (
        <p className="text-xs text-muted-foreground">đang kiểm…</p>
      ) : (
        <>
          {tt.dangDo && <TienDo dangDo={tt.dangDo} />}

          {tt.daLap && (
            <p className="text-[11px] text-muted-foreground">
              {tt.lanGoCuoi
                ? `Nhịp gõ gần nhất ${gioVN(tt.lanGoCuoi)} (${tt.nguonGoCuoi ? TEN_NGUON[tt.nguonGoCuoi] : "?"}) — ${tt.ketQuaGoCuoi ?? ""}`
                : "Chưa nhận nhịp gõ nào. Dán dòng crontab (bên dưới) rồi chờ tối đa 10 phút."}
            </p>
          )}

          {/* HAI CÂU CẢNH BÁO — sinh ra từ lượt kẹt thật 12/09: bước 5 đứng
              im 23 phút, không ai gõ, và thẻ chỉ ghi "nhịp gõ gần nhất 02:31"
              — đúng nhưng vô dụng. */}
          {tt.daLap && tt.cauHinh?.bat && !tt.lanGoVpsCuoi && (
            <p role="alert" className="rounded-md border p-2.5 text-xs leading-relaxed" style={{ borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)", background: "color-mix(in oklab, var(--warning) 10%, transparent)" }}>
              <strong>VPS chưa gõ lần nào.</strong> Không có nhịp gõ từ ngoài thì một bước bị ngắt giữa chừng là cả
              lượt đứng im, và ngày mai không có gì tự chạy. Dán dòng crontab vào VPS (bấm &quot;Tạo mã mới&quot; nếu đã
              mất dòng đó), rồi kiểm bằng <code className="metric">crontab -l | grep -c lich-dang</code> → phải ra 1.
            </p>
          )}
          {tt.dangDo && tt.lanGoCuoi && phutTruoc(tt.lanGoCuoi) >= PHUT_DUNG_IM && (
            <p role="alert" className="rounded-md border p-2.5 text-xs leading-relaxed" style={{ borderColor: "color-mix(in oklab, var(--destructive) 40%, transparent)", background: "color-mix(in oklab, var(--destructive) 10%, transparent)" }}>
              <strong>Lượt đang dở nhưng không có nhịp gõ nào {phutTruoc(tt.lanGoCuoi)} phút.</strong> Bước đang chạy có thể đã
              bị ngắt. Bấm <strong>Gõ tiếp ngay</strong>: bước kẹt quá 15 phút sẽ được đánh dấu hết giờ và thử lại.
            </p>
          )}

          {maVuaCap && (
            <div className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-medium text-foreground">
                Mã kích hoạt — chỉ hiện MỘT LẦN. Trên VPS chạy <code className="metric">crontab -e</code>, dán
                dòng này, lưu:
              </p>
              <DongChep giaTri={dongCrontab(maVuaCap)} />
              <p className="text-[11px] text-muted-foreground">
                Đóng trang là mất mã. Mất thì bấm &quot;Tạo mã mới&quot; và dán lại.
              </p>
            </div>
          )}

          {canEdit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Bật lịch" htmlFor={`ld-bat-${projectId}`}>
                <label className="flex h-9 items-center gap-2 text-sm text-foreground">
                  <input
                    id={`ld-bat-${projectId}`}
                    type="checkbox"
                    checked={form.bat}
                    onChange={(e) => dat("bat", e.target.checked)}
                  />
                  Mỗi ngày một bài
                </label>
              </FormField>
              <FormField label="Giờ bắt đầu viết (giờ Việt Nam)" htmlFor={`ld-gio-${projectId}`}>
                <select
                  id={`ld-gio-${projectId}`}
                  value={form.gioChay}
                  onChange={(e) => dat("gioChay", e.target.value)}
                  className="h-9 rounded-md border border-border bg-input px-2 text-sm"
                >
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="Nhà cung cấp AI"
                htmlFor={`ld-ai-${projectId}`}
                description={coKhoa.length === 0 ? "Bạn chưa có API key nào — vào trang API Keys thêm trước." : undefined}
              >
                <select
                  id={`ld-ai-${projectId}`}
                  value={form.provider}
                  onChange={(e) => dat("provider", e.target.value as AiProviderId)}
                  className="h-9 rounded-md border border-border bg-input px-2 text-sm"
                >
                  {nhaCungCap.map((n) => (
                    <option key={n.id} value={n.id} disabled={!n.model}>
                      {n.label}
                      {n.model ? ` · ${n.model}` : " · chưa có khoá"}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Chuyên mục trên website" htmlFor={`ld-muc-${projectId}`}>
                <select
                  id={`ld-muc-${projectId}`}
                  value={form.chuyenMuc}
                  onChange={(e) => dat("chuyenMuc", e.target.value as (typeof CHUYEN_MUC_LICH)[number])}
                  className="h-9 rounded-md border border-border bg-input px-2 text-sm"
                >
                  {CHUYEN_MUC_LICH.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Thị trường / địa điểm" htmlFor={`ld-loc-${projectId}`}>
                <Input id={`ld-loc-${projectId}`} value={form.location} onChange={(e) => dat("location", e.target.value)} />
              </FormField>
              <FormField label="Giọng văn" htmlFor={`ld-tone-${projectId}`}>
                <Input id={`ld-tone-${projectId}`} value={form.tone} onChange={(e) => dat("tone", e.target.value)} />
              </FormField>
              <FormField
                label="Mô tả doanh nghiệp / khách hàng"
                htmlFor={`ld-brief-${projectId}`}
                className="sm:col-span-2"
                description="Dùng cho mọi bước — như ô cùng tên ở trang Quy trình."
              >
                <Textarea
                  id={`ld-brief-${projectId}`}
                  rows={3}
                  value={form.audienceBrief}
                  onChange={(e) => dat("audienceBrief", e.target.value)}
                  placeholder="Ví dụ: Môi giới bất động sản tại Hạ Long; khách mua để ở và đầu tư dài hạn, quan tâm pháp lý và giá thực trả."
                />
                {coKhoa.length > 0 && (
                  <AiVietHo
                    projectId={projectId}
                    truong="audienceBrief"
                    nhan="Mô tả doanh nghiệp / khách hàng"
                    giaTri={form.audienceBrief}
                    onChange={(v) => dat("audienceBrief", v)}
                    boiCanh={boiCanhVietHo}
                    nhaCungCap={coKhoa.map((n) => ({ id: n.id, label: n.label, model: n.model! }))}
                    macDinh={form.provider}
                    gioiHanKyTu={4_000}
                  />
                )}
              </FormField>
              <FormField
                label="Danh sách chủ đề — mỗi dòng một bài"
                htmlFor={`ld-chude-${projectId}`}
                className="sm:col-span-2"
                description={`${tachDanhSachChuDe(form.chuDe).length} chủ đề. Viết xong thì bỏ qua; hỏng hai lần thì bỏ qua.`}
              >
                <Textarea
                  id={`ld-chude-${projectId}`}
                  rows={5}
                  value={form.chuDe}
                  onChange={(e) => dat("chuDe", e.target.value)}
                  placeholder={"Giá biệt thự đảo Hạ Long Xanh 2026\nTiến độ phân khu Paradise Bay\nPháp lý sổ hồng dự án…"}
                />
                {coKhoa.length > 0 && (
                  <AiVietHo
                    projectId={projectId}
                    truong="chuDe"
                    nhan="Danh sách chủ đề bài viết"
                    moTa="Mỗi dòng một bài; lịch viết mỗi ngày một chủ đề theo thứ tự"
                    loai="danh-sach"
                    giaTri={form.chuDe}
                    onChange={(v) => dat("chuDe", v)}
                    boiCanh={boiCanhVietHo}
                    nhaCungCap={coKhoa.map((n) => ({ id: n.id, label: n.label, model: n.model! }))}
                    macDinh={form.provider}
                    gioiHanKyTu={160}
                    gioiHanMuc={300}
                  />
                )}
              </FormField>
              <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.dungSearchConsole}
                  onChange={(e) => dat("dungSearchConsole", e.target.checked)}
                />
                Hết danh sách thì lấy truy vấn Search Console đang ở vị trí 11–30
              </label>
              <input type="hidden" value={form.language} readOnly />
            </div>
          )}

          {(loi || thongBao) && (
            <p role={loi ? "alert" : "status"} className={`text-xs ${loi ? "text-destructive" : "text-muted-foreground"}`}>
              {loi ?? thongBao}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button type="button" size="sm" onClick={luu} disabled={dangLuu || coKhoa.length === 0}>
                {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {tt.daLap ? "Lưu thay đổi" : "Lưu & lấy dòng crontab"}
              </Button>
            )}
            {canEdit && tt.daLap && (
              <Button type="button" size="sm" variant="outline" onClick={tt.dangDo ? goTiep : chayNgay} disabled={dangChay}>
                {dangChay ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {tt.dangDo ? "Gõ tiếp ngay" : "Chạy thử một bài ngay"}
              </Button>
            )}
            {canRotate && tt.daLap && (
              <Button type="button" size="sm" variant="ghost" onClick={taoMaMoi}>
                <KeyRound className="h-3.5 w-3.5" /> Tạo mã mới
              </Button>
            )}
          </div>

          {tt.luot.length > 0 && <SoLuot luot={tt.luot} />}
        </>
      )}
    </section>
  );
}

function TienDo({ dangDo }: { dangDo: NonNullable<TrangThai["dangDo"]> }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <p className="text-xs text-foreground">
        Đang viết: <strong>{dangDo.luot.chuDe}</strong>{" "}
        <span className="text-muted-foreground">
          · lượt {dangDo.luot.ngay}
          {dangDo.luot.lan ? ` (#${dangDo.luot.lan + 1})` : ""} · bắt đầu {gioVN(dangDo.luot.batDauLuc)}
        </span>
      </p>
      <ol className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {dangDo.cacBuoc.map((b, i) => (
          <li
            key={b.moduleKey}
            className="flex items-center gap-1.5 text-[11px]"
            title={[
              b.capNhatLuc ? `Cập nhật ${gioVN(b.capNhatLuc)} (${phutTruoc(b.capNhatLuc)} phút trước)` : "",
              b.loi ?? "",
            ]
              .filter(Boolean)
              .join(" — ")}
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  b.trangThai === "xong"
                    ? "var(--success)"
                    : b.trangThai === "dang-chay"
                      ? "var(--warning)"
                      : b.trangThai === "hong"
                        ? "var(--destructive)"
                        : "var(--border)",
              }}
            />
            <span className={b.trangThai === "chua-chay" ? "text-muted-foreground" : "text-foreground"}>
              {i + 1}. {TEN_BUOC[b.moduleKey] ?? b.moduleKey}
              {b.lan ? " (thử lại)" : ""}
              {b.trangThai === "dang-chay" && b.capNhatLuc && phutTruoc(b.capNhatLuc) >= 5
                ? ` · đứng ${phutTruoc(b.capNhatLuc)} phút`
                : ""}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted-foreground">
        {BUOC_LICH_DANG.length} bước, mỗi bước một lượt chạy riêng. Tải lại trang để cập nhật.
      </p>
    </div>
  );
}

function SoLuot({ luot }: { luot: LuotLich[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-foreground">Lượt gần đây</p>
      <ul className="flex flex-col divide-y divide-border">
        {luot.map((l) => (
          <li key={`${l.ngay}#${l.lan}`} className="flex flex-wrap items-baseline gap-x-2 py-1.5 text-[11px]">
            <span className="metric text-muted-foreground">{l.ngay}</span>
            <span className="min-w-0 flex-1 truncate text-foreground" title={l.chuDe}>
              {l.chuDe}
            </span>
            <span className="text-muted-foreground">{l.nguon === "search-console" ? "GSC" : "danh sách"}</span>
            {l.ketQua === "da-dang" && l.postUrl ? (
              <a href={l.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline decoration-dotted" style={{ color: "var(--success)" }}>
                chờ duyệt <ExternalLink className="h-3 w-3" />
              </a>
            ) : l.ketQua === "da-dang" ? (
              <span style={{ color: "var(--success)" }}>chờ duyệt</span>
            ) : l.ketQua ? (
              <span className="max-w-full truncate" style={{ color: "var(--destructive)" }} title={l.loi}>
                {l.ketQua === "het-han" ? "hết hạn" : "dừng"}
                {l.loi ? ` — ${l.loi}` : ""}
              </span>
            ) : (
              <span style={{ color: "var(--warning)" }}>đang chạy</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DongChep({ giaTri }: { giaTri: string }) {
  const [daChep, setDaChep] = useState(false);
  async function chep(): Promise<void> {
    try {
      await navigator.clipboard.writeText(giaTri);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 1500);
    } catch {
      // Không có clipboard — người dùng vẫn bôi đen chép được.
    }
  }
  return (
    <div className="flex items-start gap-2">
      <code className="metric min-w-0 flex-1 break-all rounded bg-accent/40 px-2 py-1 text-[11px] text-foreground">{giaTri}</code>
      <button
        type="button"
        onClick={chep}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
        aria-label="Chép dòng crontab"
      >
        {daChep ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {daChep ? "đã chép" : "chép"}
      </button>
    </div>
  );
}
