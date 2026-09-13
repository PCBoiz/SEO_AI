"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const pathLabels: Record<string, string> = {
  dashboard: "Tổng quan",
  "bat-dau": "Bắt đầu",
  projects: "Dự án",
  pipelines: "Quy trình",
  outputs: "Nội dung đầu ra",
  knowledge: "Kho tri thức",
  analytics: "Phân tích",
  automations: "Tự động hóa",
  keywords: "Từ khoá",
  sitemap: "Pilot Sitemap",
  wordpress: "WordPress",
  "ai-keys": "Khoá AI",
  settings: "Cài đặt",
  new: "Tạo mới",
  run: "Chạy việc",
};

/**
 * Đoạn đường dẫn KHÔNG có trang riêng: `/automations/run` chỉ là thư mục chứa
 * `/automations/run/<mã module>`. Bản trước vẫn dựng thành link → bấm là 404,
 * và Next tải trước cái 404 đó trên MỌI trang chạy module (đo 13/09/2026:
 * mỗi lần mở trang chạy việc có một yêu cầu `/automations/run?_rsc=…` trả
 * 404). Đoạn này hiện như chữ thường, không bấm được.
 */
const KHONG_CO_TRANG = new Set(["run"]);

/**
 * Tên hiển thị cho một đoạn đường dẫn.
 *
 * HAI CHỖ RÒ được audit bắt: đoạn `bat-dau` hiện thô như trong URL, và mã
 * module `RIS_CONTENT_HEADLINE` hiện nguyên trong breadcrumb của trang chạy
 * việc. Người dùng không cần biết hệ thống gọi việc đó là gì.
 *
 * Bảng dịch tên module KHÔNG nhập vào đây: file này chạy trên trình duyệt, kéo
 * cả tầng định nghĩa module theo sẽ phình gói tải về. Mã module có dạng cố định
 * `RIS_ĐƯỢC_VIẾT_HOA`, nên nhận ra bằng hình dạng là đủ — gặp thì ẩn đi, để
 * tiêu đề trang bên dưới nói tên việc.
 */
function nhanDoan(doan: string): string | null {
  if (pathLabels[doan]) return pathLabels[doan];
  // Mã module hoặc mã định danh máy sinh: ẩn khỏi breadcrumb.
  if (/^RIS_[A-Z0-9_]+$/.test(doan)) return null;
  // Kể cả UUID có gạch ngang (mã dự án thật) và mã dạng `project_local_demo`
  // — bản trước chỉ bắt chuỗi liền không gạch, nên trang dự án thật hiện
  // nguyên một UUID 36 ký tự ở đầu trang.
  if (/^[a-z0-9_-]{16,}$/i.test(doan)) return null;
  return doan;
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav
      aria-label="Đường dẫn điều hướng"
      className="flex items-center gap-1 text-sm"
    >
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = nhanDoan(segment);
        if (label === null) return null;

        return (
          <span key={href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            {isLast ? (
              <span className={cn("text-foreground font-medium")}>{label}</span>
            ) : KHONG_CO_TRANG.has(segment) ? (
              <span className="text-muted-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                // Đường dẫn phân cấp là ĐIỀU HƯỚNG, không phải chữ trong câu,
                // nên nó phải đủ cỡ để bấm. Đo được 38x20px — theo lệ thường
                // của loại thành phần này, nhưng lệ thường đó sinh ra từ thời
                // ai cũng dùng chuột.
                //
                // Đặt inline-flex kèm min-h-11 thay vì tăng cỡ chữ: chữ giữ
                // nguyên vẻ nhỏ nhẹ của đường dẫn phân cấp, chỉ vùng bấm rộng
                // ra. Thanh trên vốn đã cao 56px nên không có gì bị đẩy lệch.
                //
                // Đệm ngang px-1.5 vì nhãn ngắn như "Dự án" chỉ rộng 38px —
                // đủ cao rồi vẫn thiếu bề ngang. -mx-1.5 kéo lại đúng phần đệm
                // vừa thêm, để chữ vẫn thẳng hàng như trước.
                className="-mx-1.5 inline-flex min-h-11 items-center rounded-md px-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
