"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Globe2, Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";

/**
 * Thẻ "Website dựng sẵn" — nơi bản dựng biến thành một tệp tải về được.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SỐ ĐIỆN THOẠI LÀ BẮT BUỘC, VÀ ĐÓ LÀ CHỦ ĐÍCH.
 *
 * Mọi khối liên hệ trong mã sinh ra đều nhúng số này: nút gọi ở đầu trang,
 * nút nổi ở đáy màn hình điện thoại, chân trang, khối chốt. Cho tải về khi ô
 * này trống nghĩa là giao cho khách một website mà mọi nút gọi đều dẫn tới
 * `0000 000 000` — và lỗi đó không ai phát hiện bằng mắt, vì trang trông vẫn
 * hoàn chỉnh.
 *
 * Số điện thoại KHÔNG do AI viết. Nó là dữ liệu thật, và bịa một số điện thoại
 * là dựng ra một đường dây gọi tới người lạ.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface TrangThai {
  coBanDung: boolean;
  lyDo?: string;
  tenWebsite?: string;
  soTrang?: number;
  trang?: Array<{ duong: string; tieuDe: string; soKhoi: number }>;
  soTep?: number;
  boQua?: string[];
  thieu?: string[];
  duLieuCan?: string[];
  canVietMoi?: Array<{ ten: string; vaiTro: string; moTa: string }>;
  /** `null` = dự án chưa nối thư mục Drive. */
  soAnhDrive?: number | null;
  soAnhSeDung?: number;
  soat?: Array<{ tep: string; loi: string; muc: "nang" | "nhe" }>;
}

export function DungWebCard({ projectId }: { projectId: string }) {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [dienThoai, setDienThoai] = useState("");
  const [zalo, setZalo] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string>();
  const [xemTruoc, setXemTruoc] = useState<string | null>(null);
  const [dangDung, setDangDung] = useState(false);
  const [tinXemTruoc, setTinXemTruoc] = useState<string>();

  useEffect(() => {
    let huy = false;
    fetch(`/api/v1/projects/${projectId}/dung-web`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TrangThai>) : null))
      .then((d) => {
        if (!huy) setTt(d ?? { coBanDung: false, lyDo: "Không đọc được trạng thái." });
      })
      .catch(() => {
        if (!huy) setTt({ coBanDung: false, lyDo: "Không đọc được trạng thái." });
      });
    return () => {
      huy = true;
    };
  }, [projectId]);

  const soHopLe = /^[0-9+ ().-]{8,20}$/.test(dienThoai.trim());

  async function taiVe(): Promise<void> {
    setLoi(undefined);
    setDangTai(true);
    try {
      const q = new URLSearchParams({ tai: "1", dienThoai: dienThoai.trim(), zalo: zalo.trim() });
      const r = await fetch(`/api/v1/projects/${projectId}/dung-web?${q}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Máy chủ trả HTTP ${r.status}`);
      const blob = await r.blob();
      // Tải về bằng liên kết tạm: giữ được tên tệp và không mở tab trắng.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(tt?.tenWebsite ?? "website").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2_000);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tải được.");
    } finally {
      setDangTai(false);
    }
  }

  /**
   * Bật máy chủ xem trước NGAY TRÊN MÁY.
   *
   * Lần đầu phải `npm install` cho dự án khách nên mất vài phút — nút phải nói
   * ra trước, vì một nút im lặng vài phút thì người dùng bấm lại, rồi bấm lại
   * nữa. Bản chạy trên Vercel trả 501 kèm lý do; giao diện in nguyên lý do đó.
   */
  async function batXemTruoc(dungLai = false): Promise<void> {
    setLoi(undefined);
    setTinXemTruoc(dungLai ? "Đang dựng lại…" : "Đang dựng — lần đầu mất vài phút (cài thư viện cho dự án mới)…");
    setDangDung(true);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/dung-web/xem-truoc`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dienThoai: dienThoai.trim(), zalo: zalo.trim(), dungLai }),
      });
      const d = (await r.json().catch(() => ({}))) as { chayDuoc?: boolean; url?: string; lyDo?: string; dangChay?: boolean };
      if (!d.chayDuoc || !d.url) throw new Error(d.lyDo ?? `Máy chủ trả HTTP ${r.status}`);
      setXemTruoc(d.url);
      setTinXemTruoc(d.dangChay ? "Đang chạy sẵn từ trước." : "Đã bật. Sửa xong bấm “Dựng lại” để xem bản mới.");
    } catch (e) {
      setXemTruoc(null);
      setTinXemTruoc(undefined);
      setLoi(e instanceof Error ? e.message : "Không bật được xem trước.");
    } finally {
      setDangDung(false);
    }
  }

  async function tatXemTruoc(): Promise<void> {
    setDangDung(true);
    try {
      await fetch(`/api/v1/projects/${projectId}/dung-web/xem-truoc`, { method: "DELETE" });
      setXemTruoc(null);
      setTinXemTruoc("Đã tắt máy chủ xem trước.");
    } finally {
      setDangDung(false);
    }
  }

  return (
    <section id="dung-web" className={`glass flex flex-col gap-4 p-5 ${tt === null ? "min-h-[12rem]" : ""}`}>
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Globe2 className="h-4 w-4 text-geo" /> Website dựng sẵn
      </h2>

      {tt === null ? (
        <p className="text-xs text-muted-foreground">đang kiểm…</p>
      ) : !tt.coBanDung ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {tt.lyDo ?? "Chưa có bản dựng nào."} Máy hỏi bạn website để làm gì, rồi tự chọn trang, khối,
            màu, chữ — và trả về mã nguồn một website Next.js chạy được.
          </p>
          <Link
            href="/pipelines"
            className="inline-flex min-h-9 w-fit items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Mở Quy trình → chọn “Dựng website — bản nháp”
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">{tt.tenWebsite}</strong> — {tt.soTrang} trang, {tt.soTep} tệp.
            Tải về rồi chạy <code className="metric">npm install</code> và <code className="metric">npm run dev</code> là
            xem được trên máy. Cách đưa lên mạng (Vercel / VPS / giao cho khách) viết trong
            <code className="metric"> docs/dua-web-khach-len-mang.md</code>.
          </p>

          <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            {tt.trang?.map((t) => (
              <li key={t.duong}>
                <span className="metric">{t.duong}</span> — {t.tieuDe} ({t.soKhoi} khối)
              </li>
            ))}
          </ul>

          {(tt.thieu?.length ?? 0) > 0 && (
            <p className="rounded-md border p-2.5 text-xs leading-relaxed" style={{ borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)", background: "color-mix(in oklab, var(--warning) 10%, transparent)" }}>
              Còn thiếu: {tt.thieu!.join("; ")}.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {tt.soAnhDrive === null || tt.soAnhDrive === undefined ? (
              <>
                <strong className="text-foreground">Chưa nối thư mục Drive</strong> — website sẽ toàn chữ, không có
                ảnh. Nối ở thẻ “Ảnh từ Google Drive” phía trên rồi bấm tải lại. Máy{" "}
                <strong className="text-foreground">không tự sinh ảnh</strong>: ảnh AI từng lọt lên trang thật và
                khách nhận ra ngay.
              </>
            ) : tt.soAnhDrive === 0 ? (
              <>Thư mục Drive chưa có ảnh nào — website sẽ toàn chữ.</>
            ) : (
              <>
                Ảnh: lấy {tt.soAnhSeDung} tấm từ thư mục Drive ({tt.soAnhDrive} tấm đang có). Tấm đầu vào mảng mở
                đầu; phần còn lại vào dải ảnh nếu kiến trúc có khối đó.
              </>
            )}
          </p>

          {(tt.boQua?.length ?? 0) > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Khối chưa có bản dựng, đã bỏ khỏi trang: {tt.boQua!.join(", ")}.
            </p>
          )}
          {(tt.soat?.length ?? 0) > 0 && (
            <div
              role="alert"
              className="rounded-md border p-2.5 text-xs leading-relaxed"
              style={{
                borderColor: "color-mix(in oklab, var(--destructive) 40%, transparent)",
                background: "color-mix(in oklab, var(--destructive) 10%, transparent)",
              }}
            >
              <p className="font-medium text-foreground">Tự soát bản dựng thấy {tt.soat!.length} chỗ cần sửa:</p>
              <ul className="mt-1 list-disc pl-4">
                {tt.soat!.slice(0, 6).map((l) => (
                  <li key={`${l.tep}${l.loi}`}>
                    <span className="metric">{l.tep}</span> — {l.loi}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-muted-foreground">
                Đây là lỗi của bộ dựng, không phải của bạn — vẫn tải về được, nhưng gửi tôi ảnh chụp dòng này.
              </p>
            </div>
          )}

          {(tt.duLieuCan?.length ?? 0) > 0 && (
            <div className="text-[11px] text-muted-foreground">
              <p className="font-medium text-foreground">Dữ liệu thật bạn cần điền vào sau khi tải:</p>
              <ul className="mt-1 list-disc pl-4">
                {tt.duLieuCan!.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Số điện thoại hiện trên website"
              htmlFor={`dw-dt-${projectId}`}
              description="Bắt buộc — mọi nút gọi trong mã đều dùng số này. Máy không tự bịa số."
            >
              <Input
                id={`dw-dt-${projectId}`}
                value={dienThoai}
                onChange={(e) => setDienThoai(e.target.value)}
                placeholder="0912 345 678"
                inputMode="tel"
              />
            </FormField>
            <FormField label="Link Zalo (tuỳ chọn)" htmlFor={`dw-zl-${projectId}`}>
              <Input
                id={`dw-zl-${projectId}`}
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
                placeholder="https://zalo.me/0912345678"
              />
            </FormField>
          </div>

          {loi && (
            <p role="alert" className="text-xs text-destructive">
              {loi}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" onClick={taiVe} disabled={!soHopLe || dangTai}>
              {dangTai ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Tải mã nguồn (.zip)
            </Button>
            {xemTruoc ? (
              <>
                <a
                  href={xemTruoc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-accent"
                >
                  Mở trang xem thử <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <Button type="button" size="sm" variant="outline" onClick={() => void batXemTruoc(true)} disabled={dangDung || !soHopLe}>
                  {dangDung ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Dựng lại
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void tatXemTruoc()} disabled={dangDung}>
                  <Square className="h-3.5 w-3.5" /> Tắt
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => void batXemTruoc(false)} disabled={!soHopLe || dangDung}>
                {dangDung ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Xem thử trên máy
              </Button>
            )}
            {!soHopLe && <span className="text-[11px] text-muted-foreground">Điền số điện thoại rồi nút sẽ bật.</span>}
          </div>

          {tinXemTruoc && (
            <p role="status" className="text-[11px] text-muted-foreground">
              {tinXemTruoc}
            </p>
          )}
        </>
      )}
    </section>
  );
}
