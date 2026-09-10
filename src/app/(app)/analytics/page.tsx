import { Suspense } from "react";
import {
  Activity,
  FileCheck2,
  FolderOpen,
  Boxes,
  TrendingUp,
} from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { AreaChart } from "@/components/viz/area-chart";
import { AnalyticsInsights } from "@/app/(app)/analytics/analytics-insights";
import { Kpi } from "@/app/(app)/analytics/thanh-phan-chung";
import {
  KhoiSearchConsole,
  KhungChoSearchConsole,
} from "@/app/(app)/analytics/search-console-section";

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

      {/* ⚠️ BỌC SUSPENSE — TRANG KHÔNG ĐƯỢC CHỜ GOOGLE MỚI HIỆN GÌ.

          Khối này gọi Search Console bốn lượt, mỗi lượt chờ tối đa 20 giây.
          Trước đây nó `await` thẳng trong component trang, nghĩa là Google chậm
          thì TOÀN BỘ trang trắng — kể cả bốn thẻ số hoạt động nội bộ và biểu đồ
          14 ngày, những thứ đọc từ cơ sở dữ liệu của chính mình và chẳng liên
          quan gì tới Google.

          Người dùng mở trang "Phân tích hiệu quả" và nhìn màn hình trắng 20
          giây sẽ kết luận app hỏng, chứ không kết luận "Google đang chậm". */}
      <Suspense fallback={<KhungChoSearchConsole />}>
        <KhoiSearchConsole identity={identity} projects={projects} />
      </Suspense>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

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
