"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TrangThai =
  | { daLap: false }
  | {
      daLap: true;
      spreadsheetUrl: string;
      lapLuc: string;
      webhookUrl: string;
      lanNhanCuoi?: string | null;
      ketQuaCuoi?: string | null;
    };

/**
 * Dịch dấu vết lượt nhận sang câu người đọc hành động được.
 *
 * "Chưa nhận lượt nào" là câu quan trọng nhất: nó nói lỗi nằm ở phía website /
 * VPS (chưa sửa `.env`, chưa chạy lại `trien-khai.sh`, hoặc dán địa chỉ sai) —
 * không phải ở Antigravity hay Google.
 */
function dichDauVet(t: Extract<TrangThai, { daLap: true }>): { mau: string; cau: string } {
  if (!t.lanNhanCuoi) {
    return {
      mau: "var(--warning)",
      cau: "Chưa nhận lượt nào từ website. Website chưa từng gọi tới đây — kiểm hai dòng LEAD_WEBHOOK_URL / LEAD_WEBHOOK_TOKEN trong .env trên VPS (địa chỉ phải bắt đầu bằng https://) và đã chạy ./trien-khai.sh sau khi sửa chưa. Khách đã để lại số trong lúc này KHÔNG mất: họ nằm trên VPS và sẽ tự vào bảng ở lượt gửi thành công đầu tiên.",
    };
  }
  const luc = new Date(t.lanNhanCuoi).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (t.ketQuaCuoi === "ok") return { mau: "var(--success)", cau: `Lượt nhận gần nhất ${luc}: đã ghi vào bảng.` };
  if (t.ketQuaCuoi === "sai-token") {
    return {
      mau: "var(--destructive)",
      cau: `Lượt gần nhất ${luc}: website CÓ gọi tới nhưng SAI TOKEN. Dòng LEAD_WEBHOOK_TOKEN trên VPS không khớp — thường do chép thiếu hoặc dính dấu cách. Lập bảng mới để lấy token mới rồi dán lại cả hai dòng.`,
    };
  }
  return {
    mau: "var(--destructive)",
    cau: `Lượt gần nhất ${luc}: website gọi tới đúng, nhưng Google từ chối — ${(t.ketQuaCuoi ?? "").replace(/^loi:\s*/, "")}`,
  };
}

interface VuaLap {
  spreadsheetUrl: string;
  webhookUrl: string;
  token: string;
}

/**
 * Thẻ "Khách liên hệ → Google Sheets" trên trang dự án.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TOKEN CHỈ HIỆN ĐÚNG MỘT LẦN — ngay sau khi lập.
 *
 * Kho chỉ giữ bản mã hoá, không đọc ngược ra được. Nên màn hình này phải làm
 * hai việc cùng lúc lúc lập xong: đưa cả hai giá trị ra để dán, và nói rõ rằng
 * đóng trang là mất. Người dùng tải lại trang rồi tìm token là chuyện chắc chắn
 * xảy ra nếu không nói trước.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function LeadSheetCard({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const [trangThai, setTrangThai] = useState<TrangThai | null>(null);
  const [vuaLap, setVuaLap] = useState<VuaLap | null>(null);
  const [dangLap, setDangLap] = useState(false);
  const [loi, setLoi] = useState<string>();

  useEffect(() => {
    let huy = false;
    fetch(`/api/v1/projects/${projectId}/lead-sheet`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { daLap: false }))
      .then((d: TrangThai) => {
        if (!huy) setTrangThai(d);
      })
      .catch(() => {
        if (!huy) setTrangThai({ daLap: false });
      });
    return () => {
      huy = true;
    };
  }, [projectId]);

  async function lap(): Promise<void> {
    if (
      trangThai?.daLap &&
      !window.confirm(
        "Lập lại sẽ tạo BẢNG MỚI và TOKEN MỚI. Bảng cũ vẫn còn trên Drive, nhưng website phải đổi sang token mới. Tiếp tục?",
      )
    ) {
      return;
    }
    setDangLap(true);
    setLoi(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/lead-sheet`, {
        method: "POST",
      });
      const d = (await r.json().catch(() => ({}))) as
        | VuaLap
        | { error?: { message?: string } };
      if (!r.ok || !("token" in d)) {
        throw new Error(
          ("error" in d && d.error?.message) || "Không lập được bảng.",
        );
      }
      setVuaLap(d);
      setTrangThai({
        daLap: true,
        spreadsheetUrl: d.spreadsheetUrl,
        lapLuc: new Date().toISOString(),
        webhookUrl: d.webhookUrl,
      });
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lập được bảng.");
    } finally {
      setDangLap(false);
    }
  }

  return (
    <section className="glass flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Table2 className="h-4 w-4 text-seo" /> Khách liên hệ → Google Sheets
        </h2>
        {trangThai === null ? (
          <span className="text-xs text-muted-foreground">đang kiểm…</span>
        ) : trangThai.daLap ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
            Đã lập
          </span>
        ) : (
          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
            Chưa lập
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Mỗi lượt khách để lại số trên website thành một dòng mới trong bảng của
        bạn — không phải mở tệp trên máy chủ để xem. Bảng do Antigravity tạo bằng
        tài khoản Google đã kết nối; website gửi tới đây bằng một token riêng.
      </p>

      {trangThai?.daLap && !vuaLap && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <a
              href={trangThai.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground underline decoration-dotted underline-offset-2"
            >
              Mở bảng <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {/* ĐỊA CHỈ ĐẦY ĐỦ, có nút chép. Bản trước hiện `/api/v1/lien-he/…`
              — dán cái đó vào `.env` là website không gọi được mà khách vẫn
              thấy "Đã nhận" (rơi về tệp trên VPS). */}
          <DongChep
            nhan="LEAD_WEBHOOK_URL"
            giaTri={`${typeof window === "undefined" ? "" : window.location.origin}${trangThai.webhookUrl}`}
          />
          <p className="text-[11px] text-muted-foreground">
            Token không hiện lại được (chỉ hiện một lần lúc lập). Mất token thì
            bấm &quot;Lập bảng mới&quot;.
          </p>
          {(() => {
            const d = dichDauVet(trangThai);
            return (
              <p
                className="rounded-md border p-2.5 text-xs leading-relaxed"
                style={{
                  borderColor: `color-mix(in oklab, ${d.mau} 40%, transparent)`,
                  background: `color-mix(in oklab, ${d.mau} 10%, transparent)`,
                  color: "var(--foreground)",
                }}
              >
                {d.cau}
              </p>
            );
          })()}
          <GuiThu projectId={projectId} />
        </div>
      )}

      {vuaLap && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-xs font-medium text-foreground">
            Dán hai dòng này vào <code className="metric">.env</code> của website
            rồi deploy. Token <strong>chỉ hiện một lần</strong> — đóng trang là
            mất, muốn lấy lại phải lập bảng mới.
          </p>
          <DongChep nhan="LEAD_WEBHOOK_URL" giaTri={vuaLap.webhookUrl} />
          <DongChep nhan="LEAD_WEBHOOK_TOKEN" giaTri={vuaLap.token} />
          <a
            href={vuaLap.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-foreground underline decoration-dotted underline-offset-2"
          >
            Mở bảng vừa tạo <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {loi && (
        <p role="alert" className="text-xs text-destructive">
          {loi}
        </p>
      )}

      {canEdit && (
        <div>
          <Button type="button" size="sm" onClick={lap} disabled={dangLap || trangThai === null}>
            {dangLap ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Table2 className="h-3.5 w-3.5" />}
            {trangThai?.daLap ? "Lập bảng mới" : "Lập bảng"}
          </Button>
        </div>
      )}
    </section>
  );
}

function DongChep({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  const [daChep, setDaChep] = useState(false);
  async function chep(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${nhan}=${giaTri}`);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 1500);
    } catch {
      // Không có clipboard (iframe, HTTP) — người dùng vẫn bôi đen chép được.
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="metric min-w-0 flex-1 truncate rounded bg-accent/40 px-2 py-1 text-[11px] text-foreground">
        {nhan}={giaTri}
      </code>
      <button
        type="button"
        onClick={chep}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:text-foreground"
        aria-label={`Chép ${nhan}`}
      >
        {daChep ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {daChep ? "đã chép" : "chép"}
      </button>
    </div>
  );
}

/**
 * Nút "Gửi thử một dòng" — kiểm riêng đoạn Antigravity → Google, bỏ qua website.
 *
 * Dòng thử vào bảng mà khách thật không vào → lỗi ở website/VPS. Dòng thử cũng
 * không vào → câu báo lỗi nói luôn nguyên nhân phía Google.
 */
function GuiThu({ projectId }: { projectId: string }) {
  const [dang, setDang] = useState(false);
  const [kq, setKq] = useState<{ ok: boolean; cau: string } | null>(null);
  async function gui(): Promise<void> {
    setDang(true);
    setKq(null);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/lead-sheet/thu`, { method: "POST" });
      if (r.ok) {
        setKq({ ok: true, cau: "Đã ghi một dòng thử vào bảng — mở bảng để xem, rồi xoá dòng đó đi." });
      } else {
        const d = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
        setKq({ ok: false, cau: d.error?.message ?? "Không ghi được dòng thử." });
      }
    } catch {
      setKq({ ok: false, cau: "Không gọi được Antigravity." });
    } finally {
      setDang(false);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button type="button" variant="outline" size="sm" onClick={gui} disabled={dang}>
          {dang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Table2 className="h-3.5 w-3.5" />}
          Gửi thử một dòng vào bảng
        </Button>
      </div>
      {kq && (
        <p role={kq.ok ? "status" : "alert"} className={`text-xs ${kq.ok ? "text-emerald-400" : "text-destructive"}`}>
          {kq.cau}
        </p>
      )}
    </div>
  );
}
