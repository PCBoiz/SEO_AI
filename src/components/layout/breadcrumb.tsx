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
  if (/^[a-z0-9]{16,}$/i.test(doan)) return null;
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
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors"
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
