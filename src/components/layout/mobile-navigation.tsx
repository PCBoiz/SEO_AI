"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheDo } from "@/lib/che-do-don-gian";

/**
 * Chế độ ĐƠN GIẢN trên điện thoại: đúng bốn mục như thanh bên máy bàn. Bản
 * trước menu điện thoại không biết chế độ — người dùng chuyển "bản dễ" trên
 * máy tính rồi mở điện thoại lại thấy đủ 11 mục và không có "Bắt đầu".
 */
const nhomDonGian = [
  {
    title: "",
    links: [
      ["Bắt đầu", "/bat-dau"],
      ["Bài đã viết", "/outputs"],
      ["Website của tôi", "/projects"],
      ["Cài đặt", "/settings"],
    ],
  },
] as const;

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

export function MobileNavigation({ cheDo }: { cheDo: CheDo }) {
  const pathname = usePathname();
  const nhom: readonly { title: string; links: readonly (readonly [string, string])[] }[] =
    cheDo === "don-gian" ? nhomDonGian : groups;

  return (
    <details className="group relative md:hidden">
      {/* 44×44px — KHÔNG phải 32×32 như bản trước.

          Đây là nút điều hướng DUY NHẤT trên điện thoại: thanh bên bị ẩn
          hẳn dưới 768px, nên mọi đường đi tới màn hình khác đều qua đúng
          nút này. Bấm trượt ở đây không phải bất tiện nhỏ — nó là ngõ cụt.

          Lỗi này lọt qua một lần sửa trước đó. Nút biểu tượng trong
          components/ui/button.tsx đã được nâng lên size-11 kèm ghi chú
          "đo được 32px ở bản cũ" — nhưng nút này là thẻ <summary> thuần,
          không đi qua Button, nên nó nằm ngoài phạm vi bản sửa ấy. */}
      <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Mở điều hướng</span>
      </summary>
      {/* Nền ĐẶC, không kính mờ: menu trượt đè lên tiêu đề trang, chữ bên dưới
          xuyên qua lớp kính là đọc hai lớp chữ chồng nhau (đo được trên
          màn 390px). */}
      <nav className="absolute left-0 top-11 z-50 flex w-60 flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        {nhom.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            {group.title ? <span className="eyebrow px-2 pb-1">{group.title}</span> : null}
            {group.links.map(([label, href]) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    // min-h-11 = 44px. Đo được 36px, do chiều cao chỉ là
                    // đệm cộng chiều cao dòng chữ chứ không ai đặt ra.
                    // Các mục xếp sát nhau nên 8px thiếu hụt đủ để bấm
                    // nhầm sang mục bên cạnh.
                    "flex min-h-11 items-center rounded-md px-3 py-2 text-sm",
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
