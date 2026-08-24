import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground ring-border",
        success: "bg-success/10 text-success ring-success/20",
        destructive: "bg-destructive/10 text-destructive ring-destructive/20",
        warning: "bg-warning/10 text-warning ring-warning/20",
        outline: "bg-transparent text-muted-foreground ring-border",
        // Đi qua TOKEN `--badge-blue` / `--badge-purple` chứ không dùng biến
        // thể `dark:`. Lý do: app này bật/tắt chế độ bằng `[data-theme]`, mà
        // `dark:` của Tailwind lại bám theo cài đặt hệ điều hành — người dùng
        // bấm nút đổi sang nền sáng thì thẻ nhãn vẫn giữ màu của nền tối.
        //
        // Sắc cũ `blue-400`/`purple-400` chỉ đọc được trên nền tối; trên nền
        // sáng đo được 2,40 và 2,49 — dưới ngưỡng WCAG 4,5 khá xa.
        blue: "bg-blue-500/10 text-badge-blue ring-blue-500/25",
        purple: "bg-purple-500/10 text-badge-purple ring-purple-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
