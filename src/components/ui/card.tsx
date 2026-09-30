import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
  );
}

/**
 * Tiêu đề thẻ. Mặc định `h3` vì phần lớn thẻ nằm dưới một `h2` của mục.
 *
 * `bac` cho nơi nào thẻ nằm ngay dưới `h1` đổi sang `h2`: nhảy từ h1 xuống h3
 * là lỗi thứ tự tiêu đề — người dùng máy đọc màn hình nhảy theo cấp tiêu đề,
 * nên một bậc bị khuyết làm họ tưởng mình bỏ sót phần nào đó. Lighthouse bắt
 * được ở trang đăng nhập ngày 30/09/2026.
 */
function CardTitle({
  className,
  bac: The = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { bac?: "h2" | "h3" | "h4" }) {
  return (
    <The
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center px-5 pb-5 pt-0",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
