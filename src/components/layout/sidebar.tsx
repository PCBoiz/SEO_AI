"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  KeyRound,
  Workflow,
  Zap,
  Globe,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  Compass,
  Orbit,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import type { CheDo } from "@/lib/che-do-don-gian";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  step: string;
  title: string;
  items: NavItem[];
}

/**
 * Điều hướng CHẾ ĐỘ ĐƠN GIẢN — bốn mục, không hơn.
 *
 * Đo được ở audit: màn hình đầu tiên sau đăng nhập có 16 chỗ bấm được, trang
 * danh sách việc có 56. Với người chưa biết gì, mỗi lựa chọn thừa là một cơ hội
 * đi nhầm và không tìm được đường về.
 *
 * Bốn mục này phủ trọn vòng đời: bắt đầu → xem kết quả → sửa website → cài đặt.
 * Những trang còn lại vẫn truy cập được bằng đường dẫn trực tiếp, chỉ là không
 * bày ra trước mắt.
 */
const navDonGian: NavGroup[] = [
  {
    step: "",
    title: "",
    items: [
      { label: "Bắt đầu", href: "/bat-dau", icon: Sparkles },
      { label: "Bài đã viết", href: "/outputs", icon: FileText },
      { label: "Website của tôi", href: "/projects", icon: FolderOpen },
      { label: "Cài đặt", href: "/settings", icon: Settings },
    ],
  },
];

/**
 * Điều hướng theo HÀNH TRÌNH 4 BƯỚC — người mới biết bắt đầu từ đâu.
 * (Đối chiếu Blueprint + Không gian AI đã gỡ khỏi nav theo chỉ đạo owner.)
 */
const navGroups: NavGroup[] = [
  {
    step: "01",
    title: "Thiết lập",
    items: [
      { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
      { label: "Dự án", href: "/projects", icon: FolderOpen },
      { label: "API Keys", href: "/ai-keys", icon: KeyRound },
    ],
  },
  {
    step: "02",
    title: "Tạo nội dung",
    items: [
      { label: "Quy trình", href: "/pipelines", icon: Workflow },
      { label: "Tự động hóa", href: "/automations", icon: Zap },
    ],
  },
  {
    step: "03",
    title: "Xuất bản",
    items: [{ label: "WordPress", href: "/wordpress", icon: Globe }],
  },
  {
    step: "04",
    title: "Theo dõi",
    items: [
      { label: "Nội dung đầu ra", href: "/outputs", icon: FileText },
      { label: "Phân tích", href: "/analytics", icon: BarChart3 },
      { label: "Kho tri thức", href: "/knowledge", icon: BookOpen },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

interface SidebarProps {
  identity: AuthenticatedIdentity;
  cheDo: CheDo;
}

export function Sidebar({ identity, cheDo }: SidebarProps) {
  const nhomHienThi = cheDo === "don-gian" ? navDonGian : navGroups;
  const pathname = usePathname();

  return (
    <aside className="hidden h-dvh w-60 shrink-0 flex-col p-3 md:flex">
      <div className="glass flex h-full flex-col overflow-hidden">
        {/* Thương hiệu */}
        <div className="flex flex-col gap-3 px-4 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#0a0a12]"
              style={{
                background:
                  "linear-gradient(135deg,#4fe3c1,#35c4f0,#9b8cff,#e07ad6)",
              }}
            >
              <Orbit className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Antigravity <span className="aurora-text">OS</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {identity.workspaceName}
              </p>
            </div>
          </div>
        </div>

        {/* Nav 4 bước */}
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
          {nhomHienThi.map((group) => (
            <div key={group.step} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 px-2 pb-1">
                <span className="metric text-[10px] text-muted-foreground/70">
                  {group.step}
                </span>
                <span className="eyebrow">{group.title}</span>
              </div>
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      // `min-h-11` = 44px. Đo được 36px — dưới ngưỡng ngón tay bấm trúng, và
                      // nhân với 15 lượt quét thành hàng trăm lượt trượt.
                      "group relative flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                        style={{
                          background:
                            "linear-gradient(180deg,#4fe3c1,#9b8cff,#e07ad6)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-foreground" : "",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Thẻ chỉ đường. Nội dung ĐỔI THEO CHẾ ĐỘ: ở bản đơn giản không có
            "4 bước" nào cả, nên câu cũ sẽ chỉ vào một thứ không tồn tại. */}
        <div className="px-3 pb-2">
          <Link
            href={cheDo === "don-gian" ? "/bat-dau" : "/dashboard"}
            className="glass-hover flex items-start gap-2.5 rounded-xl border border-border p-3 transition-colors"
            style={{
              background:
                "linear-gradient(135deg,rgba(79,227,193,.10),rgba(155,140,255,.10),rgba(224,122,214,.10))",
            }}
          >
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-seo" />
            <div className="leading-tight">
              <p className="text-xs font-medium text-foreground">
                {cheDo === "don-gian" ? "Chưa biết làm gì?" : "Bắt đầu từ đâu?"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {cheDo === "don-gian"
                  ? "Mở trang Bắt đầu và chọn một việc."
                  : "Đi theo 4 bước từ trên xuống."}
              </p>
            </div>
          </Link>
        </div>

        {/* Người dùng + cài đặt */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[10px] font-semibold uppercase text-foreground">
              {identity.displayName.slice(0, 2)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs text-foreground">
                {identity.displayName}
              </p>
              <p className="text-[10px] capitalize text-muted-foreground">
                {identity.role === "owner"
                  ? "Chủ sở hữu"
                  : identity.role === "editor"
                    ? "Biên tập viên"
                    : "Chỉ xem"}
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            title="Cài đặt"
            aria-label="Cài đặt"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-md transition-colors",
              isActivePath(pathname, "/settings")
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
