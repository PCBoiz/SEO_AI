"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { SitemapNode } from "@/domain/sitemap/sitemap-structure";

// Sơ đồ CÂY / MINDMAP ngang: Trang chủ (trái) → nhóm mục → trang con, đường nối
// cha-con rõ ràng. Node và chữ cỡ lớn, khung nhìn bám theo kích thước thật của
// cây nên chữ luôn đọc được thay vì bị ép nhỏ giữa khoảng trống.
// Layout "tidy tree" tất định → an toàn SSR.

const COL = 300; // khoảng cách cột theo cấp
const ROW = 46; // khoảng cách hàng (lá)
const NODE_W = 244;
const NODE_H = 38;
const PAD = 32;
const SPECTRUM = ["#4fe3c1", "#35c4f0", "#9b8cff", "#e07ad6"];

interface Placed {
  id: string;
  label: string;
  slug?: string;
  depth: number;
  x: number;
  y: number;
  color: string;
  parentId?: string;
  hasChildren: boolean;
  collapsed: boolean;
  descendants: number;
}

interface Layout {
  nodes: Placed[];
  width: number;
  height: number;
}

function countAll(node: SitemapNode): number {
  return node.children.reduce((total, kid) => total + 1 + countAll(kid), 0);
}

function layoutTree(root: SitemapNode, collapsed: Set<string>): Layout {
  const nodes: Placed[] = [];
  let nextLeafY = PAD;
  let maxDepth = 0;

  function walk(
    node: SitemapNode,
    depth: number,
    id: string,
    parentId: string | undefined,
    color: string,
  ): number {
    maxDepth = Math.max(maxDepth, depth);
    const isCollapsed = collapsed.has(id);
    const kids = isCollapsed ? [] : node.children.slice(0, 60);
    const x = PAD + depth * COL;
    let y: number;
    if (kids.length === 0) {
      y = nextLeafY;
      nextLeafY += ROW;
    } else {
      const ys = kids.map((kid, index) =>
        walk(
          kid,
          depth + 1,
          `${id}-${index}`,
          id,
          depth === 0 ? SPECTRUM[index % SPECTRUM.length] : color,
        ),
      );
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    nodes.push({
      id,
      label: node.label,
      slug: node.slug,
      depth,
      x,
      y,
      color,
      parentId,
      hasChildren: node.children.length > 0,
      collapsed: isCollapsed,
      descendants: countAll(node),
    });
    return y;
  }

  walk(root, 0, "root", undefined, "#9b8cff");
  return {
    nodes,
    width: PAD + maxDepth * COL + NODE_W + PAD,
    height: Math.max(nextLeafY, PAD * 2) + PAD,
  };
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function TreeSitemap({ root }: { root: SitemapNode }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );

  const layout = useMemo(() => layoutTree(root, collapsed), [root, collapsed]);
  const byId = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout],
  );

  // Khung nhìn bám theo kích thước thật của cây → node giữ nguyên cỡ chữ dù cây
  // to hay nhỏ, thay vì bị co lại cho vừa một viewBox cố định.
  const viewW = Math.max(layout.width, 960);
  const viewH = Math.max(layout.height, fullscreen ? 620 : 480);
  const centered = useMemo(
    () => ({
      x: (viewW - layout.width) / 2,
      y: (viewH - layout.height) / 2,
    }),
    [viewW, viewH, layout.width, layout.height],
  );

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState(centered);

  // Cây mới (chạy job khác, hoặc người dùng sửa bản chữ) → canh lại giữa khung.
  // Chỉnh state ngay trong render là cách React khuyến nghị cho "đổi prop thì
  // đặt lại state", tránh một vòng render thừa như khi dùng effect.
  const [seenRoot, setSeenRoot] = useState(root);
  if (seenRoot !== root) {
    setSeenRoot(root);
    setCollapsed(new Set());
    setScale(1);
    setOffset(centered);
  }

  function resetView() {
    setCollapsed(new Set());
    setScale(1);
    setOffset(centered);
  }

  // Thoát toàn màn hình bằng phím Esc.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const activePath = useMemo(() => {
    const set = new Set<string>();
    let cursor = hovered;
    while (cursor) {
      set.add(cursor);
      cursor = byId.get(cursor)?.parentId ?? null;
    }
    return set;
  }, [hovered, byId]);

  function zoomBy(factor: number, cx?: number, cy?: number) {
    setScale((prev) => {
      const next = Math.min(3, Math.max(0.3, prev * factor));
      if (cx !== undefined && cy !== undefined && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const sx = ((cx - rect.left) / rect.width) * viewW;
        const sy = ((cy - rect.top) / rect.height) * viewH;
        setOffset((current) => ({
          x: sx - ((sx - current.x) / prev) * next,
          y: sy - ((sy - current.y) / prev) * next,
        }));
      }
      return next;
    });
  }

  if (root.children.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Chưa đủ dữ liệu để dựng sơ đồ.
      </p>
    );
  }

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background p-3"
          : "relative overflow-hidden rounded-xl border border-border bg-background/40"
      }
    >
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
        <IconBtn
          label={fullscreen ? "Thoát toàn màn hình (Esc)" : "Xem toàn màn hình"}
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </IconBtn>
        <IconBtn label="Phóng to" onClick={() => zoomBy(1.25)}>
          <Plus className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Thu nhỏ" onClick={() => zoomBy(0.8)}>
          <Minus className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Canh vừa khung" onClick={resetView}>
          <RotateCcw className="h-3.5 w-3.5" />
        </IconBtn>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 z-10 text-[11px] text-muted-foreground/60">
        Kéo để di chuyển · lăn chuột để zoom · bấm mục có nhánh để xổ/gập
      </div>

      <svg
        ref={svgRef}
        data-sitemap-svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        role="img"
        aria-label={`Sơ đồ cây cấu trúc site ${root.label}`}
        className={`w-full cursor-grab touch-none select-none active:cursor-grabbing ${
          fullscreen ? "h-full" : "h-[520px] sm:h-[620px]"
        }`}
        onWheel={(event) => {
          event.preventDefault();
          zoomBy(event.deltaY < 0 ? 1.12 : 0.89, event.clientX, event.clientY);
        }}
        onPointerDown={(event) => {
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            ox: offset.x,
            oy: offset.y,
          };
          (event.target as Element).setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current || !svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          setOffset({
            x:
              drag.current.ox +
              (event.clientX - drag.current.x) * (viewW / rect.width),
            y:
              drag.current.oy +
              (event.clientY - drag.current.y) * (viewH / rect.height),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
          setHovered(null);
        }}
      >
        <defs>
          <linearGradient id="tree-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4fe3c1" />
            <stop offset="50%" stopColor="#35c4f0" />
            <stop offset="100%" stopColor="#9b8cff" />
          </linearGradient>
        </defs>

        <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
          {layout.nodes.map((node) => {
            if (!node.parentId) return null;
            const parent = byId.get(node.parentId);
            if (!parent) return null;
            const x1 = parent.x + NODE_W;
            const y1 = parent.y + NODE_H / 2;
            const x2 = node.x;
            const y2 = node.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const lit = activePath.has(node.id);
            return (
              <path
                key={`edge-${node.id}`}
                d={`M ${x1} ${y1} C ${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`}
                fill="none"
                stroke={node.color}
                strokeOpacity={lit ? 0.95 : 0.4}
                strokeWidth={lit ? 3 : 2}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const isRoot = node.depth === 0;
            const lit = activePath.has(node.id);
            const showSlug = Boolean(node.slug) && !isRoot;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                style={{ cursor: node.hasChildren ? "pointer" : "default" }}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (!node.hasChildren) return;
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(node.id)) next.delete(node.id);
                    else next.add(node.id);
                    return next;
                  });
                }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={
                    isRoot
                      ? "url(#tree-core)"
                      : `color-mix(in oklab, ${node.color} 18%, var(--card))`
                  }
                  stroke={node.color}
                  strokeOpacity={lit ? 1 : isRoot ? 0.7 : 0.5}
                  strokeWidth={lit ? 2.5 : 1.5}
                />
                <circle
                  cx={14}
                  cy={NODE_H / 2}
                  r={4}
                  fill={isRoot ? "#0a0a12" : node.color}
                />
                <text
                  x={26}
                  y={showSlug ? 16 : NODE_H / 2}
                  dominantBaseline={showSlug ? "auto" : "middle"}
                  fontSize={15}
                  fontWeight={isRoot ? 700 : lit ? 650 : 550}
                  fill={isRoot ? "#0a0a12" : "currentColor"}
                  className="font-sans"
                >
                  {truncate(node.label, 24)}
                </text>
                {showSlug && (
                  <text
                    x={26}
                    y={30}
                    fontSize={11}
                    fill={node.color}
                    fillOpacity={0.85}
                    className="font-mono"
                  >
                    {truncate(node.slug!, 28)}
                  </text>
                )}
                {node.hasChildren && (
                  <>
                    <circle
                      cx={NODE_W - 16}
                      cy={NODE_H / 2}
                      r={9}
                      fill={
                        isRoot
                          ? "rgba(10,10,18,.18)"
                          : `color-mix(in oklab, ${node.color} 26%, transparent)`
                      }
                    />
                    <text
                      x={NODE_W - 16}
                      y={NODE_H / 2}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={700}
                      fill={isRoot ? "#0a0a12" : node.color}
                    >
                      {node.collapsed ? "+" : "–"}
                    </text>
                  </>
                )}
                <title>
                  {node.collapsed
                    ? `${node.label} — đang gập ${node.descendants} trang bên trong`
                    : node.slug
                      ? `${node.label} (${node.slug})`
                      : node.label}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-popover/80 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
