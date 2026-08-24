"use client";

// Xuất sơ đồ sitemap ra file. Chạy hoàn toàn ở trình duyệt (không gửi dữ liệu
// đi đâu): SVG lấy trực tiếp từ DOM, PNG vẽ lại SVG lên canvas.

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // Thu hồi ở lần lặp sau để trình duyệt kịp bắt đầu tải.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadText(
  content: string,
  filename: string,
  type = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([content], { type }), filename);
}

/**
 * Chuẩn hoá SVG trên màn hình thành file đứng độc lập: bỏ pan/zoom hiện tại để
 * ảnh luôn chứa TRỌN sơ đồ, và ghim màu chữ/nền thành giá trị tuyệt đối vì
 * biến CSS (var(--card), currentColor…) không tồn tại khi mở file rời.
 */
export function serializeSitemapSvg(
  source: SVGSVGElement,
  options: { background: string; foreground: string } = {
    background: "#0a0a12",
    foreground: "#e8e8f0",
  },
): { markup: string; width: number; height: number } {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const viewBox = (clone.getAttribute("viewBox") ?? "0 0 1200 700")
    .split(/\s+/)
    .map(Number);
  const width = viewBox[2] || 1200;
  const height = viewBox[3] || 700;

  // Đưa sơ đồ về đúng vị trí gốc (bỏ kéo/zoom của người dùng).
  const group = clone.querySelector("g[transform]");
  group?.setAttribute("transform", "translate(0 0) scale(1)");

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.removeAttribute("class");
  clone.style.removeProperty("height");

  // Nền đặc để ảnh không bị trong suốt khi dán vào slide sáng màu.
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("fill", options.background);
  clone.insertBefore(rect, clone.firstChild);

  resolveComputedColors(source, clone, options.foreground);

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent =
    "text{font-family:ui-sans-serif,system-ui,'Segoe UI',Roboto,sans-serif}" +
    ".font-mono{font-family:ui-monospace,'Cascadia Code',Consolas,monospace}";
  clone.insertBefore(style, clone.firstChild);

  return {
    markup: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}

// Thay biến CSS bằng màu thật đã tính toán, đọc từ phần tử tương ứng trên màn
// hình theo thứ tự duyệt (bản sao có cùng cấu trúc nên chỉ số khớp nhau).
function resolveComputedColors(
  source: SVGSVGElement,
  clone: SVGSVGElement,
  foreground: string,
): void {
  const originals = source.querySelectorAll("rect, text, circle, path");
  const copies = clone.querySelectorAll("rect, text, circle, path");
  copies.forEach((node, index) => {
    // +1 vì bản sao đã được chèn thêm một <rect> nền ở đầu.
    const original = originals[index - 1];
    if (!original) return;
    const computed = window.getComputedStyle(original);
    for (const property of ["fill", "stroke"] as const) {
      const value = computed.getPropertyValue(property);
      if (value && value !== "none" && !value.includes("var(")) {
        node.setAttribute(property, value);
      }
    }
    if (node.tagName === "text" && !node.getAttribute("fill")) {
      node.setAttribute("fill", foreground);
    }
  });
}

export function downloadSitemapSvg(
  svg: SVGSVGElement,
  filename: string,
): void {
  const { markup } = serializeSitemapSvg(svg);
  downloadBlob(
    new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
    filename,
  );
}

/** Vẽ SVG lên canvas rồi xuất PNG (nhân 2 cho ảnh nét trên màn hình retina). */
export async function downloadSitemapPng(
  svg: SVGSVGElement,
  filename: string,
  pixelRatio = 2,
): Promise<void> {
  const { markup, width, height } = serializeSitemapSvg(svg);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ canvas.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!png) throw new Error("Không tạo được ảnh PNG.");
    downloadBlob(png, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được sơ đồ để tạo ảnh."));
    image.src = src;
  });
}

/** Tên file an toàn cho mọi hệ điều hành, giữ chữ có dấu đọc được. */
export function safeFilename(base: string, extension: string): string {
  const cleaned = (base || "sitemap")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${cleaned || "sitemap"}.${extension}`;
}
