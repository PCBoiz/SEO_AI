"use client";

import { useEffect, useRef, useState } from "react";
import { History, Loader2, Sparkles, Undo2, X } from "lucide-react";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";

/* ══════════════════════════════════════════════════════════════════════════
   NÚT "AI VIẾT HỘ" cạnh một ô nhập — dùng chung cho mọi form.

   Người dùng bấm → chọn nhà cung cấp (khoá API của chính họ ở trang API Keys)
   → gõ gợi ý nếu muốn → "Viết". Kết quả điền thẳng vào ô. Mỗi lần viết là một
   job của module ẩn `RIS_VIET_HO`, nên LỊCH SỬ có sẵn: bản AI viết và bản
   trước khi AI viết đè — bấm "Dùng" là quay về.

   ⚠️ KHÔNG TỰ ĐỘNG VIẾT KHI MỞ. Mỗi lượt tốn tiền API của người dùng; mọi lượt
   gọi đều do một cái bấm "Viết" rõ ràng.
   ══════════════════════════════════════════════════════════════════════════ */

export interface NhaCungCapVietHo {
  id: AiProviderId;
  label: string;
  model: string;
}

export interface AiVietHoProps {
  projectId: string;
  /** Khoá ô — cùng khoá dùng để lọc lịch sử. */
  truong: string;
  nhan: string;
  moTa?: string;
  loai?: "van-ban" | "danh-sach";
  giaTri: string;
  onChange: (giaTri: string) => void;
  /** Các ô khác + thông tin dự án, để AI viết đúng ngữ cảnh. */
  boiCanh?: Record<string, string>;
  nhaCungCap: NhaCungCapVietHo[];
  macDinh?: AiProviderId;
  gioiHanKyTu?: number;
  gioiHanMuc?: number;
  disabled?: boolean;
}

interface BanVietHo {
  jobId: string;
  luc: string;
  provider: string;
  model: string;
  goiY: string;
  noiDung: string;
  banTruoc: string;
}

interface JobView {
  id: string;
  status: "queued" | "dispatching" | "running" | "succeeded" | "failed" | "timed_out";
  output: { noiDung?: string } | null;
  errorMessage: string | null;
}

const NHIP_HOI_MS = 1_500;
const TRAN_CHO_MS = 3 * 60_000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function gioVN(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AiVietHo({
  projectId,
  truong,
  nhan,
  moTa,
  loai = "van-ban",
  giaTri,
  onChange,
  boiCanh = {},
  nhaCungCap,
  macDinh,
  gioiHanKyTu,
  gioiHanMuc,
  disabled,
}: AiVietHoProps) {
  const [mo, setMo] = useState(false);
  const [provider, setProvider] = useState<AiProviderId>(macDinh ?? nhaCungCap[0]?.id ?? "deepseek");
  const [goiY, setGoiY] = useState("");
  const [dangViet, setDangViet] = useState(false);
  const [loi, setLoi] = useState<string>();
  const [lichSu, setLichSu] = useState<BanVietHo[] | null>(null);
  const [xemLichSu, setXemLichSu] = useState(false);
  const huy = useRef(false);

  useEffect(() => {
    huy.current = false;
    return () => {
      huy.current = true;
    };
  }, []);

  // Tải lịch sử ngay khi có dự án — để "N bản đã viết" hiện mà không cần mở
  // panel. Một truy vấn nhỏ cho mỗi ô; đổi dự án thì tải lại.
  useEffect(() => {
    if (!projectId || /url/i.test(truong)) return;
    let huyTai = false;
    fetch(
      `/api/v1/viet-ho?projectId=${encodeURIComponent(projectId)}&truong=${encodeURIComponent(truong)}`,
      { cache: "no-store" },
    )
      .then((r) => (r.ok ? (r.json() as Promise<{ lichSu: BanVietHo[] }>) : null))
      .then((d) => {
        if (!huyTai && d) setLichSu(d.lichSu);
      })
      .catch(() => {
        // Lịch sử là phụ.
      });
    return () => {
      huyTai = true;
    };
  }, [projectId, truong]);

  // Nhà cung cấp mặc định đổi ở form cha (ví dụ ô chọn AI chung) → theo. Đặt
  // state ngay trong lúc vẽ (không qua effect) — cùng khuôn với `duAnTruoc`
  // ở trang Quy trình.
  const [macDinhTruoc, setMacDinhTruoc] = useState(macDinh);
  if (macDinh !== macDinhTruoc) {
    setMacDinhTruoc(macDinh);
    if (macDinh) setProvider(macDinh);
  }

  async function taiLichSu(): Promise<void> {
    if (!projectId) return;
    try {
      const r = await fetch(
        `/api/v1/viet-ho?projectId=${encodeURIComponent(projectId)}&truong=${encodeURIComponent(truong)}`,
        { cache: "no-store" },
      );
      if (!r.ok) return;
      const d = (await r.json()) as { lichSu: BanVietHo[] };
      if (!huy.current) setLichSu(d.lichSu);
    } catch {
      // Lịch sử là phụ — không tải được thì nút vẫn viết được.
    }
  }

  function moPanel(): void {
    setMo(true);
    setLoi(undefined);
    if (lichSu === null) void taiLichSu();
  }

  async function viet(): Promise<void> {
    if (!projectId) {
      setLoi("Chọn dự án trước.");
      return;
    }
    const model = nhaCungCap.find((n) => n.id === provider)?.model ?? "";
    setDangViet(true);
    setLoi(undefined);
    try {
      const input: Record<string, unknown> = {
        projectId,
        idempotencyKey: crypto.randomUUID(),
        ai: { provider, model },
        truong,
        nhan,
        moTa: moTa ?? "",
        loai,
        giaTriHienTai: giaTri,
        goiY: goiY.trim(),
        boiCanh: Object.fromEntries(
          Object.entries(boiCanh)
            .filter(([, v]) => typeof v === "string" && v.trim())
            .map(([k, v]) => [k, v.slice(0, 4_000)]),
        ),
      };
      if (gioiHanKyTu) input.gioiHanKyTu = gioiHanKyTu;
      if (gioiHanMuc) input.gioiHanMuc = gioiHanMuc;

      const r = await fetch("/api/v1/modules/RIS_VIET_HO/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const d = (await r.json().catch(() => ({}))) as {
        job?: JobView;
        error?: { message?: string; details?: { issues?: Array<{ message: string }> } };
      };
      if (!r.ok || !d.job) {
        throw new Error(d.error?.details?.issues?.[0]?.message ?? d.error?.message ?? "Không tạo được lượt viết.");
      }

      let job = d.job;
      const hetHan = Date.now() + TRAN_CHO_MS;
      while (["queued", "dispatching", "running"].includes(job.status)) {
        if (huy.current) return;
        if (Date.now() > hetHan) throw new Error("AI chưa trả lời sau 3 phút — thử lại.");
        await delay(NHIP_HOI_MS);
        const p = await fetch(`/api/v1/modules/RIS_VIET_HO/jobs/${job.id}`, { cache: "no-store" });
        if (!p.ok) continue;
        job = ((await p.json()) as { job: JobView }).job;
      }
      if (job.status !== "succeeded" || !job.output?.noiDung) {
        throw new Error(job.errorMessage ?? "AI không viết được — thử lại hoặc đổi nhà cung cấp.");
      }
      onChange(job.output.noiDung);
      setGoiY("");
      await taiLichSu();
    } catch (e) {
      if (!huy.current) setLoi(e instanceof Error ? e.message : "Không viết được.");
    } finally {
      if (!huy.current) setDangViet(false);
    }
  }

  const soBan = lichSu?.length ?? 0;

  // Ô địa chỉ web thì AI không thể biết — không bày nút cho một việc nó không làm được.
  if (/url/i.test(truong)) return null;

  return (
    <div className="mt-1.5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={mo ? () => setMo(false) : moPanel}
          disabled={disabled || dangViet}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-expanded={mo}
        >
          {dangViet ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-geo" />}
          {dangViet ? "AI đang viết…" : "AI viết hộ"}
        </button>
        {soBan > 0 && (
          <button
            type="button"
            onClick={() => {
              setXemLichSu((x) => !x);
              if (!mo) moPanel();
            }}
            className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            <History className="h-3 w-3" /> {soBan} bản đã viết
          </button>
        )}
      </div>

      {mo && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-accent/20 p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-muted-foreground" htmlFor={`vh-nc-${truong}`}>
              Viết bằng
            </label>
            <select
              id={`vh-nc-${truong}`}
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderId)}
              disabled={dangViet}
              className="h-7 rounded-md border border-border bg-input px-2 text-[11px]"
            >
              {nhaCungCap.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} · {n.model}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-muted-foreground">(khoá của bạn ở trang API Keys)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={goiY}
              onChange={(e) => setGoiY(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !dangViet) {
                  e.preventDefault();
                  void viet();
                }
              }}
              disabled={dangViet}
              placeholder={giaTri.trim() ? "Gợi ý: ngắn hơn, nhấn vào pháp lý, đổi giọng…" : "Gợi ý cho AI (tuỳ chọn)"}
              className="h-7 min-w-0 flex-1 rounded-md border border-border bg-input px-2 text-[11px]"
            />
            <button
              type="button"
              onClick={() => void viet()}
              disabled={dangViet || nhaCungCap.length === 0}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] text-primary-foreground disabled:opacity-50"
            >
              {dangViet ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {giaTri.trim() ? "Viết lại" : "Viết"}
            </button>
            <button
              type="button"
              onClick={() => setMo(false)}
              className="inline-flex h-7 items-center rounded-md px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {loi && (
            <p role="alert" className="text-[11px] text-destructive">
              {loi}
            </p>
          )}
          {xemLichSu && lichSu && lichSu.length > 0 && (
            <ul className="flex max-h-56 flex-col divide-y divide-border overflow-y-auto">
              {lichSu.map((b, i) => (
                <li key={b.jobId} className="flex flex-col gap-1 py-1.5 text-[11px]">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-muted-foreground">
                      #{lichSu.length - i} · {gioVN(b.luc)} · {b.provider}
                      {b.goiY ? ` · “${b.goiY.slice(0, 40)}”` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(b.noiDung)}
                      disabled={disabled || b.noiDung === giaTri}
                      className="text-foreground underline decoration-dotted underline-offset-2 disabled:opacity-40"
                    >
                      Dùng bản này
                    </button>
                    {b.banTruoc && b.banTruoc !== b.noiDung && (
                      <button
                        type="button"
                        onClick={() => onChange(b.banTruoc)}
                        disabled={disabled || b.banTruoc === giaTri}
                        className="inline-flex items-center gap-1 text-muted-foreground underline decoration-dotted underline-offset-2 disabled:opacity-40"
                        title="Nội dung ô trước khi AI viết lần này"
                      >
                        <Undo2 className="h-3 w-3" /> bản trước đó
                      </button>
                    )}
                  </div>
                  <p className="line-clamp-2 whitespace-pre-line text-foreground/80">{b.noiDung}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
