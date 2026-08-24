"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

/** Điều hướng mobile — theo hành trình 4 bước (Blueprint + Không gian AI đã gỡ). */
const groups = [
  {
    title: "Thiết lập",
    links: [
      ["Tổng quan", "/dashboard"],
      ["Dự án", "/projects"],
      ["API Keys", "/ai-keys"],
    ],
  },
  {
    title: "Tạo nội dung",
    links: [
      ["Quy trình", "/pipelines"],
      ["Tự động hóa", "/automations"],
    ],
  },
  {
    title: "Xuất bản",
    links: [["WordPress", "/wordpress"]],
  },
  {
    title: "Theo dõi",
    links: [
      ["Nội dung đầu ra", "/outputs"],
      ["Phân tích", "/analytics"],
      ["Kho tri thức", "/knowledge"],
    ],
  },
  {
    title: "Khác",
    links: [["Cài đặt", "/settings"]],
  },
] as const;

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <details className="group relative md:hidden">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
        <Menu className="h-4 w-4" />
        <span className="sr-only">Mở điều hướng</span>
      </summary>
      <nav className="glass absolute left-0 top-11 z-50 flex w-60 flex-col gap-3 p-3">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <span className="eyebrow px-2 pb-1">{group.title}</span>
            {group.links.map(([label, href]) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </details>
  );
}
