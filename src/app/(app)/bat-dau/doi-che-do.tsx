"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, Sparkles } from "lucide-react";
import { TEN_COOKIE, type CheDo } from "@/lib/che-do-don-gian";

/**
 * Công tắc Đơn giản ↔ Nâng cao.
 *
 * Ghi thẳng cookie ở phía trình duyệt rồi làm mới dữ liệu máy chủ. Không cần
 * gọi một đường dẫn API riêng cho việc này — nó là lựa chọn hiển thị, không
 * phải dữ liệu cần bảo vệ.
 *
 * Nhãn nói rõ mình ĐANG ở đâu và bấm vào sẽ sang đâu. Một công tắc chỉ ghi
 * "Nâng cao" thì người dùng không đoán được đó là trạng thái hiện tại hay là
 * nơi sắp tới — thứ nhầm lẫn kinh điển của nút bật/tắt.
 */
export function DoiCheDo({ cheDo }: { cheDo: CheDo }) {
  const router = useRouter();
  const [dangChuyen, batDauChuyen] = useTransition();
  const dangDonGian = cheDo === "don-gian";

  function chuyen() {
    const moi: CheDo = dangDonGian ? "nang-cao" : "don-gian";
    // `max-age` một năm; `SameSite=Lax` để không gửi kèm khi trang khác nhúng.
    document.cookie = `${TEN_COOKIE}=${moi}; path=/; max-age=31536000; SameSite=Lax`;
    batDauChuyen(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={chuyen}
      disabled={dangChuyen}
      aria-pressed={!dangDonGian}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-60"
    >
      {dangDonGian ? (
        <>
          <Sparkles className="h-4 w-4" aria-hidden />
          <span>
            Đang dùng bản <strong className="font-semibold">đơn giản</strong>
            <span className="text-muted-foreground"> — chuyển sang bản đầy đủ</span>
          </span>
        </>
      ) : (
        <>
          <Settings2 className="h-4 w-4" aria-hidden />
          <span>
            Đang dùng bản <strong className="font-semibold">đầy đủ</strong>
            <span className="text-muted-foreground"> — chuyển về bản đơn giản</span>
          </span>
        </>
      )}
    </button>
  );
}
