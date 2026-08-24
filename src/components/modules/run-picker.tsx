"use client";

import { useState } from "react";
import { ChevronDown, Pin, PinOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dropdown chọn lại lần chạy cũ (kiểu "Manage presets..." của masterseo):
// mỗi dòng gồm timestamp + tóm tắt nội dung; bấm để nạp. Tùy chọn nút ghim ở
// cuối dòng (bản chính thức cho nối luồng).
export interface RunPickerItem {
  id: string;
  timestamp: string;
  summary: string;
  statusLabel?: string;
  statusTone?: "success" | "destructive" | "muted";
  pinned?: boolean;
  pinnable?: boolean;
}

export function RunPicker({
  label,
  icon: Icon,
  items,
  disabled,
  emptyText,
  onPick,
  onTogglePin,
}: {
  label: string;
  icon: LucideIcon;
  items: RunPickerItem[];
  disabled?: boolean;
  emptyText: string;
  onPick: (id: string) => void;
  onTogglePin?: (id: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon className="h-3.5 w-3.5" /> {label}
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <>
          {/* Lớp phủ để bấm ra ngoài là đóng dropdown. */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-1 w-96 max-w-[90vw] overflow-hidden rounded-md border border-border bg-background shadow-lg">
            <div className="max-h-72 overflow-auto p-1">
              {items.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">{emptyText}</p>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-1.5 rounded px-2 py-1.5 hover:bg-accent"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      onPick(item.id);
                      setOpen(false);
                    }}
                  >
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">
                        {item.timestamp}
                      </span>
                      {item.statusLabel && (
                        <span
                          className={
                            item.statusTone === "success"
                              ? "text-emerald-400"
                              : item.statusTone === "destructive"
                                ? "text-rose-400"
                                : "text-muted-foreground"
                          }
                        >
                          · {item.statusLabel}
                        </span>
                      )}
                      {item.pinned && (
                        <span className="text-amber-400">· 📌 bản chính thức</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-foreground">
                      {item.summary}
                    </span>
                  </button>
                  {onTogglePin && item.pinnable && (
                    <button
                      type="button"
                      className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                      title={
                        item.pinned
                          ? "Bỏ ghim — quay lại dùng bản mới nhất"
                          : "Ghim làm bản chính thức cho nối luồng"
                      }
                      onClick={() => void onTogglePin(item.id)}
                    >
                      {item.pinned ? (
                        <PinOff className="h-3.5 w-3.5" />
                      ) : (
                        <Pin className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
