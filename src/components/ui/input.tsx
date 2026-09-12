"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Cao tối đa theo số dòng; dài hơn thì cuộn bên trong. Mặc định 10. */
  toiDaDong?: number;
};

/**
 * Ô nhiều dòng TỰ CAO THEO CHỮ — thấp nhất `rows` dòng, cao nhất `toiDaDong`
 * (mặc định 10), quá thì cuộn.
 *
 * Chủ dự án (12/09/2026): ô cố định 3–4 dòng làm chữ AI viết ra bị "bó",
 * đọc khó chịu — ở thẻ lịch đăng và cả form các module. Sửa ở đây một lần
 * cho mọi chỗ dùng `Textarea`. Đo bằng `scrollHeight` mỗi khi giá trị đổi
 * (kể cả khi AI điền vào), dùng `useLayoutEffect` để không nháy.
 */
export function Textarea({ className, rows = 3, toiDaDong = 10, onInput, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const doCao = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const dong = parseFloat(cs.lineHeight) || 20;
    const vien =
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) +
      parseFloat(cs.borderBottomWidth);
    const thap = dong * rows + vien;
    // Ô đã xin sẵn nhiều dòng hơn trần (khung sửa bài 16 dòng) thì giữ nguyên.
    const cao = dong * Math.max(toiDaDong, rows) + vien;
    // Thu về "auto" trước để scrollHeight phản ánh đúng nội dung hiện tại
    // (không thì xoá chữ đi ô vẫn cao như cũ).
    el.style.height = "auto";
    const can = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(can, thap), cao)}px`;
    el.style.overflowY = can > cao ? "auto" : "hidden";
  }, [rows, toiDaDong]);

  // Giá trị đổi từ ngoài (AI điền, đổi dự án, tải lại) → đo lại.
  useLayoutEffect(() => {
    doCao();
  }, [doCao, props.value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      onInput={(event) => {
        doCao();
        onInput?.(event);
      }}
      className={cn(
        "flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm leading-5 text-foreground placeholder:text-muted-foreground/60 transition-colors resize-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  /** Chữ hoặc nút — để chú thích có thể chứa một link ("thêm khoá ở trang Khoá AI"). */
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  children,
  className,
  required,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-muted-foreground/60">{description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
