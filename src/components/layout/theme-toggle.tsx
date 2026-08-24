"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/** Đăng ký theo dõi [data-theme] trên <html> để re-render khi theme đổi. */
function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

/**
 * Nút chuyển sáng/tối. Đọc/ghi [data-theme] trên <html> + localStorage.
 * Script no-flash trong layout đã áp theme trước khi paint; ở đây chỉ đồng bộ
 * icon qua useSyncExternalStore (không setState-trong-effect).
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("antigravity-theme", next);
    } catch {
      // localStorage bị chặn — bỏ qua, theme vẫn đổi trong phiên này
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      aria-label={isDark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
