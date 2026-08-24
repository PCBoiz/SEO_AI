"use client";

import { RouteError } from "@/components/route-error";

export default function SitemapRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <RouteError
      error={error}
      unstableRetry={unstable_retry}
      title="Module 1 chưa tải được"
      description="Không thể tải dự án hoặc cấu hình runtime của Module 1. Dữ liệu đã lưu trong Neon không bị xóa; hãy thử tải lại và dùng mã đối chiếu để kiểm tra log nếu lỗi còn lặp lại."
    />
  );
}
