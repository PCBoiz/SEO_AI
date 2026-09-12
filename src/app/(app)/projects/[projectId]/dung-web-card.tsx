"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Globe2, KeyRound, Loader2, Play, Square, UploadCloud } from "lucide-react";
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
  /** `false` khi Antigravity chạy ở nơi không dựng được (Vercel). */
  xemTruocDuoc?: boolean;
  /** Dự án chưa có URL website → sitemap/canonical/thẻ chia sẻ trỏ example.com. */
  thieuTenMien?: boolean;
  /** Số điện thoại/Zalo/ảnh mở đầu đã dùng lần trước — điền sẵn, khỏi gõ lại. */
  daLuu?: { dienThoai: string; zalo: string; anhMoDau?: string } | null;
  /** Ảnh trong Drive (tên + id) để chọn ảnh mở đầu. */
  anhDrive?: Array<{ id: string; ten: string; thuMucCon: string }>;
  anhMoDau?: string;
}

interface TrangThaiGitHub {
  ketNoi: { login: string; luuLuc: string } | null;
  kho: { owner: string; repo: string; url: string; nhanh: string; dayLuc: string; sha: string; soTep: number } | null;
}

/**
 * Đưa lên mạng KHÔNG CẦN MÁY DỰNG: Antigravity đẩy mã nguồn lên một kho GitHub
 * riêng tư; Cloudflare nối với kho đó tự cài, dựng, đưa lên mạng mỗi khi có
 * bản mới. Lần đầu người dùng nối kho trong Cloudflare bằng vài cú bấm; từ đó
 * mỗi lần "Đẩy lên GitHub" là một lần lên mạng.
 */
function DayGitHub({
  projectId,
  dienThoai,
  zalo,
  anhMoDau,
  soHopLe,
}: {
  projectId: string;
  dienThoai: string;
  zalo: string;
  anhMoDau: string;
  soHopLe: boolean;
}) {
  const [tt, setTt] = useState<TrangThaiGitHub | null>(null);
  const [token, setToken] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [dangDay, setDangDay] = useState(false);
  const [loi, setLoi] = useState<string>();
  const [ketQua, setKetQua] = useState<{ url: string; lanDau: boolean; soLoiNang: number } | null>(null);

  useEffect(() => {
    let huy = false;
    fetch(`/api/v1/projects/${projectId}/dung-web/github`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<TrangThaiGitHub>) : null))
      .then((d) => {
        if (!huy) setTt(d ?? { ketNoi: null, kho: null });
      })
      .catch(() => {
        if (!huy) setTt({ ketNoi: null, kho: null });
      });
    return () => {
      huy = true;
    };
  }, [projectId]);

  async function luuToken(): Promise<void> {
    setLoi(undefined);
    setDangLuu(true);
    try {
      const r = await fetch("/api/v1/github/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = (await r.json().catch(() => ({}))) as { ketNoi?: TrangThaiGitHub["ketNoi"]; error?: { message?: string } };
      if (!r.ok || !d.ketNoi) throw new Error(d.error?.message ?? `Máy chủ trả HTTP ${r.status}`);
      setToken("");
      setTt((c) => ({ ketNoi: d.ketNoi!, kho: c?.kho ?? null }));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được token.");
    } finally {
      setDangLuu(false);
    }
  }

  async function goToken(): Promise<void> {
    await fetch("/api/v1/github/token", { method: "DELETE" });
    setTt((c) => ({ ketNoi: null, kho: c?.kho ?? null }));
  }

  async function day(): Promise<void> {
    setLoi(undefined);
    setKetQua(null);
    setDangDay(true);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/dung-web/github`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dienThoai: dienThoai.trim(), zalo: zalo.trim(), anhMoDau }),
      });
      const d = (await r.json().catch(() => ({}))) as
        | { trangThai: "ok"; kho: NonNullable<TrangThaiGitHub["kho"]>; lanDau: boolean; soLoiNang: number }
        | { trangThai: "loi"; lyDo: string }
        | { error?: { message?: string } };
      if (!("trangThai" in d)) throw new Error(("error" in d && d.error?.message) || `Máy chủ trả HTTP ${r.status}`);
      if (d.trangThai === "loi") throw new Error(d.lyDo);
      setTt((c) => ({ ketNoi: c?.ketNoi ?? null, kho: d.kho }));
      setKetQua({ url: d.kho.url, lanDau: d.lanDau, soLoiNang: d.soLoiNang });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đẩy được.");
    } finally {
      setDangDay(false);
    }
  }

  // Khung vẽ ngay (kể cả khi chưa có trạng thái) để phần dưới thẻ không nhảy
  // khi dữ liệu về — cùng bài học CLS ở vòng 41.
  return (
    <div className="flex min-h-[7rem] flex-col gap-2 rounded-md border border-border/60 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-foreground">
        <UploadCloud className="h-3.5 w-3.5 text-geo" /> Đưa lên mạng không cần máy: GitHub → Cloudflare tự dựng
      </p>
      {tt === null ? (
        <p className="text-[11px] text-muted-foreground">đang kiểm…</p>
      ) : tt.ketNoi === null ? (
        <>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Một lần duy nhất: tạo <em>Personal access token</em> trên GitHub (Settings → Developer settings →
            Fine-grained tokens; quyền <span className="metric">Contents: Read and write</span> và{" "}
            <span className="metric">Administration: Read and write</span> cho “All repositories”) rồi dán vào đây. Token
            được mã hoá, không hiện lại.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              autoComplete="off"
              className="max-w-xs"
              aria-label="Token GitHub"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void luuToken()} disabled={dangLuu || token.trim().length < 20}>
              {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Lưu token
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            GitHub: <strong className="text-foreground">{tt.ketNoi.login}</strong>{" "}
            <button type="button" onClick={() => void goToken()} className="underline underline-offset-2">
              gỡ token
            </button>
            {tt.kho && (
              <>
                {" "}· Kho:{" "}
                <a href={tt.kho.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {tt.kho.owner}/{tt.kho.repo}
                </a>{" "}
                — đẩy lần cuối {new Date(tt.kho.dayLuc).toLocaleString("vi-VN")} ({tt.kho.soTep} tệp)
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => void day()} disabled={!soHopLe || dangDay}>
              {dangDay ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {tt.kho ? "Đẩy bản mới lên GitHub" : "Đẩy lên GitHub"}
            </Button>
            {!soHopLe && <span className="text-[11px] text-muted-foreground">Điền số điện thoại rồi nút sẽ bật.</span>}
          </div>
          {ketQua && (
            <div role="status" className="rounded-md border p-2.5 text-[11px] leading-relaxed" style={{ borderColor: "color-mix(in oklab, var(--success, #10b981) 40%, transparent)", background: "color-mix(in oklab, var(--success, #10b981) 10%, transparent)" }}>
              <p className="font-medium text-foreground">
                Đã đẩy lên{" "}
                <a href={ketQua.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {ketQua.url.replace("https://github.com/", "")}
                </a>
                .
              </p>
              {ketQua.lanDau ? (
                <ol className="mt-1 list-decimal pl-4">
                  <li>Mở dash.cloudflare.com → <strong>Workers &amp; Pages</strong> → Create → Workers → <strong>Import a repository</strong> → chọn kho trên (lần đầu Cloudflare xin quyền đọc GitHub — cho phép).</li>
                  <li>Build command: <span className="metric">npm run dung-cloudflare</span> · Deploy command: <span className="metric">npm run day-cloudflare</span> → <strong>Save and Deploy</strong>.</li>
                  <li>Xong, Cloudflare cho địa chỉ <span className="metric">*.workers.dev</span>; gắn tên miền ở Settings → Domains &amp; Routes. Từ giờ mỗi lần bấm “Đẩy bản mới” là Cloudflare tự dựng lại.</li>
                </ol>
              ) : (
                <p className="mt-1">Cloudflare sẽ tự dựng lại trong vài phút (xem tiến trình ở Workers &amp; Pages → website này → Deployments).</p>
              )}
              {ketQua.soLoiNang > 0 && (
                <p className="mt-1 text-destructive">Lưu ý: tự soát thấy {ketQua.soLoiNang} lỗi nặng trong bản dựng — xem phần soát phía trên.</p>
              )}
            </div>
          )}
        </>
      )}
      {loi && (
        <p role="alert" className="text-[11px] text-destructive">
          {loi}
        </p>
      )}
    </div>
  );
}

export function DungWebCard({ projectId }: { projectId: string }) {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [dienThoai, setDienThoai] = useState("");
  const [zalo, setZalo] = useState("");
  const [anhMoDau, setAnhMoDau] = useState("");
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
        if (huy) return;
        setTt(d ?? { coBanDung: false, lyDo: "Không đọc được trạng thái." });
        // Số đã dùng lần trước: điền sẵn nếu ô còn trống — không ghi đè thứ
        // người dùng đang gõ.
        if (d?.daLuu) {
          setDienThoai((c) => c || d.daLuu!.dienThoai);
          setZalo((c) => c || d.daLuu!.zalo);
          setAnhMoDau((c) => c || d.daLuu!.anhMoDau || "");
        }
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
      const q = new URLSearchParams({ tai: "1", dienThoai: dienThoai.trim(), zalo: zalo.trim(), anhMoDau });
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
        body: JSON.stringify({ dienThoai: dienThoai.trim(), zalo: zalo.trim(), anhMoDau, dungLai }),
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
            Đưa lên mạng không cần máy: đẩy lên GitHub, Cloudflare tự dựng (miễn phí, cho phép thương mại) — khung
            bên dưới. Hoặc tải .zip: chạy <code className="metric">npm install</code> và{" "}
            <code className="metric">npm run dev</code> là xem được trên máy; các cách khác trong
            <code className="metric"> docs/dua-web-khach-len-mang.md</code>.
          </p>

          <ul className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            {tt.trang?.map((t) => (
              <li key={t.duong}>
                <span className="metric">{t.duong}</span> — {t.tieuDe} ({t.soKhoi} khối)
              </li>
            ))}
          </ul>

          {tt.thieuTenMien && (
            <p className="rounded-md border p-2.5 text-xs leading-relaxed" style={{ borderColor: "color-mix(in oklab, var(--warning) 40%, transparent)", background: "color-mix(in oklab, var(--warning) 10%, transparent)" }}>
              <strong className="text-foreground">Chưa có tên miền.</strong> Điền “URL website” (tên miền dự kiến cũng
              được) ở phần thông tin website cuối trang, rồi tải lại — sitemap, canonical và thẻ chia sẻ Zalo/Facebook
              dùng địa chỉ đó. Chưa điền thì chúng trỏ vào example.com.
            </p>
          )}
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
            {(tt.anhDrive?.length ?? 0) > 0 && (
              <FormField
                label="Ảnh mở đầu (tấm khách nhìn đầu tiên)"
                htmlFor={`dw-anh-${projectId}`}
                description="Chọn trong thư mục Drive đã nối. Để trống thì lấy tấm đầu ở thư mục gốc."
              >
                <select
                  id={`dw-anh-${projectId}`}
                  value={anhMoDau}
                  onChange={(e) => setAnhMoDau(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm"
                >
                  <option value="">Máy tự chọn (tấm đầu ở thư mục gốc)</option>
                  {tt.anhDrive!.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.thuMucCon ? `${a.thuMucCon}/` : ""}
                      {a.ten}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
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
            {tt.xemTruocDuoc === false ? (
              <span className="text-[11px] text-muted-foreground">
                Xem thử trên máy chỉ có khi Antigravity chạy trên máy bạn — bản này chạy trên Vercel. Muốn xem
                bản thật: Đẩy lên GitHub ở khung dưới.
              </span>
            ) : xemTruoc ? (
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

          <DayGitHub projectId={projectId} dienThoai={dienThoai} zalo={zalo} anhMoDau={anhMoDau} soHopLe={soHopLe} />
        </>
      )}
    </section>
  );
}
