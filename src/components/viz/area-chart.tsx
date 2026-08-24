// Biểu đồ vùng (area chart) tự vẽ bằng SVG — nhẹ, không thư viện ngoài, hợp
// CSP self-contained. Dùng cho xu hướng GSC (clicks/impressions...) và các
// chuỗi thời gian khác. Tất định → an toàn SSR.

export interface AreaSeries {
  label: string;
  color: string;
  points: number[];
}

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 26, left: 36 };

export function AreaChart({
  series,
  labels,
  height = H,
}: {
  series: AreaSeries[];
  labels?: string[];
  height?: number;
}) {
  const withData = series.filter((s) => s.points.length > 0);
  if (withData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        Chưa có dữ liệu để hiển thị.
      </div>
    );
  }

  const n = Math.max(...withData.map((s) => s.points.length));
  const max = Math.max(1, ...withData.flatMap((s) => s.points));
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Biểu đồ xu hướng"
        className="h-auto w-full min-w-[520px]"
      >
        <defs>
          {withData.map((s, si) => (
            <linearGradient
              key={si}
              id={`area-fill-${si}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {/* Lưới ngang + nhãn trục Y */}
        {gridLines.map((g, i) => {
          const gy = PAD.top + innerH - g * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={gy}
                x2={W - PAD.right}
                y2={gy}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={PAD.left - 6}
                y={gy}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                fillOpacity={0.4}
                fontSize={9}
                className="font-mono"
              >
                {Math.round(g * max)}
              </text>
            </g>
          );
        })}

        {/* Nhãn trục X (thưa) */}
        {labels &&
          labels.map((label, i) => {
            if (n > 8 && i % Math.ceil(n / 6) !== 0 && i !== n - 1) return null;
            return (
              <text
                key={i}
                x={x(i)}
                y={height - 8}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.4}
                fontSize={9}
                className="font-mono"
              >
                {label}
              </text>
            );
          })}

        {/* Vùng + đường + điểm cuối nhấn */}
        {withData.map((s, si) => {
          const line = s.points.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area = `${PAD.left},${PAD.top + innerH} ${line} ${x(
            s.points.length - 1,
          )},${PAD.top + innerH}`;
          const last = s.points.length - 1;
          return (
            <g key={si}>
              <polygon points={area} fill={`url(#area-fill-${si})`} />
              <polyline
                points={line}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={x(last)} cy={y(s.points[last])} r={3.5} fill={s.color} />
              <circle
                cx={x(last)}
                cy={y(s.points[last])}
                r={6}
                fill={s.color}
                fillOpacity={0.2}
              />
            </g>
          );
        })}
      </svg>

      {/* Chú thích */}
      {withData.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3 px-2">
          {withData.map((s, si) => (
            <span
              key={si}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
