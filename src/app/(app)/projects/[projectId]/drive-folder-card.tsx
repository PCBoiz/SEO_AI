"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FolderOpen, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnhDrive {
  id: string;
  ten: string;
  taoLuc: string;
  rong: number | null;
  cao: number | null;
  coThuNho: boolean;
  /** "" = ngay thư mục gốc. */
  thuMucCon: string;
}

/** Gom ảnh theo thư mục; thư mục gốc lên đầu, rồi theo tên. */
function nhomAnh(anh: AnhDrive[]): [string, AnhDrive[]][] {
  const m = new Map<string, AnhDrive[]>();
  for (const a of anh) {
    const k = a.thuMucCon ?? "";
    m.set(k, [...(m.get(k) ?? []), a]);
  }
  return [...m.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b, "vi")));
}

/** Mỗi nhóm hiện trước 18 ô — đủ nhìn, không bắt tải 87 ảnh thu nhỏ một lượt. */
const SO_O_TRUOC = 18;

function NhomAnh({ ten, anh, projectId }: { ten: string; anh: AnhDrive[]; projectId: string }) {
  const [moHet, setMoHet] = useState(false);
  const hien = moHet ? anh : anh.slice(0, SO_O_TRUOC);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-xs text-foreground">
        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        {ten || "Thư mục chính"}
        <span className="text-muted-foreground">· {anh.length} ảnh</span>
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {hien.map((a) => (
          <li key={a.id} className="flex flex-col gap-1">
            <a
              href={`https://drive.google.com/file/d/${a.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square overflow-hidden rounded-md border border-border bg-accent/30"
              title={a.ten}
            >
              {a.coThuNho ? (
                // eslint-disable-next-line @next/next/no-img-element -- ảnh qua proxy có phiên đăng nhập; next/image sẽ gọi lại từ máy chủ tối ưu ảnh, không mang cookie
                <img
                  src={`/api/v1/projects/${projectId}/anh-drive/${a.id}?s=300`}
                  alt={a.ten}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                  chưa có ảnh thu nhỏ
                </span>
              )}
            </a>
            <span className="truncate text-[10px] text-muted-foreground" title={a.ten}>
              {a.rong && a.cao ? `${a.rong}×${a.cao}` : a.ten}
            </span>
          </li>
        ))}
      </ul>
      {anh.length > SO_O_TRUOC && (
        <button
          type="button"
          onClick={() => setMoHet((x) => !x)}
          className="w-fit text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          {moHet ? "Thu gọn" : `Xem tất cả ${anh.length} ảnh`}
        </button>
      )}
    </div>
  );
}

type DuLieu =
  | { daNoi: false }
  | { daNoi: true; thuMuc: { id: string; ten: string; url: string }; anh?: AnhDrive[]; loi?: string };

/**
 * Thẻ "Ảnh từ Google Drive" trên trang dự án.
 *
 * Chủ dự án tải ảnh lên một thư mục Drive bằng điện thoại, dán link thư mục vào
 * đây một lần, rồi mỗi lần mở trang là thấy ảnh mới nhất.
 *
 * GẮN ẢNH VÀO BÀI (từ 12/09/2026): bước "Chọn ảnh kèm bài" (#23, ẩn) đứng ngay
 * trước bước đăng trong lịch đăng và luồng "đẩy thẳng sang site" — AI chọn tối
 * đa 2 ảnh HỢP BÀI từ đúng danh sách trong thư mục này (không sinh ảnh), bước
 * đăng tải về, thu cỡ web và gửi kèm; website dùng tấm đầu làm ảnh bìa. Mô tả
 * ảnh (alt) lấy từ `danh-sach-anh.csv` trong thư mục nếu có. Không có ảnh hợp
 * thì bài dùng ảnh theo chuyên mục của website như trước.
 */
export function DriveFolderCard({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const [duLieu, setDuLieu] = useState<DuLieu | null>(null);
  const [link, setLink] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string>();

  const tai = useCallback(async () => {
    setDangTai(true);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/anh-drive`, { cache: "no-store" });
      setDuLieu(r.ok ? ((await r.json()) as DuLieu) : { daNoi: false });
    } catch {
      setDuLieu({ daNoi: false });
    } finally {
      setDangTai(false);
    }
  }, [projectId]);

  // Lần tải đầu: đặt state trong callback của promise, không đồng bộ trong
  // effect — cùng khuôn với `lead-sheet-card.tsx`. Nút "Tải lại" dùng `tai()`.
  useEffect(() => {
    let huy = false;
    fetch(`/api/v1/projects/${projectId}/anh-drive`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<DuLieu>) : ({ daNoi: false } as DuLieu)))
      .then((d) => {
        if (!huy) setDuLieu(d);
      })
      .catch(() => {
        if (!huy) setDuLieu({ daNoi: false });
      });
    return () => {
      huy = true;
    };
  }, [projectId]);

  async function luu(): Promise<void> {
    setDangLuu(true);
    setLoi(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/anh-drive`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d.error?.message ?? "Không nối được thư mục.");
      }
      setLink("");
      await tai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không nối được thư mục.");
    } finally {
      setDangLuu(false);
    }
  }

  const anh = duLieu?.daNoi ? (duLieu.anh ?? []) : [];

  return (
    <section className="glass flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ImageIcon className="h-4 w-4 text-geo" /> Ảnh từ Google Drive
        </h2>
        {duLieu?.daNoi && (
          <button
            type="button"
            onClick={() => void tai()}
            disabled={dangTai}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${dangTai ? "animate-spin" : ""}`} /> Tải lại
          </button>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Tải ảnh lên một thư mục Drive (bằng app Drive trên điện thoại cũng được),
        dán link thư mục vào đây một lần. Antigravity chỉ <strong>đọc</strong> —
        không sửa, không xoá gì trên Drive.
      </p>

      {duLieu === null ? (
        <p className="text-xs text-muted-foreground">đang kiểm…</p>
      ) : duLieu.daNoi ? (
        <>
          <a
            href={duLieu.thuMuc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-foreground underline decoration-dotted underline-offset-2"
          >
            <FolderOpen className="h-3.5 w-3.5" /> {duLieu.thuMuc.ten}
            <ExternalLink className="h-3 w-3" />
          </a>

          {duLieu.loi ? (
            <p role="alert" className="text-xs text-destructive">
              {duLieu.loi}
            </p>
          ) : anh.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Thư mục chưa có ảnh nào.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {anh.length} ảnh{" "}
                {nhomAnh(anh).length > 1 && `trong ${nhomAnh(anh).length} thư mục (gồm cả thư mục con)`}
              </p>
              {nhomAnh(anh).map(([ten, ds]) => (
                <NhomAnh key={ten || "_goc"} ten={ten} anh={ds} projectId={projectId} />
              ))}
            </>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            Bài đăng tự động (lịch đăng, luồng &quot;đẩy thẳng sang site&quot;) sẽ <strong>tự chọn tối đa 2 ảnh
            hợp bài</strong> từ thư mục này làm ảnh bìa và ảnh trong bài — AI chỉ chọn trong danh sách, không sinh
            ảnh. Muốn mô tả ảnh chính xác: giữ tệp <code className="metric">danh-sach-anh.csv</code> (cột &quot;Tên
            tệp&quot;, &quot;Mô tả&quot;) trong thư mục — mô tả đó thành chú thích dưới ảnh.
          </p>
        </>
      ) : null}

      {canEdit && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`drive-${projectId}`} className="text-xs text-muted-foreground">
            {duLieu?.daNoi ? "Đổi thư mục" : "Link thư mục Google Drive"}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`drive-${projectId}`}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/…"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-input px-2 text-xs"
            />
            <Button type="button" size="sm" onClick={luu} disabled={dangLuu || !link.trim()}>
              {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
              {duLieu?.daNoi ? "Đổi" : "Nối thư mục"}
            </Button>
          </div>
          {loi && (
            <p role="alert" className="text-xs text-destructive">
              {loi}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
