import type { SitemapNode } from "@/domain/sitemap/sitemap-structure";

// Sơ đồ radial "constellation" cho cấu trúc sitemap: node gốc ở lõi (gradient
// quang phổ), các nhánh cấp 1 toả ra vòng trong, cấp 2 ở vòng ngoài. SVG thuần,
// tính toán tất định (không random) → an toàn SSR, không mismatch hydrate.

const SPECTRUM = ["#4fe3c1", "#35c4f0", "#9b8cff", "#e07ad6"];
const W = 680;
const H = 520;
const CX = W / 2;
const CY = H / 2;
const R1 = 148;
const R2 = 232;

interface Placed {
  node: SitemapNode;
  x: number;
  y: number;
  angle: number;
  color: string;
  ring: 1 | 2;
}

function polar(r: number, angle: number): { x: number; y: number } {
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function display(label: string, max = 22): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function RadialSitemap({ root }: { root: SitemapNode }) {
  const level1 = root.children.slice(0, 32);
  const n = level1.length;

  if (n === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        Chưa đủ dữ liệu để dựng sơ đồ.
      </p>
    );
  }

  const placed: Placed[] = [];
  const window = ((2 * Math.PI) / n) * 0.72;

  level1.forEach((node, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const color = SPECTRUM[i % SPECTRUM.length];
    const p = polar(R1, angle);
    placed.push({ node, x: p.x, y: p.y, angle, color, ring: 1 });

    const kids = node.children.slice(0, 6);
    kids.forEach((kid, j) => {
      const spread = kids.length > 1 ? window : 0;
      const childAngle =
        angle + (j - (kids.length - 1) / 2) * (spread / Math.max(kids.length, 1));
      const cp = polar(R2, childAngle);
      placed.push({ node: kid, x: cp.x, y: cp.y, angle: childAngle, color, ring: 2 });
    });
  });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Sơ đồ cấu trúc site ${root.label} với ${n} nhánh`}
        className="mx-auto h-auto w-full max-w-[680px]"
      >
        <defs>
          <radialGradient id="rs-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#9b8cff" />
            <stop offset="55%" stopColor="#35c4f0" />
            <stop offset="100%" stopColor="#4fe3c1" />
          </radialGradient>
        </defs>

        {/* Vòng nền mờ */}
        <circle cx={CX} cy={CY} r={R1} fill="none" stroke="currentColor" strokeOpacity={0.06} />
        <circle cx={CX} cy={CY} r={R2} fill="none" stroke="currentColor" strokeOpacity={0.04} />

        {/* Đường nối */}
        {placed.map((p, i) => {
          const from =
            p.ring === 1
              ? { x: CX, y: CY }
              : (() => {
                  const parent = polar(R1, parentAngleOf(p, placed));
                  return parent;
                })();
          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={p.x}
              y2={p.y}
              stroke={p.color}
              strokeOpacity={p.ring === 1 ? 0.4 : 0.25}
              strokeWidth={p.ring === 1 ? 1.4 : 1}
            />
          );
        })}

        {/* Node + nhãn */}
        {placed.map((p, i) => {
          const right = Math.cos(p.angle) >= 0;
          const labelX = p.x + (right ? 9 : -9);
          return (
            <g key={`node-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.ring === 1 ? 4.5 : 3}
                fill={p.color}
                fillOpacity={p.ring === 1 ? 1 : 0.75}
              />
              <text
                x={labelX}
                y={p.y}
                dominantBaseline="middle"
                textAnchor={right ? "start" : "end"}
                fill="currentColor"
                fillOpacity={p.ring === 1 ? 0.85 : 0.6}
                fontSize={p.ring === 1 ? 11 : 9.5}
                className="font-sans"
              >
                {display(p.node.label, p.ring === 1 ? 22 : 18)}
              </text>
            </g>
          );
        })}

        {/* Lõi */}
        <circle cx={CX} cy={CY} r={30} fill="url(#rs-core)" />
        <circle cx={CX} cy={CY} r={30} fill="none" stroke="#ffffff" strokeOpacity={0.25} />
        <text
          x={CX}
          y={CY}
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#0a0a12"
          fontSize={10}
          fontWeight={600}
        >
          {display(root.label, 12)}
        </text>
      </svg>
    </div>
  );
}

// Góc của node cha (ring 1) gần nhất với một node ring 2 — để vẽ cạnh cha→con.
function parentAngleOf(child: Placed, all: Placed[]): number {
  let best = child.angle;
  let bestDelta = Infinity;
  for (const candidate of all) {
    if (candidate.ring !== 1) continue;
    const delta = Math.abs(candidate.angle - child.angle);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate.angle;
    }
  }
  return best;
}
