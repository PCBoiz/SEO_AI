import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Antigravity OS",
  description:
    "Không gian làm việc điều phối SEO và tự động hóa nội dung bằng AI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /**
   * Nonce của lượt mở trang này, do `src/proxy.ts` sinh.
   *
   * ⚠️ Đoạn script chống nháy màu nền ở dưới là script NỘI TUYẾN, nên
   * Content-Security-Policy chặn nó nếu không mang nonce — và chặn thầm lặng:
   * trang vẫn chạy, chỉ có cái nháy tối→sáng quay lại. Đo 30/09/2026 trên bản
   * dựng thật: đúng 1 vi phạm mỗi trang, chính là nó.
   *
   * Next TỰ gắn nonce vào script của chính nó, nhưng script mình tự viết thì
   * mình phải gắn.
   *
   * Đọc `headers()` ở đây còn một tác dụng cố ý: nó đưa CẢ ứng dụng sang dựng
   * động, kể cả trang 404 — mà nonce chỉ có khi dựng động. Trước đó `/_not-found`
   * dựng sẵn lúc build nên không có nonce và mất sạch JavaScript (đo được: 13
   * vi phạm, React không gắn nổi sự kiện).
   */
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="vi"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      // ⚠️ CỐ Ý. Đoạn script ngay dưới gắn `data-theme` lên <html> TRƯỚC khi
      // React hydrate — phải vậy, nếu không trang nháy từ tối sang sáng mỗi
      // lần mở. Máy chủ không biết người dùng chọn theme gì nên dựng ra <html>
      // không có thuộc tính đó; máy khách thì có. React so hai bên và cảnh báo
      // "hydration mismatch" ở MỌI trang — cảnh báo này nằm trong mục "vòng
      // sau nên làm" của nhật ký suốt ba vòng vì tưởng là lỗi của /analytics.
      //
      // Cờ này chỉ tắt cảnh báo cho đúng thẻ <html> (không lan xuống con), và
      // đây đúng là trường hợp React dành nó cho: một thuộc tính CỐ Ý khác nhau
      // giữa hai bên. Không dùng nó để giấu mismatch ở chỗ khác.
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground antialiased">
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('antigravity-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
