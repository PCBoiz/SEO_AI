import Link from "next/link";
import {
  FolderOpen,
  FileCheck2,
  Activity,
  Rocket,
  ArrowRight,
  Plus,
  Search,
  Workflow,
  Circle,
} from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import {
  listModuleDefinitions,
  getModuleDefinition,
} from "@/domain/modules/module-definition";
import { articlePipelineModuleKeys } from "@/domain/modules/registry";
import type {
  ModuleJob,
  ModuleJobStatus,
} from "@/domain/modules/module-job";

export const dynamic = "force-dynamic";

const statusMeta: Record<
  ModuleJobStatus,
  { label: string; dot: string; text: string }
> = {
  queued: { label: "Đang chờ", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  dispatching: { label: "Đang khởi động", dot: "bg-spectrum-2", text: "text-spectrum-2" },
  running: { label: "Đang chạy", dot: "bg-spectrum-2 animate-pulse", text: "text-spectrum-2" },
  succeeded: { label: "Hoàn thành", dot: "bg-success", text: "text-success" },
  failed: { label: "Thất bại", dot: "bg-destructive", text: "text-destructive" },
  timed_out: { label: "Quá giờ", dot: "bg-warning", text: "text-warning" },
};

export default async function DashboardPage() {
  const identity = await requirePageIdentity();
  const [projects, recentJobs] = await Promise.all([
    getProjectService().list(identity),
    getModuleJobService().listRecentActivity(identity, 50),
  ]);

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const moduleTitleByKey = new Map(
    listModuleDefinitions({ keCaAn: true }).map((m) => [m.key, `${m.moduleNumber}. ${m.title}`]),
  );

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const wpConnected = projects.filter(
    (p) => p.integrations.wordpress.status === "configured",
  ).length;

  const succeeded = recentJobs.filter((j) => j.status === "succeeded").length;
  const failed = recentJobs.filter(
    (j) => j.status === "failed" || j.status === "timed_out",
  ).length;
  const running = recentJobs.filter((j) =>
    ["queued", "dispatching", "running"].includes(j.status),
  ).length;
  const terminal = succeeded + failed;
  const successRate = terminal > 0 ? Math.round((succeeded / terminal) * 100) : null;
  const moduleCount = listModuleDefinitions().length;

  const isFresh = projects.length === 0 && recentJobs.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <span className="eyebrow">Mission control</span>
        <h1 className="display-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Đưa nội dung <span className="aurora-text">bay lên top</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Toàn cảnh tự động hóa SEO &amp; GEO của workspace{" "}
          <span className="text-foreground">{identity.workspaceName}</span>.
        </p>
      </header>

      {isFresh ? (
        <OnboardingHero />
      ) : (
        <>
          {/* KPI */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              icon={<FolderOpen className="h-4 w-4" />}
              label="Dự án"
              value={projects.length}
              sub={`${activeProjects} đang hoạt động`}
              accent="var(--spectrum-1)"
            />
            <KpiCard
              icon={<FileCheck2 className="h-4 w-4" />}
              label="Nội dung đã tạo"
              value={succeeded}
              sub={
                successRate === null
                  ? "trong các lần chạy gần đây"
                  : `tỷ lệ thành công ${successRate}%`
              }
              accent="var(--spectrum-2)"
            />
            <KpiCard
              icon={<Activity className="h-4 w-4" />}
              label="Đang chạy"
              value={running}
              sub={failed > 0 ? `${failed} lần lỗi cần xem` : "không có lỗi gần đây"}
              subTone={failed > 0 ? "text-warning" : undefined}
              accent="var(--spectrum-3)"
            />
            <KpiCard
              icon={<Workflow className="h-4 w-4" />}
              label="Module sẵn sàng"
              value={moduleCount}
              sub={`${wpConnected} dự án nối WordPress`}
              accent="var(--spectrum-4)"
            />
          </section>

          {/* Activity + phụ trợ */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Hoạt động gần đây */}
            <div className="glass flex flex-col p-5 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="h-4 w-4 text-seo" />
                  Hoạt động gần đây
                </h2>
                <Link
                  href="/outputs"
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tất cả đầu ra <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {recentJobs.length === 0 ? (
                <EmptyRow text="Chưa có lần chạy nào. Bắt đầu từ Tự động hóa hoặc Quy trình." />
              ) : (
                <ol className="flex flex-col">
                  {recentJobs.slice(0, 8).map((job, idx) => (
                    <ActivityRow
                      key={job.id}
                      job={job}
                      title={moduleTitleByKey.get(job.moduleKey) ?? job.moduleKey}
                      project={projectNameById.get(job.projectId) ?? "Dự án"}
                      last={idx === Math.min(recentJobs.length, 8) - 1}
                    />
                  ))}
                </ol>
              )}
            </div>

            {/* Cột phải */}
            <div className="flex flex-col gap-4 lg:col-span-2">
              <PipelineMini />
              <GeoConnectCard />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function KpiCard({
  icon,
  label,
  value,
  sub,
  subTone,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  subTone?: string;
  accent: string;
}) {
  return (
    <div className="glass glass-hover flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          {icon}
        </span>
      </div>
      <span className="metric text-3xl font-semibold text-foreground">
        {value}
      </span>
      <span className={`text-xs ${subTone ?? "text-muted-foreground"}`}>
        {sub}
      </span>
    </div>
  );
}

function ActivityRow({
  job,
  title,
  project,
  last,
}: {
  job: ModuleJob;
  title: string;
  project: string;
  last: boolean;
}) {
  const meta = statusMeta[job.status];
  return (
    <li
      className={`flex items-center gap-3 py-2.5 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-foreground">{title}</span>
        <span className="truncate text-xs text-muted-foreground">{project}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={`text-xs ${meta.text}`}>{meta.label}</span>
        <span className="metric text-[10px] text-muted-foreground/70">
          {relativeTime(job.createdAt)}
        </span>
      </div>
    </li>
  );
}

function PipelineMini() {
  const steps = articlePipelineModuleKeys.map((key) => {
    const def = getModuleDefinition(key);
    return { number: def.moduleNumber, title: def.title };
  });
  return (
    <div className="glass flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Workflow className="h-4 w-4 text-geo" />
          Quy trình bài viết
        </h2>
        <Link
          href="/pipelines"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Chạy cả luồng <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ol className="relative flex flex-col gap-0 pl-1">
        {steps.map((step, idx) => (
          <li key={step.number} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span className="metric flex h-6 w-6 items-center justify-center rounded-full border border-border bg-accent text-[10px] text-foreground">
                {step.number}
              </span>
              {idx < steps.length - 1 && (
                <span
                  className="w-px flex-1"
                  style={{
                    background:
                      "linear-gradient(180deg,var(--spectrum-1),var(--spectrum-3))",
                    minHeight: "14px",
                  }}
                />
              )}
            </div>
            <span className="pb-3 pt-0.5 text-xs text-muted-foreground">
              {step.title}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GeoConnectCard() {
  return (
    <div
      className="glass flex flex-col gap-3 p-5"
      style={{
        background:
          "linear-gradient(135deg,rgba(79,227,193,.08),rgba(155,140,255,.08),rgba(224,122,214,.08))",
      }}
    >
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-seo" />
        <h2 className="text-sm font-medium text-foreground">Theo dõi GEO</h2>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Kết nối Google Search Console để đo clicks, vị trí và các trang được AI
        trích dẫn — ngay trong app.
      </p>
      <Link
        href="/analytics"
        className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
      >
        Kết nối Search Console <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function OnboardingHero() {
  const steps = [
    {
      icon: <Plus className="h-4 w-4" />,
      title: "Tạo dự án",
      desc: "Khai báo website, ngôn ngữ, đối thủ.",
      href: "/projects/new",
      cta: "Tạo dự án",
    },
    {
      icon: <Rocket className="h-4 w-4" />,
      title: "Chạy module đầu tiên",
      desc: "Sitemap, từ khóa, hoặc cả luồng bài viết.",
      href: "/automations",
      cta: "Mở Tự động hóa",
    },
    {
      icon: <Search className="h-4 w-4" />,
      title: "Theo dõi kết quả",
      desc: "Kết nối Search Console để đo SEO + GEO.",
      href: "/analytics",
      cta: "Xem Phân tích",
    },
  ];
  return (
    <div className="glass flex flex-col gap-5 p-6">
      <div className="flex items-center gap-2">
        <Rocket className="h-5 w-5 text-seo" />
        <h2 className="text-base font-medium text-foreground">
          Bắt đầu trong 3 bước
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((step, idx) => (
          <Link
            key={step.href}
            href={step.href}
            className="glass-hover flex flex-col gap-2 rounded-xl border border-border p-4"
          >
            <div className="flex items-center gap-2">
              <span className="metric text-xs text-muted-foreground/70">
                0{idx + 1}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-seo">
                {step.icon}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {step.title}
            </span>
            <span className="text-xs text-muted-foreground">{step.desc}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-foreground">
              {step.cta} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-center text-xs text-muted-foreground">
      <Circle className="h-3 w-3" />
      <span className="flex-1 text-left">{text}</span>
    </div>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.round(hr / 24);
  return `${day} ngày trước`;
}
