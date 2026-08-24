"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Clapperboard,
  Copy,
  HelpCircle,
  Layers,
  ListChecks,
  Search,
  Star,
} from "lucide-react";

// Thư viện trình bày đầu ra module. Dispatch theo `blockKey` (đáng tin, do ta
// kiểm soát) rồi fallback theo nội dung. Mỗi bộ trình bày tự lùi về "tài liệu có
// cấu trúc" khi không parse được → không bao giờ vỡ. Tất cả view-only; sửa nội
// dung dùng chế độ "Sửa" (textarea) ở runner.

const SPECTRUM = ["#4fe3c1", "#35c4f0", "#9b8cff", "#e07ad6"];

const CODE_KEYS = new Set([
  "jsonLd",
  "videoObject",
  "srt",
  "llmsTxt",
  "sitemapXml",
  "robotsTxt",
]);
const VARIANT_KEYS = new Set(["headlines", "titleVariants", "introVariants"]);
const CHECKLIST_KEYS = new Set(["onPagePlan", "deployGuide"]);

const CODE_LABEL =
  /json|schema|json-?ld|llms|sitemap\.xml|robots|\.txt|\.xml|\.srt|\bsrt\b|phụ đề/i;
const CHIPS_LABEL = /từ khóa|keyword|nhãn|tags?|chủ đề phụ|semantic|lsi/i;

// ─────────────────────────── Dispatcher ───────────────────────────

export function OutputBlockView({
  label,
  value,
  blockKey,
}: {
  label: string;
  value: string;
  blockKey?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <CopyButton value={value} />
      </div>
      <Presenter blockKey={blockKey} label={label} value={value} />
    </div>
  );
}

function Presenter({
  blockKey,
  label,
  value,
}: {
  blockKey?: string;
  label: string;
  value: string;
}) {
  if ((blockKey && CODE_KEYS.has(blockKey)) || CODE_LABEL.test(label) || looksLikeCode(value)) {
    return <CodeViz value={value} />;
  }
  if (blockKey === "faq" || (!blockKey && looksLikeFaq(value))) {
    return <FaqViz value={value} />;
  }
  if (blockKey && VARIANT_KEYS.has(blockKey)) {
    return <VariantsViz value={value} kind={blockKey === "introVariants" ? "intro" : "title"} />;
  }
  if (blockKey === "proposal") return <ProposalViz value={value} />;
  if (blockKey === "script") return <StoryboardViz value={value} />;
  if (blockKey === "thread") return <ThreadViz value={value} />;
  if (blockKey === "carousel") return <CarouselViz value={value} />;
  if (blockKey && CHECKLIST_KEYS.has(blockKey)) {
    return <ChecklistViz value={value} serp={blockKey === "onPagePlan"} />;
  }
  const items = cleanItems(value);
  if (CHIPS_LABEL.test(label) || looksLikeChips(items)) {
    return <ChipsViz value={value} />;
  }
  return <StructuredDocViz value={value} />;
}

// ─────────────────────────── Shared bits ───────────────────────────

function CopyButton({ value, small }: { value: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          },
          () => undefined,
        );
      }}
      className={`flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground ${
        small ? "text-[10px]" : "text-[11px]"
      }`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-success" /> Đã copy
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

// Pill đếm ký tự: xanh khi ≤ ngưỡng (tốt cho CTR), hổ phách khi vượt.
function CharBadge({ len, max }: { len: number; max?: number }) {
  const ok = max === undefined ? null : len <= max;
  const color = ok === null ? "#8a8aa0" : ok ? "#4fe3c1" : "#e0a04a";
  return (
    <span
      className="metric shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] leading-none"
      style={{
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        color,
      }}
    >
      {max === undefined ? `${len} ký tự` : `${len}/${max}`}
      {ok ? " ✓" : ""}
    </span>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="metric shrink-0 rounded px-1.5 py-0.5 text-[10px] leading-none"
      style={{
        background: `color-mix(in oklab, ${color} 16%, transparent)`,
        color,
      }}
    >
      {text}
    </span>
  );
}

function cleanItems(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^([-*•·▪◦●○>»]+|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function looksLikeChips(items: string[]): boolean {
  return (
    items.length >= 3 &&
    items.length <= 40 &&
    items.every((item) => item.length <= 44 && item.split(/\s+/).length <= 6)
  );
}

function looksLikeCode(value: string): boolean {
  const t = value.trim();
  return (
    t.startsWith("{") ||
    t.startsWith("[") ||
    t.startsWith("<") ||
    t.includes("```") ||
    /^\s*"@context"/m.test(t) ||
    /^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(t)
  );
}

function looksLikeFaq(value: string): boolean {
  const lines = value.split(/\r?\n/).filter((l) => l.trim());
  const q = lines.filter(
    (l) => /\?\s*$/.test(l.trim()) || /^\s*(q\d*|câu hỏi|hỏi)\s*\d*\s*[:.)-]/i.test(l),
  ).length;
  return q >= 2;
}

function stripInlineMd(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

// Render **đậm** và `mã` inline thành node thật.
function renderInline(text: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`(.+?)`/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={key++} className="rounded bg-background/70 px-1 font-mono text-[0.9em]">
          {m[2]}
        </code>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Nhãn ưu tiên / ý định — CHỈ nhận dạng khi có tiền tố rõ ràng để tránh dương
// tính giả trong văn xuôi tiếng Việt ("cao", "thấp" là từ thường gặp).
function extractMarkers(line: string): Array<{ text: string; color: string }> {
  const out: Array<{ text: string; color: string }> = [];
  const prio = line.match(
    /(?:ưu tiên|mức độ|mức|priority)\s*[:\-–]?\s*(cao|trung bình|thấp|high|medium|low)/i,
  );
  if (prio) {
    const v = prio[1].toLowerCase();
    if (/cao|high/.test(v)) out.push({ text: "Ưu tiên cao", color: "#4fe3c1" });
    else if (/trung|medium/.test(v)) out.push({ text: "Ưu tiên TB", color: "#35c4f0" });
    else out.push({ text: "Ưu tiên thấp", color: "#9b8cff" });
  }
  const intent = line.match(
    /(?:ý định|intent)\s*[:\-–]?\s*(informational|commercial|transactional|navigational|thông tin|thương mại|giao dịch|điều hướng)/i,
  );
  if (intent) {
    const v = intent[1].toLowerCase();
    const label = /information|thông tin/.test(v)
      ? "Thông tin"
      : /commercial|thương mại/.test(v)
        ? "Thương mại"
        : /transaction|giao dịch/.test(v)
          ? "Giao dịch"
          : "Điều hướng";
    out.push({ text: label, color: "#e07ad6" });
  }
  return out;
}

// ─────────────────────────── Code / JSON-LD / SRT / txt ───────────────────────────

function CodeViz({ value }: { value: string }) {
  const { display, valid, wrapped } = useMemo(() => prettyCode(value), [value]);
  const lineCount = display.split(/\r?\n/).length;
  const [open, setOpen] = useState(lineCount <= 26);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <span className="flex items-center gap-2">
          <span className="eyebrow">Mã / dữ liệu có cấu trúc</span>
          {valid === true && <Tag text="JSON hợp lệ ✓" color="#4fe3c1" />}
          {valid === false && <Tag text="Kiểm tra cú pháp" color="#e0a04a" />}
          {wrapped && <Tag text="đã tách <script>" color="#9b8cff" />}
        </span>
        <span className="metric text-[10px] text-muted-foreground/70">{lineCount} dòng</span>
      </div>
      <pre
        className={`overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-relaxed text-foreground ${
          open ? "max-h-96" : "max-h-40"
        }`}
      >
        {display}
      </pre>
      {lineCount > 26 && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? "Thu gọn" : `Xem tất cả ${lineCount} dòng`}
        </button>
      )}
    </div>
  );
}

function prettyCode(value: string): {
  display: string;
  valid: boolean | null;
  wrapped: boolean;
} {
  const t = value.trim();
  // Tách JSON bên trong <script type="application/ld+json"> … </script>.
  const scriptMatch = t.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  const wrapped = Boolean(scriptMatch);
  const body = (scriptMatch ? scriptMatch[1] : t).trim();
  if (body.startsWith("{") || body.startsWith("[")) {
    try {
      return { display: JSON.stringify(JSON.parse(body), null, 2), valid: true, wrapped };
    } catch {
      return { display: body, valid: false, wrapped };
    }
  }
  return { display: t, valid: null, wrapped: false };
}

// ─────────────────────────── Chips (từ khóa ngắn) ───────────────────────────

function ChipsViz({ value }: { value: string }) {
  const items = cleanItems(value);
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background/40 p-3">
      {items.map((item, i) => {
        const color = SPECTRUM[i % SPECTRUM.length];
        return (
          <span
            key={`${item}-${i}`}
            className="metric rounded-full border px-2 py-0.5 text-xs"
            style={{
              borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
              background: `color-mix(in oklab, ${color} 12%, transparent)`,
              color,
            }}
          >
            {item}
          </span>
        );
      })}
    </div>
  );
}

// ─────────────────────────── A/B variants (so sánh) ───────────────────────────

interface Variant {
  index: number;
  text: string;
  reason?: string;
}

function parseVariants(value: string): Variant[] {
  const lines = value.split(/\r?\n/);
  const out: Variant[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (m) {
      out.push({ index: Number(m[1]), text: m[2].trim() });
    } else if (out.length > 0) {
      out[out.length - 1].text += ` ${line}`;
    }
  }
  return out.map((v) => {
    // Tách lý do "(góc: …)" hoặc "(…)" ở cuối.
    const rm = v.text.match(/\s*[（(]\s*(?:góc\s*[:：]?\s*)?(.+?)\s*[）)]\s*$/i);
    if (rm) {
      return { ...v, text: stripInlineMd(v.text.slice(0, rm.index).trim()), reason: rm[1].trim() };
    }
    return { ...v, text: stripInlineMd(v.text) };
  });
}

function VariantsViz({ value, kind }: { value: string; kind: "title" | "intro" }) {
  const variants = useMemo(() => parseVariants(value), [value]);
  const [fav, setFav] = useState<number | null>(null);
  if (variants.length < 2) return <StructuredDocViz value={value} />;
  return (
    <div className="flex flex-col gap-2">
      {variants.map((v) => {
        const color = SPECTRUM[(v.index - 1) % SPECTRUM.length];
        const chosen = fav === v.index;
        return (
          <div
            key={v.index}
            className={`flex items-start gap-3 rounded-lg border bg-background/40 p-3 transition-colors ${
              chosen ? "border-transparent" : "border-border"
            }`}
            style={chosen ? { boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
          >
            <span
              className="metric mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
            >
              {v.index}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className={`text-sm ${kind === "title" ? "font-medium" : ""} text-foreground`}>
                {v.text}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {kind === "title" && <CharBadge len={v.text.length} max={60} />}
                {v.reason && <Tag text={v.reason} color={color} />}
              </div>
            </div>
            <button
              type="button"
              title="Đánh dấu bản ưng ý"
              onClick={() => setFav((f) => (f === v.index ? null : v.index))}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Star className="h-4 w-4" fill={chosen ? color : "none"} color={chosen ? color : "currentColor"} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── FAQ (accordion) ───────────────────────────

interface Qa {
  q: string;
  a: string;
}

function parseFaq(value: string): Qa[] {
  const lines = value.split(/\r?\n/);
  const out: Qa[] = [];
  const isQ = (l: string) =>
    /\?\s*$/.test(l) || /^\s*(q\d*|câu hỏi|hỏi)\s*\d*\s*[:.)-]/i.test(l);
  for (const raw of lines) {
    const line = stripInlineMd(raw.trim());
    if (!line) continue;
    if (isQ(line)) {
      out.push({ q: line.replace(/^\s*(q\d*|câu hỏi|hỏi)\s*\d*\s*[:.)-]\s*/i, "").trim(), a: "" });
    } else if (out.length > 0) {
      const cur = out[out.length - 1];
      const clean = line.replace(/^\s*(a\d*|trả lời|đáp)\s*\d*\s*[:.)-]\s*/i, "").trim();
      cur.a = cur.a ? `${cur.a}\n${clean}` : clean;
    }
  }
  return out.filter((qa) => qa.q);
}

function FaqViz({ value }: { value: string }) {
  const qas = useMemo(() => parseFaq(value), [value]);
  if (qas.length < 2) return <StructuredDocViz value={value} />;
  return (
    <div className="flex flex-col gap-1.5">
      {qas.map((qa, i) => (
        <details
          key={i}
          open={i === 0}
          className="group rounded-lg border border-border bg-background/40"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium text-foreground">
            <ChevronRight className="h-4 w-4 shrink-0 text-seo transition-transform group-open:rotate-90" />
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {qa.q}
          </summary>
          {qa.a && (
            <p className="whitespace-pre-wrap px-3 pb-3 pl-9 text-sm leading-relaxed text-muted-foreground">
              {qa.a}
            </p>
          )}
        </details>
      ))}
    </div>
  );
}

// ─────────────────── Bảng đối chiếu Hiện tại ↔ Đề xuất (#20) ───────────────────
// Mỗi dòng: "Tên trang | /duong-dan | NHÃN | lý do". Nhãn quyết định màu và
// nhóm, để nhìn phát biết AI định động vào đâu.

const PROPOSAL_LABELS: Record<string, { color: string; icon: string }> = {
  "GIỮ NGUYÊN": { color: "#4fe3c1", icon: "✓" },
  "CHUYỂN VỊ TRÍ": { color: "#35c4f0", icon: "→" },
  "GỘP LẠI": { color: "#e0a04a", icon: "⇢" },
  "VIẾT LẠI": { color: "#9b8cff", icon: "✎" },
  "THÊM MỚI": { color: "#e07ad6", icon: "+" },
};

interface ProposalRow {
  title: string;
  slug?: string;
  label?: string;
  reason?: string;
}

function parseProposal(value: string): ProposalRow[] {
  const rows: ProposalRow[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = stripInlineMd(raw.trim()).replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    if (!line || !line.includes("|")) continue;
    const parts = line.split("|").map((part) => part.trim());
    const labelIndex = parts.findIndex((part) =>
      Object.keys(PROPOSAL_LABELS).includes(part.toUpperCase()),
    );
    rows.push({
      title: parts[0],
      slug: parts[1]?.startsWith("/") ? parts[1] : undefined,
      label: labelIndex >= 0 ? parts[labelIndex].toUpperCase() : undefined,
      reason: labelIndex >= 0 ? parts.slice(labelIndex + 1).join(" · ") : undefined,
    });
  }
  return rows;
}

function ProposalViz({ value }: { value: string }) {
  const rows = useMemo(() => parseProposal(value), [value]);
  // AI công bố cách nó hiểu ngành nghề — hiện lên đầu để người dùng kiểm chứng
  // ngay, vì mọi đề xuất bên dưới đều dựa trên cách hiểu này.
  const domain = useMemo(() => {
    const line = value
      .split(/\r?\n/)
      .map((item) => stripInlineMd(item.trim()))
      .find((item) => /^LĨNH VỰC\s*:/i.test(item));
    return line?.replace(/^LĨNH VỰC\s*:\s*/i, "").trim();
  }, [value]);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (row.label) map.set(row.label, (map.get(row.label) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  if (rows.length < 2) return <StructuredDocViz value={value} />;

  return (
    <div className="flex flex-col gap-2">
      {domain && (
        <div className="rounded-lg border border-spectrum-3/30 bg-spectrum-3/5 p-3">
          <p className="eyebrow mb-1">AI hiểu website của bạn là</p>
          <p className="text-sm text-foreground">{domain}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Nếu mô tả này sai, mọi đề xuất bên dưới cũng sẽ lệch — hãy sửa ô
            &quot;Từ khóa / lĩnh vực trọng tâm&quot; rồi chạy lại.
          </p>
        </div>
      )}
      {counts.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...counts.entries()].map(([label, count]) => {
            const config = PROPOSAL_LABELS[label];
            return (
              <span
                key={label}
                className="metric rounded-full px-2 py-0.5 text-[11px]"
                style={{
                  background: `color-mix(in oklab, ${config.color} 16%, transparent)`,
                  color: config.color,
                }}
              >
                {config.icon} {label}: {count}
              </span>
            );
          })}
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {rows.map((row, index) => {
          const config = row.label ? PROPOSAL_LABELS[row.label] : undefined;
          const color = config?.color ?? "#8a8aa0";
          return (
            <li
              key={index}
              className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              <span
                className="metric mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-semibold"
                style={{
                  background: `color-mix(in oklab, ${color} 18%, transparent)`,
                  color,
                }}
              >
                {config?.icon ?? "•"}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {row.title}
                  </span>
                  {row.slug && (
                    <span className="metric text-[11px] text-muted-foreground">
                      {row.slug}
                    </span>
                  )}
                  {row.label && <Tag text={row.label} color={color} />}
                </span>
                {row.reason && (
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {row.reason}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────── Storyboard video (#17) ───────────────────────────

interface Scene {
  title: string;
  time?: string;
  visual?: string;
  voice?: string;
}

function parseStoryboard(value: string): Scene[] {
  const blocks = value.split(/\n(?=\s*Cảnh\s*\d+)/i);
  const scenes: Scene[] = [];
  for (const block of blocks) {
    const b = block.trim();
    if (!/^Cảnh\s*\d+/i.test(b)) continue;
    const header = b.split(/\r?\n/)[0];
    const time = header.match(/\(([^)]*\d{1,2}:\d{2}[^)]*)\)/)?.[1];
    const title = header.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const visual = b.match(/HÌNH\s*[:：]\s*([\s\S]*?)(?=\n\s*LỜI\s*[:：]|$)/i)?.[1]?.trim();
    const voice = b.match(/LỜI\s*[:：]\s*([\s\S]*?)$/i)?.[1]?.trim();
    scenes.push({ title, time, visual, voice });
  }
  return scenes;
}

function StoryboardViz({ value }: { value: string }) {
  const scenes = useMemo(() => parseStoryboard(value), [value]);
  if (scenes.length === 0 || !scenes.some((s) => s.visual || s.voice)) {
    return <StructuredDocViz value={value} />;
  }
  return (
    <div className="flex flex-col gap-2">
      {scenes.map((s, i) => {
        const color = SPECTRUM[i % SPECTRUM.length];
        return (
          <div key={i} className="overflow-hidden rounded-lg border border-border bg-background/40">
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}
            >
              <Clapperboard className="h-3.5 w-3.5 shrink-0" style={{ color }} />
              <span className="text-sm font-semibold text-foreground">{s.title}</span>
              {s.time && <span className="metric ml-auto text-[11px] text-muted-foreground">{s.time}</span>}
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-2">
              <div className="bg-background/40 p-3">
                <p className="eyebrow mb-1 flex items-center gap-1">🎬 Hình / khung</p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {s.visual || "—"}
                </p>
              </div>
              <div className="bg-background/40 p-3">
                <p className="eyebrow mb-1 flex items-center gap-1">🎙️ Lời thoại</p>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                  {s.voice || "—"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Thread X/Threads (#18) ───────────────────────────

function parseThread(value: string): string[] {
  const posts: string[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+\s*\/\s*\d*/.test(line)) {
      posts.push(line.replace(/^\d+\s*\/\s*\d*\s*/, "").trim());
    } else if (posts.length > 0) {
      posts[posts.length - 1] += ` ${line}`;
    }
  }
  return posts.filter(Boolean);
}

function ThreadViz({ value }: { value: string }) {
  const posts = useMemo(() => parseThread(value), [value]);
  if (posts.length < 2) return <StructuredDocViz value={value} />;
  return (
    <div className="flex flex-col">
      {posts.map((p, i) => (
        <div key={i} className="relative flex gap-3 pb-3">
          {i < posts.length - 1 && (
            <span className="absolute left-[11px] top-6 h-full w-px bg-border" aria-hidden />
          )}
          <span className="metric z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border bg-background/40 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{p}</p>
            <CharBadge len={p.length} max={280} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────── Carousel LinkedIn/IG (#18) ───────────────────────────

interface Slide {
  n: string;
  title?: string;
  body?: string;
  image?: string;
}

function parseCarousel(value: string): Slide[] {
  const slides: Slide[] = [];
  for (const raw of value.split(/\n(?=\s*Slide\s*\d+)/i)) {
    const b = raw.trim();
    if (!/^Slide\s*\d+/i.test(b)) continue;
    const n = b.match(/^Slide\s*(\d+)/i)?.[1] ?? "";
    const flat = b.replace(/\r?\n/g, " ");
    const title = flat.match(/TIÊU ĐỀ\s*[:：]\s*(.*?)(?=\s*\||NỘI DUNG\s*[:：]|HÌNH\s*[:：]|$)/i)?.[1]?.trim();
    const body = flat.match(/NỘI DUNG\s*[:：]\s*(.*?)(?=\s*\||HÌNH\s*[:：]|$)/i)?.[1]?.trim();
    const image = flat.match(/HÌNH\s*[:：]\s*(.*?)(?=\s*\||$)/i)?.[1]?.trim();
    slides.push({ n, title, body, image });
  }
  return slides;
}

function CarouselViz({ value }: { value: string }) {
  const slides = useMemo(() => parseCarousel(value), [value]);
  if (slides.length < 2) return <StructuredDocViz value={value} />;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {slides.map((s, i) => {
        const color = SPECTRUM[i % SPECTRUM.length];
        return (
          <div
            key={i}
            className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="metric text-[10px] uppercase tracking-wide text-muted-foreground">
                Slide {s.n}
              </span>
              <Layers className="h-3.5 w-3.5" style={{ color }} />
            </div>
            {s.title && <p className="text-sm font-semibold leading-snug text-foreground">{s.title}</p>}
            {s.body && <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>}
            {s.image && (
              <p className="mt-auto rounded-md border border-dashed border-border p-2 text-[11px] text-muted-foreground/80">
                🖼️ {s.image}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Checklist + SERP preview (#5, #13) ───────────────────────────

interface Task {
  title: string;
  detail: string;
}

function parseTasks(value: string): Task[] {
  const lines = value.split(/\r?\n/);
  const out: Task[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed) continue;
    const top = trimmed.match(/^(?:\d+[.)]|[-*•])\s+(.*)$/);
    const isIndented = /^\s{2,}/.test(line);
    if (top && !isIndented) {
      out.push({ title: stripInlineMd(top[1].trim()), detail: "" });
    } else if (out.length > 0) {
      const clean = stripInlineMd(trimmed.replace(/^(?:[-*•]|\d+[.)])\s+/, ""));
      out[out.length - 1].detail += (out[out.length - 1].detail ? "\n" : "") + clean;
    }
  }
  return out;
}

function findField(value: string, keys: string): string | null {
  const re = new RegExp(`^\\s*(?:\\*\\*)?\\s*(?:${keys})\\b[^:：\\-–]*[:：\\-–]\\s*(.+)$`, "i");
  for (const raw of value.split(/\r?\n/)) {
    const m = raw.match(re);
    if (m && m[1]) {
      return stripInlineMd(m[1].trim())
        .replace(/\s*\([^)]*ký tự[^)]*\)\s*$/i, "")
        .replace(/^["'“”]|["'“”]$/g, "")
        .trim();
    }
  }
  return null;
}

function SerpPreview({ value }: { value: string }) {
  const title = findField(value, "title tag|thẻ title|tiêu đề");
  const meta = findField(value, "meta description|thẻ meta|mô tả meta|meta");
  const slug = findField(value, "slug|đường dẫn|url");
  if (!title || !meta) return null;
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p className="eyebrow mb-2 flex items-center gap-1.5">
        <Search className="h-3 w-3" /> Xem trước trên Google
      </p>
      <p className="truncate text-xs text-emerald-400/90">
        {slug ? (slug.startsWith("http") ? slug : `example.com › ${slug.replace(/^\//, "")}`) : "example.com"}
      </p>
      <p className="mt-0.5 text-base leading-snug text-[#8ab4f8]">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{meta}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <CharBadge len={title.length} max={60} />
        <CharBadge len={meta.length} max={155} />
      </div>
    </div>
  );
}

function ChecklistViz({ value, serp }: { value: string; serp?: boolean }) {
  const tasks = useMemo(() => parseTasks(value), [value]);
  const [done, setDone] = useState<Set<number>>(new Set());
  if (tasks.length < 2) {
    return (
      <div className="flex flex-col gap-2">
        {serp && <SerpPreview value={value} />}
        <StructuredDocViz value={value} />
      </div>
    );
  }
  const completed = done.size;
  return (
    <div className="flex flex-col gap-2">
      {serp && <SerpPreview value={value} />}
      <div className="overflow-hidden rounded-lg border border-border bg-background/40">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <ListChecks className="h-3.5 w-3.5 text-seo" />
          <span className="text-xs font-medium text-foreground">Việc cần làm</span>
          <span className="metric ml-auto text-[11px] text-muted-foreground">
            {completed}/{tasks.length}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {tasks.map((t, i) => {
            const checked = done.has(i);
            return (
              <li key={i} className="flex items-start gap-3 p-3">
                <button
                  type="button"
                  onClick={() =>
                    setDone((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked ? "border-transparent bg-seo text-[#0a0a12]" : "border-border"
                  }`}
                  aria-label={checked ? "Bỏ đánh dấu" : "Đánh dấu hoàn thành"}
                >
                  {checked && <Check className="h-3 w-3" />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={`text-sm ${checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {renderInline(t.title)}
                  </span>
                  {t.detail && (
                    <span className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {t.detail}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────── Structured document (mặc định) ───────────────────────────
// Gom nội dung theo heading thành thẻ mục; cụm bullet ngắn → chips; bảng markdown
// → bảng thật; gắn nhãn ưu tiên/ý định; đếm ký tự cho dòng Title/Meta.

type Line =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "number"; index: number; text: string }
  | { kind: "table"; cells: string[] }
  | { kind: "text"; text: string };

function parseLines(value: string): Line[] {
  const out: Line[] = [];
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^###\s+/.test(line)) out.push({ kind: "h", level: 3, text: line.replace(/^###\s+/, "") });
    else if (/^##\s+/.test(line)) out.push({ kind: "h", level: 2, text: line.replace(/^##\s+/, "") });
    else if (/^#\s+/.test(line)) out.push({ kind: "h", level: 1, text: line.replace(/^#\s+/, "") });
    else if (/^\|.*\|$/.test(line))
      out.push({ kind: "table", cells: line.slice(1, -1).split("|").map((c) => c.trim()) });
    else if (/^[-*•·]\s+/.test(line)) out.push({ kind: "bullet", text: line.replace(/^[-*•·]\s+/, "") });
    else if (/^\d+[.)]\s+/.test(line)) {
      const index = Number(line.match(/^(\d+)/)?.[1] ?? "0");
      out.push({ kind: "number", index, text: line.replace(/^\d+[.)]\s+/, "") });
    } else out.push({ kind: "text", text: line });
  }
  return out;
}

// Cắt danh sách dòng thành các mục (mỗi heading mở một mục; nội dung trước
// heading đầu tiên vào mục không tiêu đề).
interface Section {
  title?: string;
  level: number;
  body: Line[];
}

function toSections(lines: Line[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { level: 0, body: [] };
  for (const line of lines) {
    if (line.kind === "h") {
      if (current.title || current.body.length > 0) sections.push(current);
      current = { title: line.text, level: line.level, body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.title || current.body.length > 0) sections.push(current);
  return sections;
}

function isChip(line: Line): boolean {
  return (
    line.kind === "bullet" &&
    line.text.length <= 40 &&
    line.text.split(/\s+/).length <= 6 &&
    !/[:：]/.test(line.text)
  );
}

function StructuredDocViz({ value }: { value: string }) {
  const sections = useMemo(() => toSections(parseLines(value)), [value]);
  const hasTitles = sections.some((s) => s.title);
  if (!hasTitles && sections.length === 1) {
    // Không có heading → một khối phẳng, vẫn render bullet/số/bảng đẹp.
    return (
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <SectionBody body={sections[0]?.body ?? []} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {sections.map((s, i) => {
        const color = SPECTRUM[i % SPECTRUM.length];
        return (
          <div
            key={i}
            className="rounded-lg border border-border bg-background/40 p-4"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            {s.title && (
              <p
                className={`mb-2 font-semibold text-foreground ${s.level >= 3 ? "text-sm" : "text-[15px]"}`}
              >
                {renderInline(s.title)}
              </p>
            )}
            <SectionBody body={s.body} />
          </div>
        );
      })}
    </div>
  );
}

function SectionBody({ body }: { body: Line[] }) {
  // Gom bullet ngắn liên tiếp thành cụm chips; các dòng khác render tuần tự.
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < body.length) {
    const line = body[i];
    // Cụm chips.
    if (isChip(line)) {
      const chips: string[] = [];
      while (i < body.length && isChip(body[i])) {
        chips.push((body[i] as { text: string }).text);
        i += 1;
      }
      if (chips.length >= 3) {
        parts.push(
          <div key={key++} className="flex flex-wrap gap-1.5 py-0.5">
            {chips.map((c, j) => {
              const color = SPECTRUM[j % SPECTRUM.length];
              return (
                <span
                  key={j}
                  className="metric rounded-full border px-2 py-0.5 text-xs"
                  style={{
                    borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
                    background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    color,
                  }}
                >
                  {c}
                </span>
              );
            })}
          </div>,
        );
        continue;
      }
      // Ít hơn 3 → trả về bullet thường.
      for (const c of chips) parts.push(<BulletRow key={key++} text={c} />);
      continue;
    }
    // Bảng markdown liên tiếp.
    if (line.kind === "table") {
      const rows: string[][] = [];
      while (i < body.length && body[i].kind === "table") {
        rows.push((body[i] as { cells: string[] }).cells);
        i += 1;
      }
      parts.push(<MarkdownTable key={key++} rows={rows} />);
      continue;
    }
    if (line.kind === "bullet") {
      parts.push(<BulletRow key={key++} text={line.text} />);
    } else if (line.kind === "number") {
      parts.push(
        <div key={key++} className="flex gap-2 py-0.5 text-sm text-muted-foreground">
          <span className="metric shrink-0 font-semibold text-geo">{line.index}.</span>
          <LineWithMeta text={line.text} />
        </div>,
      );
    } else if (line.kind === "h") {
      parts.push(
        <p key={key++} className="mt-1 text-sm font-semibold text-foreground">
          {renderInline(line.text)}
        </p>,
      );
    } else {
      parts.push(
        <p key={key++} className="py-0.5 text-sm leading-relaxed text-muted-foreground">
          <LineWithMeta text={line.text} />
        </p>,
      );
    }
    i += 1;
  }
  return <div className="flex flex-col gap-1">{parts}</div>;
}

function BulletRow({ text }: { text: string }) {
  return (
    <div className="flex gap-2 py-0.5 text-sm text-muted-foreground">
      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-seo" />
      <LineWithMeta text={text} />
    </div>
  );
}

// Render một dòng + gắn nhãn ưu tiên/ý định + đếm ký tự nếu là Title/Meta.
function LineWithMeta({ text }: { text: string }) {
  const markers = extractMarkers(text);
  const titleField = text.match(/^\s*(?:title tag|thẻ title|tiêu đề)\b[^:：]*[:：]\s*(.+)$/i);
  const metaField = text.match(/^\s*(?:meta description|thẻ meta|mô tả meta|meta)\b[^:：]*[:：]\s*(.+)$/i);
  const field = titleField
    ? { text: titleField[1].trim(), max: 60 }
    : metaField
      ? { text: metaField[1].trim(), max: 155 }
      : null;
  return (
    <span className="flex flex-1 flex-wrap items-center gap-1.5">
      <span>{renderInline(text)}</span>
      {field && <CharBadge len={stripInlineMd(field.text).length} max={field.max} />}
      {markers.map((m, i) => (
        <Tag key={i} text={m.text} color={m.color} />
      ))}
    </span>
  );
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  // Bỏ dòng phân cách "---".
  const clean = rows.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c.trim()) || c.trim() === ""));
  if (clean.length === 0) return null;
  const [head, ...bodyRows] = clean;
  return (
    <div className="my-1 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-background/60">
            {head.map((c, i) => (
              <th key={i} className="border-b border-border px-2.5 py-1.5 text-left font-semibold text-foreground">
                {renderInline(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((r, i) => (
            <tr key={i} className="odd:bg-background/20">
              {r.map((c, j) => (
                <td key={j} className="border-b border-border px-2.5 py-1.5 align-top text-muted-foreground">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
