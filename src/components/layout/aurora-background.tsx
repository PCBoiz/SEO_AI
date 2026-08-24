"use client";

import { useEffect, useRef } from "react";

/**
 * Aurora nền — vẽ vài blob radial theo quang phổ SEO↔GEO trôi nhẹ phía sau
 * toàn app bằng canvas (blend "lighter"). Tôn trọng prefers-reduced-motion:
 * chỉ vẽ 1 khung tĩnh, không animate.
 */
const SPECTRUM = ["#4fe3c1", "#35c4f0", "#9b8cff", "#e07ad6"];

interface Blob {
  hue: string;
  cx: number;
  cy: number;
  r: number;
  dx: number;
  dy: number;
  phase: number;
}

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;

    const blobs: Blob[] = SPECTRUM.map((hue, i) => ({
      hue,
      cx: 0.2 + (i % 2) * 0.55,
      cy: 0.18 + Math.floor(i / 2) * 0.5,
      r: 0.55,
      dx: 0.04 + i * 0.012,
      dy: 0.03 + ((i + 1) % 3) * 0.01,
      phase: i * 1.7,
    }));

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const time = reduceMotion ? 0 : t / 1000;
      const short = Math.min(width, height);

      for (const b of blobs) {
        const ox = Math.sin(time * b.dx + b.phase) * 0.12;
        const oy = Math.cos(time * b.dy + b.phase) * 0.1;
        const x = (b.cx + ox) * width;
        const y = (b.cy + oy) * height;
        const radius = b.r * short * (0.9 + 0.1 * Math.sin(time * 0.2 + b.phase));

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, hexToRgba(b.hue, 0.5));
        grad.addColorStop(0.45, hexToRgba(b.hue, 0.18));
        grad.addColorStop(1, hexToRgba(b.hue, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };

    resize();
    draw(0);

    const onResize = () => {
      resize();
      if (reduceMotion) draw(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="aurora-canvas" aria-hidden="true" />;
}

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
