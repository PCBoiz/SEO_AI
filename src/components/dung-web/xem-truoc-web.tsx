"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * KHUNG XEM THỬ WEBSITE — iframe trỏ vào tuyến xem thử tĩnh, kèm chọn trang
 * và chọn cỡ màn hình. Dùng ở thẻ "Website dựng sẵn" (trang dự án) và ở thẻ
 * kết quả trong Trò chuyện — một khung, hai chỗ.
 *
 * Vì sao có nút điện thoại/máy tính: khách của chủ dự án xem web bằng điện
 * thoại là chính (đo trên halongxanh360: >70% lượt), mà màn hình chị duyệt là
 * máy tính. Không có cỡ điện thoại thì chị duyệt một bố cục khách không thấy.
 *
 * Trang đang xem tô đậm nhờ chính trang xem thử gửi `postMessage` khi mở
 * (bấm liên kết trong khung cũng đổi tab đúng), không cần đọc `src` của iframe.
 */
export interface TrangXemTruoc {
  duong: string;
  tieuDe: string;
}

export function duongXemTruoc(projectId: string, duong: string): string {
  const goc = `/api/v1/projects/${encodeURIComponent(projectId)}/dung-web/xem-truoc/trang`;
  return duong === "/" ? goc : `${goc}${duong}`;
}

type ThietBi = "dien-thoai" | "may-tinh";

export function XemTruocWeb({
  projectId,
  trang,
  /** Đổi giá trị là khung tải lại bản mới (bỏ qua bộ nhớ 20 giây ở máy chủ). */
  phienBan = 0,
  /** Ghi chú ngắn dưới khung (ví dụ: số điện thoại đang là số mẫu). */
  ghiChu,
}: {
  projectId: string;
  trang: readonly TrangXemTruoc[];
  phienBan?: number;
  ghiChu?: string;
}) {
  const [thietBi, setThietBi] = useState<ThietBi>("dien-thoai");
  /** Trang đang hiện — để tô tab; đổi khi bấm tab HOẶC khi bấm liên kết trong khung. */
  const [duong, setDuong] = useState(trang[0]?.duong ?? "/");
  /**
   * Địa chỉ iframe — chỉ đổi khi bấm tab / Xem lại / có bản mới. KHÔNG đổi
   * theo `duong`: khách bấm liên kết trong khung thì khung đã tự chuyển trang
   * rồi, đặt lại src là tải trang đó lần thứ hai và nháy một cái.
   */
  const [src, setSrc] = useState(() => `${duongXemTruoc(projectId, trang[0]?.duong ?? "/")}?lan=0`);
  const [dangTai, setDangTai] = useState(true);
  /** Bộ đếm lượt tải — vào địa chỉ để trình duyệt tải lại thật (cùng src thì iframe đứng yên). */
  const [lan, setLan] = useState(0);

  function chonTrang(d: string): void {
    setDuong(d);
    setDangTai(true);
    setLan(lan + 1);
    setSrc(`${duongXemTruoc(projectId, d)}?lan=${lan + 1}`);
  }

  /** Dựng lại từ kết quả mới nhất: `moi=1` bỏ bộ nhớ 20 giây ở máy chủ. */
  function taiLai(): void {
    setDangTai(true);
    setLan(lan + 1);
    setSrc(`${duongXemTruoc(projectId, duong)}?moi=1&lan=${lan + 1}`);
  }

  // Bản mới từ ngoài (chạy lại bước dựng) → tải lại. Đặt trạng thái ngay
  // trong lượt vẽ khi prop đổi — cách React khuyên, thay vì trong effect.
  const [phienBanTruoc, setPhienBanTruoc] = useState(phienBan);
  if (phienBan !== phienBanTruoc) {
    setPhienBanTruoc(phienBan);
    setDangTai(true);
    setLan(lan + 1);
    setSrc(`${duongXemTruoc(projectId, duong)}?moi=1&lan=${lan + 1}`);
  }

  useEffect(() => {
    function nghe(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { loai?: string; duong?: string } | null;
      if (d?.loai === "xem-truoc-web" && typeof d.duong === "string") setDuong(d.duong);
    }
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, []);

  const moTab = duongXemTruoc(projectId, duong);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Trang" className="flex flex-wrap gap-1">
          {trang.map((t) => (
            <button
              key={t.duong}
              type="button"
              role="tab"
              aria-selected={t.duong === duong}
              onClick={() => chonTrang(t.duong)}
              className={`rounded-md px-2.5 py-1 text-xs transition-[background-color,color] duration-150 ${
                t.duong === duong ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {t.tieuDe}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={thietBi === "dien-thoai" ? "secondary" : "ghost"}
            aria-pressed={thietBi === "dien-thoai"}
            onClick={() => setThietBi("dien-thoai")}
            title="Cỡ điện thoại (390px)"
          >
            <Smartphone className="h-3.5 w-3.5" /> Điện thoại
          </Button>
          <Button
            type="button"
            size="sm"
            variant={thietBi === "may-tinh" ? "secondary" : "ghost"}
            aria-pressed={thietBi === "may-tinh"}
            onClick={() => setThietBi("may-tinh")}
            title="Cỡ máy tính"
          >
            <Monitor className="h-3.5 w-3.5" /> Máy tính
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={taiLai}
            title="Dựng lại bản xem thử từ kết quả mới nhất"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dangTai ? "animate-spin" : ""}`} /> Xem lại
          </Button>
          <a
            href={moTab}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Mở bản xem thử ở tab mới"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Tab mới
          </a>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border border-border/60 bg-[#e9e9e6] p-3"
        data-thiet-bi={thietBi}
      >
        <div
          className={`mx-auto overflow-hidden rounded-md bg-white shadow-sm ${thietBi === "dien-thoai" ? "w-[390px] max-w-full" : "w-full"}`}
          style={{ height: "min(72vh, 780px)" }}
        >
          <iframe
            src={src}
            title="Bản xem thử website"
            sandbox="allow-same-origin allow-scripts allow-popups"
            referrerPolicy="same-origin"
            onLoad={() => setDangTai(false)}
            className="h-full w-full border-0"
          />
        </div>
        {dangTai && (
          <p role="status" className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white">
            Đang dựng bản xem thử — lần đầu vài giây (tải ảnh)…
          </p>
        )}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Bản xem thử: đúng bố cục, chữ, màu, ảnh, liên kết. Biểu mẫu chưa gửi được và ảnh chưa qua bộ nén — hai thứ đó
        có khi web lên mạng.{ghiChu ? ` ${ghiChu}` : ""}
      </p>
    </div>
  );
}
