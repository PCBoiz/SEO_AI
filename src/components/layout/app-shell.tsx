import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuroraBackground } from "@/components/layout/aurora-background";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { layCheDo } from "@/lib/che-do-don-gian.server";

interface AppShellProps {
  children: React.ReactNode;
  identity: AuthenticatedIdentity;
  topbarActions?: React.ReactNode;
}

export async function AppShell({ children, identity, topbarActions }: AppShellProps) {
  // Đọc chế độ ở MÁY CHỦ để sidebar dựng ra đúng ngay từ đầu — xem ghi chú
  // trong `lib/che-do-don-gian.ts` về việc vì sao không dùng localStorage.
  const cheDo = await layCheDo();
  return (
    /*
     * ═══════════════════════════════════════════════════════════════════
     * TRÊN ĐIỆN THOẠI, ĐỂ CHÍNH TRANG CUỘN. TRÊN MÁY BÀN, GIỮ KHUNG CỐ ĐỊNH.
     *
     * Bản trước dùng `h-dvh` + `overflow-hidden` + `<main>` cuộn bên trong ở
     * MỌI khổ màn hình. Đó là khung quản trị kiểu máy bàn, và nó đúng ở máy
     * bàn: thanh bên đứng yên trong khi nội dung chạy.
     *
     * Trên điện thoại nó lấy đi ba thứ, và cả ba đều im lặng:
     *
     *   · Thanh địa chỉ trình duyệt KHÔNG BAO GIỜ CO LẠI. Trình duyệt chỉ
     *     thu thanh địa chỉ khi chính TRANG cuộn; trang cao đúng bằng màn
     *     hình thì không có gì để cuộn. Màn hình vốn đã hẹp mất thêm 60–100px
     *     vĩnh viễn — khoảng 10% chiều cao, ở mọi màn, suốt thời gian dùng.
     *   · Kéo xuống để làm mới không hoạt động.
     *   · Đo được: chiều cao trang đúng 800px trên cả 12 màn hình, tức là
     *     không màn nào cuộn ở cấp trang.
     *
     * `min-h-dvh` cho điện thoại (trang dài ra theo nội dung, trình duyệt xử
     * lý phần cuộn), `md:h-dvh` trở lại khung cố định từ 768px — đúng chỗ
     * thanh bên xuất hiện và khung cố định bắt đầu có ý nghĩa.
     * ═══════════════════════════════════════════════════════════════════
     */
    <div className="relative flex min-h-dvh md:h-dvh md:min-h-0">
      <AuroraBackground />
      <Sidebar identity={identity} cheDo={cheDo} />
      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <Topbar identity={identity} actions={topbarActions} />
        <main className="flex-1 md:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
