/**
 * Thành phần dùng chung của trang Phân tích.
 *
 * Tách ra vì khối Search Console đã thành một component máy chủ riêng (để bọc
 * `Suspense` — trang không được chờ Google mới hiện gì), mà cả hai bên đều cần
 * `Kpi` và `EmptyPanel`. Để chúng ở `page.tsx` rồi import ngược lại là tạo một
 * vòng phụ thuộc giữa hai tệp cùng thư mục.
 */

export function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
  muted,
  delta,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  muted?: boolean;
  // Thay đổi so với kỳ liền trước cùng độ dài (đơn vị %). null = chưa đủ dữ liệu.
  delta?: number | null;
  // Chuỗi số để vẽ biểu đồ mini trong thẻ.
  spark?: number[];
}) {
  return (
    <div className="glass flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${accent} ${muted ? 8 : 16}%, transparent)`,
            color: muted ? "var(--muted-foreground)" : accent,
          }}
        >
          {icon}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span
          className={`metric text-2xl font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}
        >
          {value}
        </span>
        {spark && spark.some((point) => point > 0) && (
          <Sparkline points={spark} color={accent} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {delta !== undefined && delta !== null && <DeltaBadge value={delta} />}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// Nhãn tăng/giảm so với kỳ trước. Màu theo hướng, kèm mũi tên để không phụ
// thuộc hoàn toàn vào màu (người mù màu vẫn đọc được).
function DeltaBadge({ value }: { value: number }) {
  const flat = Math.abs(value) < 1;
  const up = value > 0;
  // Dùng TOKEN chứ không viết cứng mã màu.
  //
  // Ba mã cũ (#8a8aa0, #4fe3c1, #e0a04a) đều là sắc của chế độ TỐI, viết thẳng
  // vào đây nên không đổi theo chủ đề. Trên nền sáng chúng đo được 3,22 — dưới
  // ngưỡng WCAG 4,5, và là bốn lượt trượt tương phản CUỐI CÙNG còn lại của cả
  // ứng dụng sau khi đã sửa token chữ mờ và thẻ nhãn.
  const color = flat
    ? "var(--muted-foreground)"
    : up
      ? "var(--success)"
      : "var(--warning)";
  return (
    <span
      className="metric inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none"
      style={{
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        color,
      }}
      title="So với kỳ liền trước cùng độ dài"
    >
      {flat ? "→" : up ? "↑" : "↓"} {flat ? "không đổi" : `${Math.abs(Math.round(value))}%`}
    </span>
  );
}

// Biểu đồ mini trong thẻ chỉ số — tự vẽ, không thêm thư viện.
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const width = 64;
  const height = 22;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point / max) * (height - 2) - 1;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="shrink-0 opacity-80"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyPanel({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground/60">
        Chưa có dữ liệu
      </div>
    </div>
  );
}

