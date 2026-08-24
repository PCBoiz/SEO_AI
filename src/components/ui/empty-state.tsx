import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// Màn hình trống dùng chung: thay khoảng trắng vô nghĩa bằng lời giải thích
// "đang thiếu gì" + đúng một hành động tiếp theo. Đây là chỗ người mới hay lạc
// nhất nên luôn phải nói rõ bước kế tiếp thay vì chỉ báo "chưa có dữ liệu".

export interface EmptyStateAction {
  label: string;
  href: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--spectrum-1) 18%, transparent), color-mix(in oklab, var(--spectrum-3) 18%, transparent))",
        }}
      >
        <Icon className="h-6 w-6 text-spectrum-2" />
      </span>

      <div className="flex max-w-md flex-col gap-1.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}

      {hint && (
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground/70">
          {hint}
        </p>
      )}
    </div>
  );
}

// Khung xương chờ dữ liệu — dùng khi đang tải danh sách, giữ đúng hình dạng nội
// dung sắp hiện để layout không nhảy.
export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-lg border border-border bg-muted/20"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}
