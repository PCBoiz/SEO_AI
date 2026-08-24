"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-black px-6 text-[#ededed]">
        <main className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Đã xảy ra lỗi</h1>
          <p className="mt-2 text-sm text-[#8e8e8e]">
            Lỗi đã được ghi nhận. Bạn có thể thử lại mà không mất dữ liệu đã lưu.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-5 rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
