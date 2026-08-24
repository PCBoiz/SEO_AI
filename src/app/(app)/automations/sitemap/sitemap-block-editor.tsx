"use client";

import { useId } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Plus,
  Trash2,
} from "lucide-react";
import type { SitemapRow } from "@/domain/sitemap/sitemap-structure";

// Trình sửa sitemap dạng KHỐI: mỗi trang là một thẻ có ô tên + ô đường dẫn và
// các nút thao tác, thay cho một khối text thô. Dữ liệu là danh sách phẳng kèm
// `depth` nên thụt/bỏ thụt và đổi chỗ chỉ là phép biến đổi mảng đơn giản.

const DEPTH_COLORS = ["#4fe3c1", "#35c4f0", "#9b8cff", "#e07ad6"];
const MAX_DEPTH = 3;

export function SitemapBlockEditor({
  rows,
  disabled,
  onChange,
}: {
  rows: SitemapRow[];
  disabled?: boolean;
  onChange: (rows: SitemapRow[]) => void;
}) {
  const listId = useId();

  function update(index: number, patch: Partial<SitemapRow>): void {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function insertAfter(index: number): void {
    const next = [...rows];
    next.splice(index + 1, 0, {
      label: "",
      slug: "",
      depth: rows[index]?.depth ?? 0,
    });
    onChange(next);
  }

  function remove(index: number): void {
    onChange(rows.filter((_, i) => i !== index));
  }

  // Đổi chỗ kèm theo toàn bộ nhánh con để không làm vỡ cấu trúc.
  function move(index: number, direction: -1 | 1): void {
    const block = branchLength(rows, index);
    const next = [...rows];
    const moving = next.splice(index, block);
    if (direction === -1) {
      let target = index - 1;
      while (target > 0 && rows[target].depth > rows[index].depth) target -= 1;
      if (target < 0) return;
      next.splice(target, 0, ...moving);
    } else {
      const after = branchLength(rows, index + block);
      if (index + block >= rows.length) return;
      next.splice(index + after, 0, ...moving);
    }
    onChange(next);
  }

  function shift(index: number, delta: -1 | 1): void {
    const current = rows[index];
    const previousDepth = index > 0 ? rows[index - 1].depth : -1;
    const nextDepth = Math.max(
      0,
      Math.min(current.depth + delta, previousDepth + 1, MAX_DEPTH),
    );
    if (nextDepth === current.depth) return;
    // Nhánh con dịch theo cha để giữ nguyên quan hệ.
    const block = branchLength(rows, index);
    const gap = nextDepth - current.depth;
    onChange(
      rows.map((row, i) =>
        i >= index && i < index + block
          ? { ...row, depth: Math.max(0, row.depth + gap) }
          : row,
      ),
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Chưa có trang nào.</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([{ label: "", slug: "", depth: 0 }])}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm trang đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} trang · dùng nút{" "}
          <ChevronRight className="inline h-3 w-3" />{" "}
          <ChevronLeft className="inline h-3 w-3" /> để đổi cấp (trang con / trang
          cha), <ChevronUp className="inline h-3 w-3" />{" "}
          <ChevronDown className="inline h-3 w-3" /> để đổi thứ tự.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...rows, { label: "", slug: "", depth: 0 }])}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Thêm trang
        </button>
      </div>

      <ul className="flex max-h-[26rem] flex-col gap-1.5 overflow-y-auto pr-1">
        {rows.map((row, index) => {
          const color = DEPTH_COLORS[Math.min(row.depth, DEPTH_COLORS.length - 1)];
          const children = branchLength(rows, index) - 1;
          return (
            <li
              key={`${listId}-${index}`}
              style={{ marginLeft: row.depth * 22 }}
              className="group flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2 transition-colors hover:border-border/80"
            >
              <span
                className="h-8 w-1 shrink-0 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              {row.depth > 0 && (
                <CornerDownRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              )}

              <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
                <input
                  value={row.label}
                  disabled={disabled}
                  placeholder="Tên trang (ví dụ: Giới thiệu)"
                  onChange={(event) => update(index, { label: event.target.value })}
                  aria-label={`Tên trang dòng ${index + 1}`}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm text-foreground transition-colors focus:border-border focus:bg-input focus:outline-none"
                />
                <input
                  value={row.slug ?? ""}
                  disabled={disabled}
                  placeholder="/duong-dan (để trống nếu chỉ là mục nhóm)"
                  onChange={(event) => update(index, { slug: event.target.value })}
                  aria-label={`Đường dẫn dòng ${index + 1}`}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 font-mono text-xs text-muted-foreground transition-colors focus:border-border focus:bg-input focus:outline-none sm:max-w-[46%]"
                />
              </span>

              {children > 0 && (
                <span className="metric hidden shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                  {children} con
                </span>
              )}

              <span className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                <RowBtn
                  label="Lùi ra một cấp"
                  disabled={disabled || row.depth === 0}
                  onClick={() => shift(index, -1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </RowBtn>
                <RowBtn
                  label="Thụt vào một cấp (thành trang con)"
                  disabled={
                    disabled ||
                    index === 0 ||
                    row.depth > rows[index - 1].depth ||
                    row.depth >= MAX_DEPTH
                  }
                  onClick={() => shift(index, 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </RowBtn>
                <RowBtn
                  label="Chuyển lên trên"
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </RowBtn>
                <RowBtn
                  label="Chuyển xuống dưới"
                  disabled={disabled || index + branchLength(rows, index) >= rows.length}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </RowBtn>
                <RowBtn
                  label="Thêm trang bên dưới"
                  disabled={disabled}
                  onClick={() => insertAfter(index)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </RowBtn>
                <RowBtn
                  label={
                    children > 0
                      ? `Xoá trang này và ${children} trang con`
                      : "Xoá trang này"
                  }
                  disabled={disabled}
                  danger
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </RowBtn>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Số dòng của một nhánh: chính nó + mọi dòng sâu hơn liền sau. */
function branchLength(rows: SitemapRow[], index: number): number {
  if (index >= rows.length) return 0;
  let length = 1;
  while (
    index + length < rows.length &&
    rows[index + length].depth > rows[index].depth
  ) {
    length += 1;
  }
  return length;
}

function RowBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
        danger
          ? "text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
