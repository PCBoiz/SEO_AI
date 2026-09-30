import { NextResponse, type NextRequest } from "next/server";
import { dungCsp } from "@/domain/bao-mat/csp";

/**
 * Sinh nonce và gắn Content-Security-Policy cho mỗi lần mở trang.
 *
 * ⚠️ Next 16 đổi tên quy ước `middleware.ts` thành **`proxy.ts`** — tệp cũ đã
 * bị khai tử. Luật chính sách nằm ở `domain/bao-mat/csp.ts` (thuần, có phép
 * thử); tệp này chỉ lo phần chạy: mỗi yêu cầu một nonce mới.
 *
 * Cách Next dùng nonce (theo tài liệu bản 16.3.5, `02-guides/content-security-policy.md`):
 * nó ĐỌC header `Content-Security-Policy` của yêu cầu, rút chuỗi `nonce-…`
 * rồi tự gắn vào mọi thẻ script nó sinh ra. Vì thế nonce phải có mặt ở CẢ
 * header của yêu cầu (cho lúc dựng trang) lẫn header của phản hồi (cho trình
 * duyệt). Thiếu một trong hai là trang trắng.
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = dungCsp({
    nonce,
    laDev: process.env.NODE_ENV === "development",
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });

  const headerYeuCau = new Headers(request.headers);
  headerYeuCau.set("x-nonce", nonce);
  headerYeuCau.set("Content-Security-Policy", csp);

  const phanHoi = NextResponse.next({ request: { headers: headerYeuCau } });
  phanHoi.headers.set("Content-Security-Policy", csp);
  return phanHoi;
}

export const config = {
  matcher: [
    {
      /**
       * Bỏ qua:
       * - `api/` — tuyến API không trả HTML. Quan trọng hơn: tuyến xem thử
       *   website khách TỰ đặt CSP riêng (chặt hơn, kèm nonce của chính nó và
       *   `frame-ancestors 'self'` để nằm được trong khung). Để proxy ghi đè
       *   lên đó là vừa hỏng khung xem thử vừa nới lỏng chính sách của nó.
       * - `_next/static`, `_next/image`, `favicon.ico` — tệp tĩnh, không chạy
       *   script, thêm header chỉ tốn byte.
       */
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      // Lượt tải trước của `next/link` không dựng HTML nên không cần nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
