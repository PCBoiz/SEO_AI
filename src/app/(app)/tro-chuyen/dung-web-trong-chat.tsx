"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Globe2, Loader2, PencilLine, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XemTruocWeb, type TrangXemTruoc } from "@/components/dung-web/xem-truoc-web";
import { suyBoKhoi } from "@/domain/dung-web/bo-khoi";
import { phamViChay, type HanhDongDungWeb } from "@/domain/tro-chuyen/hanh-dong";
import { taoVaChoJob } from "@/lib/modules/chay-job.client";

/**
 * THẺ DỰNG WEB TRONG TRÒ CHUYỆN — trợ lý ra khối lệnh, thẻ này chạy.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * Chạy Ở TRÌNH DUYỆT, y như màn Quy trình: tạo job từng bước, chờ, nối bước
 * sau vào bước trước bằng `upstreamJobIds`. Không chạy trong tuyến gửi tin —
 * bốn lượt gọi model có thể mất vài phút, quá trần một hàm Vercel, và người
 * dùng phải thấy từng bước đang tới đâu.
 *
 * TỰ CHẠY chỉ với tin VỪA NHẬN (`tuChay`): người dùng vừa bảo trợ lý dựng,
 * trợ lý vừa nhận lời — không bắt bấm thêm. Tin cũ mở lại KHÔNG tự chạy (mỗi
 * lần chạy là bốn lượt gọi tính vào tài khoản người dùng); thẻ hiện bản đã có
 * và nút "Dựng lại".
 *
 * Chưa gắn dự án: thẻ hỏi chọn dự án có sẵn hoặc tạo dự án mới tên
 * `tenWebsite` (cần một tên miền dự kiến — cùng luật với màn Tạo dự án), rồi
 * gắn vào cuộc để các lượt sau và thẻ mở lại đều tìm được bản dựng.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface BuocLuong {
  key: string;
  title: string;
  fieldKeys: string[];
}

const KHOA_KIEN_TRUC = "RIS_WEB_KIEN_TRUC";
const KHOA_VIET_CHU = "RIS_WEB_VIET_CHU";

type TrangThaiBuoc = "cho" | "chay" | "xong" | "hong";
interface Buoc {
  key: string;
  title: string;
  trangThai: TrangThaiBuoc;
  jobId?: string;
  loi?: string;
}

interface TrangThaiWeb {
  coBanDung: boolean;
  trang?: Array<{ duong: string; tieuDe: string }>;
  daLuu?: { dienThoai: string } | null;
}

/** Đầu vào một bước, chỉ những ô bước đó có. `nganh` hai nghĩa: chữ (Ý định) và bộ khối (Kiến trúc). */
function dauVaoBuoc(
  buoc: BuocLuong,
  h: HanhDongDungWeb,
  goc: { projectId: string; ai: { provider: string; model: string }; upstreamJobIds: string[] },
): Record<string, unknown> {
  const input: Record<string, unknown> = { projectId: goc.projectId, idempotencyKey: crypto.randomUUID(), ai: goc.ai };
  if (goc.upstreamJobIds.length > 0) input.upstreamJobIds = [...goc.upstreamJobIds];
  const gia: Record<string, string | undefined> = {
    siteName: h.tenWebsite,
    audienceBrief: h.moTa,
    nganh: buoc.key === KHOA_KIEN_TRUC ? suyBoKhoi(h.nganh, h.moTa, h.tenWebsite) : h.nganh,
    goiY: h.goiY,
    mauThuongHieu: h.mauThuongHieu,
    suThat: h.suThat,
    yeuCauSua: h.yeuCauSua,
  };
  for (const k of buoc.fieldKeys) {
    const v = gia[k];
    if (v) input[k] = v;
  }
  return input;
}

export function DungWebTrongChat({
  hanhDong,
  projectId,
  duAn,
  ai,
  luong,
  tuChay,
  coTheGui,
  onGanDuAn,
}: {
  hanhDong: HanhDongDungWeb;
  projectId: string | null;
  duAn: ReadonlyArray<{ id: string; ten: string }>;
  /** Nhà cung cấp + model của chính lượt trả lời — dựng bằng đúng khoá đó. */
  ai: { provider: string; model: string } | null;
  luong: readonly BuocLuong[];
  tuChay: boolean;
  coTheGui: boolean;
  onGanDuAn: (projectId: string) => Promise<boolean>;
}) {
  const [duAnId, setDuAnId] = useState<string | null>(projectId);
  const [chonDuAn, setChonDuAn] = useState(duAn[0]?.id ?? "");
  const [tenMien, setTenMien] = useState("");
  const [dangTao, setDangTao] = useState(false);
  const [tt, setTt] = useState<TrangThaiWeb | null>(null);
  const [buoc, setBuoc] = useState<Buoc[]>([]);
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string>();
  const [phienBan, setPhienBan] = useState(0);
  /** Đã tự chạy cho tin này (ref để chặn chạy hai lần; state để vẽ nút). */
  const daTuChayRef = useRef(false);
  const [daTuChay, setDaTuChay] = useState(false);

  /** Trạng thái bản dựng của dự án — hàm thuần mạng, KHÔNG đặt state (nơi gọi tự đặt). */
  async function docTrangThai(id: string): Promise<TrangThaiWeb | null> {
    try {
      const r = await fetch(`/api/v1/projects/${encodeURIComponent(id)}/dung-web`, { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as TrangThaiWeb;
    } catch {
      return null;
    }
  }

  async function chay(tuBuoc = 0): Promise<void> {
    if (!duAnId || !ai || dangChay) return;
    setDangChay(true);
    setLoi(undefined);
    const hienTai = tt ?? (await docTrangThai(duAnId));
    if (hienTai && !tt) setTt(hienTai);
    const phamVi = phamViChay(hanhDong, Boolean(hienTai?.coBanDung));
    const cacBuoc = phamVi === "chu" ? luong.filter((b) => b.key === KHOA_VIET_CHU) : [...luong];
    if (cacBuoc.length === 0) {
      setLoi("Không tìm thấy luồng dựng website — tải lại trang.");
      setDangChay(false);
      return;
    }
    // Chạy tiếp: giữ các bước đã xong của lượt trước (và job của chúng làm ngữ cảnh).
    const giu = tuBuoc > 0 ? buoc.slice(0, tuBuoc) : [];
    if (giu.some((b) => b.trangThai !== "xong" || !b.jobId)) tuBuoc = 0;
    const ban: Buoc[] = cacBuoc.map((b, i) => (i < tuBuoc ? buoc[i]! : { key: b.key, title: b.title, trangThai: "cho" }));
    setBuoc(ban);
    const daXong = ban.slice(0, tuBuoc).map((b) => b.jobId!);
    try {
      for (let i = tuBuoc; i < cacBuoc.length; i++) {
        const b = cacBuoc[i]!;
        setBuoc((c) => c.map((x, j) => (j === i ? { ...x, trangThai: "chay", loi: undefined } : x)));
        const job = await taoVaChoJob(b.key, dauVaoBuoc(b, hanhDong, { projectId: duAnId, ai, upstreamJobIds: daXong }), {
          tenBuoc: b.title,
          onJobId: (id) => setBuoc((c) => c.map((x, j) => (j === i ? { ...x, jobId: id } : x))),
        });
        if (job.status !== "succeeded") {
          const ly = job.errorMessage ?? "Bước không hoàn thành.";
          setBuoc((c) => c.map((x, j) => (j === i ? { ...x, trangThai: "hong", loi: ly } : x)));
          setLoi(`Dừng ở bước "${b.title}": ${ly}`);
          return;
        }
        daXong.push(job.id);
        setBuoc((c) => c.map((x, j) => (j === i ? { ...x, trangThai: "xong", jobId: job.id } : x)));
      }
      setTt(await docTrangThai(duAnId));
      setPhienBan((c) => c + 1);
    } catch (e) {
      const ly = e instanceof Error ? e.message : "Có lỗi khi dựng.";
      setBuoc((c) => c.map((x) => (x.trangThai === "chay" ? { ...x, trangThai: "hong", loi: ly } : x)));
      setLoi(ly);
    } finally {
      setDangChay(false);
    }
  }

  // Mở thẻ: đọc trạng thái dự án; tin vừa nhận thì chạy luôn (một lần — kể cả
  // StrictMode gọi effect hai lần).
  useEffect(() => {
    if (!duAnId) return;
    let huy = false;
    void docTrangThai(duAnId).then((d) => {
      if (huy) return;
      setTt(d);
      if (!tuChay || !coTheGui || daTuChayRef.current) return;
      daTuChayRef.current = true;
      setDaTuChay(true);
      void chay();
    });
    return () => {
      huy = true;
    };
    // Chỉ chạy khi có dự án lần đầu; `chay` đổi mỗi lượt vẽ nhưng không cần chạy lại effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duAnId]);

  async function ganDuAnCoSan(): Promise<void> {
    if (!chonDuAn) return;
    setLoi(undefined);
    if (await onGanDuAn(chonDuAn)) setDuAnId(chonDuAn);
    else setLoi("Không gắn được dự án vào cuộc trò chuyện.");
  }

  async function taoDuAnMoi(): Promise<void> {
    setLoi(undefined);
    setDangTao(true);
    try {
      const r = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hanhDong.tenWebsite,
          website: tenMien.trim(),
          industry: hanhDong.nganh ?? "",
          language: "vi",
          tone: "Rõ ràng, điềm đạm",
        }),
      });
      const d = (await r.json().catch(() => ({}))) as { project?: { id: string }; error?: { message?: string; details?: { issues?: Array<{ message: string }> } } };
      if (!r.ok || !d.project) throw new Error(d.error?.details?.issues?.[0]?.message ?? d.error?.message ?? `Máy chủ trả HTTP ${r.status}`);
      if (!(await onGanDuAn(d.project.id))) throw new Error("Đã tạo dự án nhưng không gắn được vào cuộc trò chuyện — chọn lại ở danh sách.");
      setDuAnId(d.project.id);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tạo được dự án.");
    } finally {
      setDangTao(false);
    }
  }

  const trang: TrangXemTruoc[] = tt?.trang ?? [];
  const coBan = Boolean(tt?.coBanDung) && trang.length > 0;
  const buocHong = buoc.findIndex((b) => b.trangThai === "hong");

  return (
    <div data-testid="dung-web-trong-chat" className="mt-2 flex w-full flex-col gap-3 rounded-2xl border border-border bg-background/60 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <Globe2 className="h-4 w-4 text-primary" /> Dựng website «{hanhDong.tenWebsite}»
        {hanhDong.yeuCauSua ? <span className="font-normal text-muted-foreground">— sửa: {hanhDong.yeuCauSua}</span> : null}
      </p>

      {!duAnId ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Cuộc trò chuyện này chưa gắn dự án. Website dựng ra nằm trong một dự án — chọn dự án có sẵn, hoặc tạo dự án mới.
          </p>
          {duAn.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={chonDuAn}
                onChange={(e) => setChonDuAn(e.target.value)}
                aria-label="Dự án có sẵn"
                className="h-10 max-w-full rounded-md border border-border bg-input px-2 text-sm text-foreground"
              >
                {duAn.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ten}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={() => void ganDuAnCoSan()} disabled={!coTheGui || dangTao}>
                Dùng dự án này
              </Button>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Tên miền dự kiến của «{hanhDong.tenWebsite}» (sửa sau được)
              <input
                type="url"
                value={tenMien}
                onChange={(e) => setTenMien(e.target.value)}
                placeholder="https://ten-san.vn"
                className="h-10 rounded-md border border-border bg-input px-3 text-sm text-foreground"
              />
            </label>
            <Button type="button" onClick={() => void taoDuAnMoi()} disabled={!coTheGui || dangTao || !/^https?:\/\/\S+\.\S+/.test(tenMien.trim())}>
              {dangTao ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Tạo dự án và dựng
            </Button>
          </div>
        </div>
      ) : (
        <>
          {buoc.length > 0 && (
            <ol className="flex flex-col gap-1 text-xs">
              {buoc.map((b, i) => (
                <li key={b.key} className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 shrink-0">
                    {b.trangThai === "chay" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : b.trangThai === "xong" ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : b.trangThai === "hong" ? (
                      <CircleAlert className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <span className="block h-3.5 w-3.5 rounded-full border border-border" />
                    )}
                  </span>
                  <span className={b.trangThai === "cho" ? "text-muted-foreground" : "text-foreground"}>
                    Bước {i + 1}/{buoc.length} — {b.title}
                    {b.loi ? <span className="block text-destructive">{b.loi}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {loi && (
            <p role="alert" className="text-xs text-destructive">
              {loi}
            </p>
          )}

          {coBan && !dangChay && (
            <>
              <XemTruocWeb
                projectId={duAnId}
                trang={trang}
                phienBan={phienBan}
                ghiChu={tt?.daLuu ? undefined : "Số điện thoại trên trang là số mẫu — điền số thật ở bước «Đưa lên mạng»."}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/projects/${encodeURIComponent(duAnId)}#dung-web`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" /> Ưng ý — đưa lên mạng
                </Link>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PencilLine className="h-3.5 w-3.5" /> Cần sửa? Gõ điều muốn đổi vào ô chat — trợ lý dựng lại.
                </span>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!dangChay && buocHong >= 0 && (
              <Button type="button" size="sm" onClick={() => void chay(buocHong)} disabled={!coTheGui || !ai}>
                <RotateCw className="h-3.5 w-3.5" /> Chạy tiếp từ bước hỏng
              </Button>
            )}
            {!dangChay && buoc.length === 0 && !daTuChay && (
              <Button type="button" size="sm" variant={coBan ? "outline" : "default"} onClick={() => void chay()} disabled={!coTheGui || !ai}>
                <Play className="h-3.5 w-3.5" /> {coBan ? "Dựng lại theo yêu cầu này" : "Dựng ngay"}
              </Button>
            )}
            {!ai && <span className="text-xs text-muted-foreground">Tin này không ghi nhà cung cấp AI — gửi lại yêu cầu để dựng.</span>}
          </div>
        </>
      )}
      <p className="text-[11px] text-muted-foreground">
        Mỗi lần dựng là {luong.length} lượt gọi AI bằng khoá của bạn (chỉ sửa chữ: 1 lượt).
      </p>
    </div>
  );
}
