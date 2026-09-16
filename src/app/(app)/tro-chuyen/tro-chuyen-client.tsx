"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { KeyRound, Loader2, MessagesSquare, Plus, RotateCw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GIOI_HAN_TRO_CHUYEN } from "@/domain/tro-chuyen/tro-chuyen";
import { cauTongDungLuong, dongDungLuong } from "@/domain/tro-chuyen/dung-luong";
import type { TinNhanXem, TroChuyenXem } from "@/domain/tro-chuyen/xem";

interface KhoaXem {
  provider: string;
  model: string;
}

interface DuAnXem {
  id: string;
  ten: string;
}

const TEN_NHA_CUNG_CAP: Record<string, string> = {
  deepseek: "DeepSeek",
  anthropic: "Claude",
  openai: "OpenAI",
  gemini: "Gemini",
};

/** Gợi ý mở đầu — ví dụ theo ngành của chủ dự án (bất động sản). */
const GOI_Y = [
  "Tôi muốn làm website cho sàn môi giới bất động sản — nên có những trang nào, mỗi trang nói gì?",
  "Viết giúp đoạn giới thiệu 3 câu cho trang chủ dự án của tôi.",
  "Gợi ý 5 chủ đề bài viết để khách tìm thấy dự án trên Google.",
];

type KetQuaGoi<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function goi<T>(url: string, init?: RequestInit): Promise<KetQuaGoi<T>> {
  try {
    const r = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    const body = (await r.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
    if (!r.ok) {
      return { ok: false, code: body.error?.code ?? `HTTP_${r.status}`, message: body.error?.message ?? "Có lỗi, thử lại sau." };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, code: "MANG", message: "Không kết nối được máy chủ — kiểm tra mạng rồi thử lại." };
  }
}

/**
 * Đường dẫn trong app mà trợ lý nhắc tới ("/pipelines?luong=website_draft")
 * thành link bấm được. Không bắt phần đuôi của một URL đầy đủ
 * ("https://site.vn/projects") — lookbehind loại trường hợp đó.
 */
const DUONG_TRONG_APP = /(?<![\w.:/])(\/(?:pipelines|bat-dau|projects|analytics|ai-keys|tro-chuyen)(?:\?[\w=&-]+)?)/g;

function ChuCoLienKet({ chu }: { chu: string }): ReactNode {
  return chu.split(DUONG_TRONG_APP).map((phan, i) =>
    i % 2 === 1 ? (
      <Link key={i} href={phan} className="underline underline-offset-4">
        {phan}
      </Link>
    ) : (
      <Fragment key={i}>{phan}</Fragment>
    ),
  );
}

export function TroChuyenClient({
  cuocBanDau,
  khoa,
  duAn,
  coTheGui,
}: {
  cuocBanDau: TroChuyenXem[];
  khoa: KhoaXem[];
  duAn: DuAnXem[];
  coTheGui: boolean;
}) {
  const [cuoc, datCuoc] = useState<TroChuyenXem[]>(cuocBanDau);
  const [dangMo, datDangMo] = useState<string | null>(null);
  const [tin, datTin] = useState<TinNhanXem[]>([]);
  const [dangTaiTin, datDangTaiTin] = useState(false);
  const [noiDung, datNoiDung] = useState("");
  const [dangGui, datDangGui] = useState(false);
  const [loi, datLoi] = useState<{ message: string; guiLai: boolean } | null>(null);
  const [provider, datProvider] = useState("");
  const [duAnMoi, datDuAnMoi] = useState("");
  const cuoiRef = useRef<HTMLDivElement>(null);
  // Đếm tin tạm bằng ref: id phải khác nhau nhưng KHÔNG được gọi hàm không
  // thuần (Date.now/Math.random) trong thân component — quy tắc React.
  const demTamRef = useRef(0);

  const khongCoKhoa = khoa.length === 0;
  const tenDuAn = (id: string | null) => (id ? (duAn.find((d) => d.id === id)?.ten ?? null) : null);
  const cuocDangMo = cuoc.find((c) => c.id === dangMo) ?? null;

  useEffect(() => {
    cuoiRef.current?.scrollIntoView({ block: "end" });
  }, [tin, dangGui]);

  async function lamMoiDanhSach(): Promise<void> {
    const kq = await goi<{ troChuyen: TroChuyenXem[] }>("/api/v1/tro-chuyen");
    if (kq.ok) datCuoc(kq.data.troChuyen);
  }

  /**
   * Lấy lại tin từ máy chủ, GIỮ NGUYÊN câu lỗi đang hiện.
   *
   * Dùng sau một lượt lỗi: máy chủ đã lưu tin người dùng, nhưng trên màn nó mới
   * là tin tạm (`tam-N`). Lượt gửi thành công sau đó lọc bỏ mọi tin tạm — không
   * lấy lại thì tin đã lưu biến mất khỏi màn tuy vẫn còn trong cơ sở dữ liệu.
   */
  async function taiLaiTin(id: string): Promise<void> {
    const kq = await goi<{ tinNhan: TinNhanXem[] }>(`/api/v1/tro-chuyen/${id}`);
    if (kq.ok) datTin(kq.data.tinNhan);
  }

  async function moCuoc(id: string): Promise<void> {
    datDangMo(id);
    datLoi(null);
    datTin([]);
    datDangTaiTin(true);
    const kq = await goi<{ tinNhan: TinNhanXem[] }>(`/api/v1/tro-chuyen/${id}`);
    datDangTaiTin(false);
    if (!kq.ok) {
      datLoi({ message: kq.message, guiLai: false });
      return;
    }
    datTin(kq.data.tinNhan);
    if (kq.data.tinNhan[kq.data.tinNhan.length - 1]?.vai === "nguoi-dung") {
      datLoi({ message: "Tin cuối chưa có câu trả lời (lượt trước bị lỗi).", guiLai: true });
    }
  }

  function cuocMoi(): void {
    datDangMo(null);
    datTin([]);
    datLoi(null);
  }

  async function gui(tuyChon: { guiLai?: boolean; chu?: string } = {}): Promise<void> {
    if (dangGui) return;
    const chu = (tuyChon.chu ?? noiDung).trim();
    if (!tuyChon.guiLai && !chu) return;
    datDangGui(true);
    datLoi(null);

    let id = dangMo;
    let vuaTao = false;
    if (!id) {
      // Cuộc chỉ được tạo khi có tin đầu — không để lại cuộc rỗng.
      const tao = await goi<{ troChuyen: TroChuyenXem }>("/api/v1/tro-chuyen", {
        method: "POST",
        body: JSON.stringify({ projectId: duAnMoi || null }),
      });
      if (!tao.ok) {
        datLoi({ message: tao.message, guiLai: false });
        datDangGui(false);
        return;
      }
      id = tao.data.troChuyen.id;
      vuaTao = true;
      datCuoc((ds) => [tao.data.troChuyen, ...ds]);
      datDangMo(id);
    }

    const tam: TinNhanXem | null = tuyChon.guiLai
      ? null
      : {
          id: `tam-${(demTamRef.current += 1)}`,
          vai: "nguoi-dung",
          noiDung: chu,
          model: null,
          createdAt: "",
          // Tin của người dùng không có lượng dùng — chỉ lượt trả lời mới tốn token.
          provider: null,
          inputTokens: null,
          outputTokens: null,
          durationMs: null,
        };
    if (tam) {
      datTin((ds) => [...ds, tam]);
      datNoiDung("");
    }

    const kq = await goi<{ troChuyen: TroChuyenXem; tinNguoiDung: TinNhanXem; tinTroLy: TinNhanXem }>(
      `/api/v1/tro-chuyen/${id}/tin-nhan`,
      {
        method: "POST",
        body: JSON.stringify({ noiDung: chu, provider: provider || null, guiLai: tuyChon.guiLai === true }),
      },
    );
    if (kq.ok) {
      datTin((ds) => [
        ...ds.filter((t) => !t.id.startsWith("tam-") && t.id !== kq.data.tinNguoiDung.id),
        kq.data.tinNguoiDung,
        kq.data.tinTroLy,
      ]);
      datCuoc((ds) => [kq.data.troChuyen, ...ds.filter((c) => c.id !== kq.data.troChuyen.id)]);
    } else if (kq.code === "AI_CHAT_FAILED") {
      // Máy chủ ĐÃ lưu tin — giữ trên màn, cho bấm Gửi lại. Lấy lại tin để tin
      // tạm được thay bằng bản đã lưu (id thật), nếu không lượt sau sẽ nuốt nó.
      datLoi({ message: kq.message, guiLai: true });
      await taiLaiTin(id);
      void lamMoiDanhSach();
    } else {
      if (tam) {
        datTin((ds) => ds.filter((t) => t.id !== tam.id));
        datNoiDung(chu);
      }
      datLoi({ message: kq.message, guiLai: false });
      // Cuộc vừa tạo cho chính lượt này mà tin không vào được: dọn đi, đừng để
      // lại một cuộc rỗng tên "Cuộc trò chuyện mới" trong danh sách.
      if (vuaTao) {
        datCuoc((ds) => ds.filter((c) => c.id !== id));
        datDangMo(null);
        void goi(`/api/v1/tro-chuyen/${id}`, { method: "DELETE" });
      }
    }
    datDangGui(false);
  }

  async function xoaCuoc(c: TroChuyenXem): Promise<void> {
    if (!window.confirm(`Xoá cuộc trò chuyện "${c.tieuDe}"? Không lấy lại được.`)) return;
    const kq = await goi<{ daXoa: boolean }>(`/api/v1/tro-chuyen/${c.id}`, { method: "DELETE" });
    if (!kq.ok) {
      datLoi({ message: kq.message, guiLai: false });
      return;
    }
    datCuoc((ds) => ds.filter((x) => x.id !== c.id));
    if (dangMo === c.id) cuocMoi();
  }

  const danhSach = (
    <nav aria-label="Các cuộc trò chuyện" className="flex min-h-0 flex-col gap-1 overflow-y-auto">
      {cuoc.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {cuoc.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void moCuoc(c.id)}
                aria-current={c.id === dangMo ? "true" : undefined}
                className={`min-h-11 min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  c.id === dangMo ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="block truncate">{c.tieuDe}</span>
                {tenDuAn(c.projectId) ? (
                  <span className="block truncate text-[11px] text-muted-foreground">{tenDuAn(c.projectId)}</span>
                ) : null}
              </button>
              {coTheGui && (
                <button
                  type="button"
                  onClick={() => void xoaCuoc(c)}
                  aria-label={`Xoá cuộc trò chuyện "${c.tieuDe}"`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );

  const taoCuocMoi = coTheGui && !khongCoKhoa && (
    <div className="flex flex-col gap-2">
      {duAn.length > 0 && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Cuộc mới gắn dự án (không bắt buộc)
          <select
            value={duAnMoi}
            onChange={(e) => datDuAnMoi(e.target.value)}
            className="h-10 max-w-full rounded-md border border-border bg-input px-2 text-sm text-foreground"
          >
            <option value="">Không gắn dự án</option>
            {duAn.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button type="button" onClick={cuocMoi} className="min-h-11">
        <Plus className="h-4 w-4" /> Cuộc mới
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessagesSquare className="h-5 w-5 text-primary" /> Trò chuyện
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Hỏi AI lên ý tưởng website, viết nội dung, góp ý SEO. Chạy bằng khoá AI bạn đã lưu — mỗi tin là một lượt gọi
          AI tính vào tài khoản của bạn. Việc cần máy làm (dựng website, đăng bài), trợ lý sẽ chỉ đúng màn để bấm.
        </p>
      </div>

      {khongCoKhoa && (
        <div className="glass flex flex-wrap items-center gap-3 p-4 text-sm text-foreground">
          <KeyRound className="h-4 w-4 text-primary" />
          <span className="flex-1">Chưa có khoá AI nào nên chưa trò chuyện được.</span>
          <Link href="/ai-keys" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
            Thêm khoá AI
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem] lg:grid-cols-[17rem_1fr]">
        <aside className="glass hidden min-h-0 flex-col gap-3 p-3 lg:flex">
          {taoCuocMoi}
          {danhSach}
        </aside>

        <details className="glass p-3 lg:hidden">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-foreground">
            Các cuộc trò chuyện ({cuoc.length})
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {taoCuocMoi}
            {danhSach}
          </div>
        </details>

        <section className="glass flex min-h-[60dvh] flex-col lg:min-h-0">
          <div className="border-b border-border px-4 py-3">
            <h2 className="truncate text-sm font-medium text-foreground">
              {cuocDangMo ? cuocDangMo.tieuDe : "Cuộc trò chuyện mới"}
            </h2>
            {tenDuAn(cuocDangMo ? cuocDangMo.projectId : duAnMoi || null) ? (
              <p className="truncate text-xs text-muted-foreground">
                Dự án: {tenDuAn(cuocDangMo ? cuocDangMo.projectId : duAnMoi || null)}
              </p>
            ) : null}
            {cauTongDungLuong(tin) ? (
              <p className="text-xs text-muted-foreground">{cauTongDungLuong(tin)}</p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
            {dangTaiTin ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Đang mở…
              </p>
            ) : tin.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Bắt đầu bằng một câu hỏi, hoặc chọn một gợi ý:</p>
                {GOI_Y.map((g) => (
                  <button
                    key={g}
                    type="button"
                    disabled={!coTheGui || khongCoKhoa || dangGui}
                    onClick={() => void gui({ chu: g })}
                    className="min-h-11 rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary disabled:opacity-50"
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : (
              <ol className="flex flex-col gap-3">
                {tin.map((t) => (
                  <li key={t.id} className={`flex ${t.vai === "nguoi-dung" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        t.vai === "nguoi-dung"
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background/60 text-foreground"
                      }`}
                    >
                      {t.vai === "tro-ly" ? <ChuCoLienKet chu={t.noiDung} /> : t.noiDung}
                      {/* Lượt hỏi nào cũng tiêu tiền của chính người dùng — nói ra
                          lượng dùng thật. KHÔNG quy ra tiền: mỗi nhà một bảng giá
                          (xem `domain/tro-chuyen/dung-luong.ts`). */}
                      {t.vai === "tro-ly" &&
                      dongDungLuong(t, TEN_NHA_CUNG_CAP[t.provider ?? ""]) !== "" ? (
                        <span className="mt-1.5 block text-[11px] text-muted-foreground">
                          {dongDungLuong(t, TEN_NHA_CUNG_CAP[t.provider ?? ""])}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
                {dangGui && (
                  <li className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang trả lời…
                    </div>
                  </li>
                )}
              </ol>
            )}
            <div ref={cuoiRef} />
          </div>

          {loi && (
            <div
              role="alert"
              className="mx-4 mb-2 flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive"
            >
              <span className="min-w-0 flex-1">{loi.message}</span>
              {loi.guiLai && coTheGui && (
                <Button type="button" variant="outline" onClick={() => void gui({ guiLai: true })} disabled={dangGui} className="min-h-11">
                  <RotateCw className="h-4 w-4" /> Gửi lại
                </Button>
              )}
            </div>
          )}

          {coTheGui ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void gui();
              }}
              className="border-t border-border p-3"
            >
              <label htmlFor="tro-chuyen-o-nhap" className="sr-only">
                Tin nhắn
              </label>
              <textarea
                id="tro-chuyen-o-nhap"
                value={noiDung}
                onChange={(e) => datNoiDung(e.target.value)}
                onKeyDown={(e) => {
                  // `isComposing`: đang gõ dấu tiếng Việt bằng bộ gõ — Enter lúc đó là chọn chữ, không phải gửi.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void gui();
                  }
                }}
                rows={3}
                maxLength={GIOI_HAN_TRO_CHUYEN.kyTuMoiTin}
                disabled={khongCoKhoa}
                placeholder={khongCoKhoa ? "Thêm khoá AI để bắt đầu" : "Hỏi gì cũng được — Enter để gửi, Shift+Enter để xuống dòng"}
                className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {khoa.length > 1 && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    AI
                    <select
                      value={provider}
                      onChange={(e) => datProvider(e.target.value)}
                      className="h-10 max-w-full rounded-md border border-border bg-input px-2 text-sm text-foreground"
                    >
                      <option value="">Tự chọn (rẻ trước)</option>
                      {khoa.map((k) => (
                        <option key={k.provider} value={k.provider}>
                          {TEN_NHA_CUNG_CAP[k.provider] ?? k.provider} · {k.model}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {khoa.length === 1 && (
                  <span className="text-xs text-muted-foreground">
                    AI: {TEN_NHA_CUNG_CAP[khoa[0]!.provider] ?? khoa[0]!.provider} · {khoa[0]!.model}
                  </span>
                )}
                {noiDung.length > GIOI_HAN_TRO_CHUYEN.kyTuMoiTin - 500 && (
                  <span className="metric text-xs text-muted-foreground">
                    {noiDung.length}/{GIOI_HAN_TRO_CHUYEN.kyTuMoiTin}
                  </span>
                )}
                <Button type="submit" disabled={dangGui || khongCoKhoa || !noiDung.trim()} className="ml-auto min-h-11">
                  {dangGui ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi
                </Button>
              </div>
            </form>
          ) : (
            <p className="border-t border-border p-3 text-sm text-muted-foreground">
              Tài khoản chỉ xem không gửi được tin — cần quyền biên tập.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
