import Link from "next/link";
import {
  Activity,
  FileCheck2,
  FolderOpen,
  Boxes,
  Search,
  Sparkles,
  ArrowRight,
  MousePointerClick,
  Eye,
  Percent,
  TrendingUp,
} from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { AreaChart } from "@/components/viz/area-chart";
import { AnalyticsInsights } from "@/app/(app)/analytics/analytics-insights";

export const dynamic = "force-dynamic";

const DAYS = 14;

export default async function AnalyticsPage() {
  const identity = await requirePageIdentity();
  const [projects, recentJobs] = await Promise.all([
    getProjectService().list(identity),
    getModuleJobService().listRecentActivity(identity, 50),
  ]);

  // Gom hoạt động theo ngày (14 ngày gần nhất) — dữ liệu nội bộ thật.
  const buckets = buildDayBuckets(DAYS);
  for (const job of recentJobs) {
    const key = startOfDay(new Date(job.createdAt));
    const bucket = buckets.find((b) => b.day === key);
    if (!bucket) continue;
    bucket.total += 1;
    if (job.status === "succeeded") bucket.ok += 1;
  }

  const totalRuns = buckets.reduce((sum, b) => sum + b.total, 0);
  const totalOk = buckets.reduce((sum, b) => sum + b.ok, 0);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const modulesUsed = new Set(recentJobs.map((j) => j.moduleKey)).size;
  const rate = totalRuns > 0 ? Math.round((totalOk / totalRuns) * 100) : null;
  // So sánh nửa sau với nửa đầu của khoảng đang xem để biết đang tăng hay giảm.
  const half = Math.floor(buckets.length / 2);
  const previousRuns = buckets.slice(0, half).reduce((sum, b) => sum + b.total, 0);
  const currentRuns = buckets.slice(half).reduce((sum, b) => sum + b.total, 0);
  const previousOk = buckets.slice(0, half).reduce((sum, b) => sum + b.ok, 0);
  const currentOk = buckets.slice(half).reduce((sum, b) => sum + b.ok, 0);
  const runsDelta = percentChange(previousRuns, currentRuns);
  const okDelta = percentChange(previousOk, currentOk);
  const aiProviders = listAiProviderStatuses().map(({ id, label, model }) => ({
    id,
    label,
    model,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <span className="eyebrow">Theo dõi · SEO + GEO</span>
        <h1 className="display-balance text-2xl font-semibold tracking-tight text-foreground">
          Phân tích hiệu quả
        </h1>
        <p className="text-sm text-muted-foreground">
          Hoạt động tự động hóa trong app + xếp hạng thực tế từ Google Search
          Console (khi kết nối).
        </p>
      </header>

      {/* Hoạt động nội bộ — dữ liệu thật */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={<Activity className="h-4 w-4" />}
            label={`Lần chạy (${DAYS} ngày)`}
            value={String(totalRuns)}
            accent="var(--spectrum-3)"
            delta={runsDelta}
            spark={buckets.map((b) => b.total)}
          />
          <Kpi
            icon={<FileCheck2 className="h-4 w-4" />}
            label="Thành công"
            value={String(totalOk)}
            sub={rate === null ? undefined : `${rate}% tỷ lệ`}
            accent="var(--spectrum-1)"
            delta={okDelta}
            spark={buckets.map((b) => b.ok)}
          />
          <Kpi icon={<FolderOpen className="h-4 w-4" />} label="Dự án hoạt động" value={String(activeProjects)} accent="var(--spectrum-2)" />
          <Kpi icon={<Boxes className="h-4 w-4" />} label="Loại module đã dùng" value={String(modulesUsed)} accent="var(--spectrum-4)" />
        </div>

        <div className="glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TrendingUp className="h-4 w-4 text-seo" /> Hoạt động {DAYS} ngày
            </h2>
            <span className="metric text-xs text-muted-foreground">
              lần chạy / thành công theo ngày
            </span>
          </div>
          <div className="text-foreground">
            <AreaChart
              labels={buckets.map((b) => b.label)}
              series={[
                { label: "Lần chạy", color: "#9b8cff", points: buckets.map((b) => b.total) },
                { label: "Thành công", color: "#4fe3c1", points: buckets.map((b) => b.ok) },
              ]}
            />
          </div>
        </div>

        <AnalyticsInsights aiProviders={aiProviders} />
      </section>

      {/* Google Search Console — kết nối để có dữ liệu thật */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-geo" />
          <h2 className="text-base font-medium text-foreground">
            Google Search Console
          </h2>
          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning">
            Chưa kết nối
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MousePointerClick className="h-4 w-4" />} label="Clicks (28 ngày)" value="—" sub="cần kết nối" accent="var(--spectrum-1)" muted />
          <Kpi icon={<Eye className="h-4 w-4" />} label="Hiển thị" value="—" sub="cần kết nối" accent="var(--spectrum-2)" muted />
          <Kpi icon={<Percent className="h-4 w-4" />} label="CTR" value="—" sub="cần kết nối" accent="var(--spectrum-3)" muted />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Vị trí TB" value="—" sub="cần kết nối" accent="var(--spectrum-4)" muted />
        </div>

        <div className="glass flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-foreground">
              Kết nối Search Console để đo hiệu quả thật
            </h3>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Sau khi kết nối, trang này hiển thị clicks / hiển thị / CTR / vị trí
              trung bình 28 ngày, top trang theo từng bài đã đăng, top truy vấn, và
              bảng &quot;được AI trích dẫn&quot; (GEO). Cần chủ workspace tạo OAuth
              client trên Google Cloud và cấp quyền <code>webmasters.readonly</code>.
            </p>
          </div>
          <ol className="flex flex-col gap-2">
            {[
              "Tạo OAuth 2.0 Client ID trên Google Cloud Console (loại Web).",
              "Thêm redirect URI của app vào danh sách cho phép.",
              "Đặt Client ID/Secret vào biến môi trường trên Vercel.",
              "Bấm “Kết nối Search Console” rồi chọn property khớp website dự án.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="metric mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-accent/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" /> Kết nối Search Console (cần cấu hình)
            </span>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Cấu hình kết nối <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EmptyPanel
            icon={<FileCheck2 className="h-4 w-4 text-seo" />}
            title="Top trang theo bài đã đăng"
            text="Kết nối GSC để xem trang nào lên hạng, kèm thay đổi vị trí."
          />
          <EmptyPanel
            icon={<Sparkles className="h-4 w-4 text-geo" />}
            title="Được AI trích dẫn (GEO)"
            text="Theo dõi nội dung được ChatGPT / Perplexity / AI Overviews nhắc tới."
          />
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Kpi({
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

function EmptyPanel({
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

interface DayBucket {
  day: number;
  label: string;
  total: number;
  ok: number;
}

// Không có gì ở kỳ trước thì không kết luận tăng/giảm (tránh hiện "+100%" vô nghĩa).
function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDayBuckets(days: number): DayBucket[] {
  const out: DayBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      day: d.getTime(),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      total: 0,
      ok: 0,
    });
  }
  return out;
}
