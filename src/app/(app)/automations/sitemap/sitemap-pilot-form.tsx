"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FolderOpen,
  History,
  Loader2,
  Play,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { RunPicker } from "@/components/modules/run-picker";
import { SitemapResult } from "@/app/(app)/automations/sitemap/sitemap-result";
import type { SitemapNode } from "@/domain/sitemap/sitemap-structure";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";

interface ProjectOption {
  id: string;
  name: string;
  website: string;
  location: string | null;
  language: string;
  tone: string;
  competitors: string[];
}

interface JobView {
  id: string;
  status:
    | "queued"
    | "dispatching"
    | "running"
    | "succeeded"
    | "failed"
    | "timed_out";
  attemptCount: number;
  output: {
    contractVersion: "1.0";
    mocked?: boolean;
    sites: Array<{
      reference: string;
      draftSitemap: string;
      selectedSitemap: string;
      structure?: SitemapNode;
    }>;
  } | null;
  errorMessage: string | null;
}

interface ErrorEnvelope {
  error?: {
    message?: string;
    details?: { issues?: Array<{ path: string; message: string }> };
  };
}

interface HistoryJob extends JobView {
  createdAt: string;
  input: {
    ai?: { provider?: string; model?: string };
    sites?: Array<{
      location?: string;
      primaryKeyword?: string;
      tone?: string;
      language?: string;
      websiteBrief?: string;
      competitorUrls?: string[];
    }>;
  };
}

const statusLabels: Record<JobView["status"], string> = {
  queued: "Đang xếp hàng",
  dispatching: "Đang chuẩn bị chạy",
  running: "AI đang xử lý",
  succeeded: "Hoàn thành",
  failed: "Thất bại",
  timed_out: "Quá thời gian",
};

export function SitemapPilotForm({
  projects,
  canRun,
  runtime,
  aiProviders,
}: {
  projects: ProjectOption[];
  canRun: boolean;
  runtime: {
    pollIntervalMs: number;
    persistence: "sqlite" | "neon";
    bridgeConfigured: boolean;
  };
  aiProviders: Array<{ id: AiProviderId; label: string; model: string }>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projectId, projects],
  );
  const [location, setLocation] = useState(project?.location ?? "Việt Nam");
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState(project?.tone ?? "Chuyên nghiệp");
  const [language, setLanguage] = useState(project?.language ?? "Tiếng Việt");
  const [brief, setBrief] = useState("");
  const [competitors, setCompetitors] = useState(
    project?.competitors.join("\n") ?? "",
  );
  const [aiProvider, setAiProvider] = useState<AiProviderId>(
    aiProviders.find((item) => item.id === "deepseek")?.id ??
      aiProviders[0]?.id ??
      "deepseek",
  );
  const selectedAi = aiProviders.find((item) => item.id === aiProvider);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [job, setJob] = useState<JobView>();
  const [history, setHistory] = useState<HistoryJob[]>([]);

  async function loadHistory(targetProjectId: string): Promise<void> {
    const response = await fetch(
      `/api/v1/sitemap-jobs?projectId=${encodeURIComponent(targetProjectId)}&limit=10`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const payload = (await response.json()) as { jobs: HistoryJob[] };
    setHistory(payload.jobs);
  }

  // Lịch sử: nạp khi đổi dự án + làm mới sau mỗi lần chạy kết thúc.
  const jobStatus = job?.status;
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await loadHistory(projectId);
    })();
     
  }, [projectId]);
  useEffect(() => {
    if (
      !projectId ||
      !jobStatus ||
      !["succeeded", "failed", "timed_out"].includes(jobStatus)
    ) {
      return;
    }
    (async () => {
      await loadHistory(projectId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobStatus]);

  // Preset: nạp lại toàn bộ input của một lần chạy cũ vào form.
  function applyHistoryInput(id: string): void {
    const item = history.find((entry) => entry.id === id);
    const site = item?.input.sites?.[0];
    if (!item || !site) return;
    setLocation(site.location ?? "Việt Nam");
    setKeyword(site.primaryKeyword ?? "");
    setTone(site.tone ?? "Chuyên nghiệp");
    setLanguage(site.language ?? "Tiếng Việt");
    setBrief(site.websiteBrief ?? "");
    setCompetitors((site.competitorUrls ?? []).join("\n"));
    const provider = item.input.ai?.provider;
    if (provider && aiProviders.some((entry) => entry.id === provider)) {
      setAiProvider(provider as AiProviderId);
    }
  }

  useEffect(() => {
    if (!job || !["queued", "dispatching", "running"].includes(job.status)) {
      return;
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/v1/sitemap-jobs/${job.id}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { job: JobView };
      setJob(payload.job);
    }, runtime.pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [job, runtime.pollIntervalMs]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!project || !canRun) return;
    setPending(true);
    setError(undefined);
    setJob(undefined);
    try {
      const response = await fetch("/api/v1/sitemap-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          idempotencyKey: crypto.randomUUID(),
          ai: {
            provider: aiProvider,
            model: selectedAi?.model ?? "deepseek-v4-flash",
          },
          sites: [
            {
              reference: project.name,
              location,
              primaryKeyword: keyword,
              tone,
              language,
              websiteBrief: brief,
              competitorUrls: parseCompetitorUrls(competitors),
            },
          ],
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ErrorEnvelope;
        throw new Error(
          payload.error?.details?.issues?.[0]?.message ??
            payload.error?.message ??
            "Không thể tạo job Sitemap.",
        );
      }
      const payload = (await response.json()) as { job: JobView };
      setJob(payload.job);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo job Sitemap.",
      );
    } finally {
      setPending(false);
    }
  }

  function selectProject(nextProjectId: string): void {
    setProjectId(nextProjectId);
    const nextProject = projects.find((item) => item.id === nextProjectId);
    if (!nextProject) return;
    setLocation(nextProject.location ?? "Việt Nam");
    setTone(nextProject.tone);
    setLanguage(nextProject.language);
    setCompetitors(nextProject.competitors.join("\n"));
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/automations"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Quay lại thư viện tự động hóa
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Module 1 · Sitemap
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Neon là nguồn dữ liệu chính. AI chạy trực tiếp trong ứng dụng bằng
            API key của bạn (BYOK) — cấu hình key tại trang API Keys.
          </p>
        </div>
        <Badge variant="success">AI trực tiếp (BYOK)</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Thông tin tạo Sitemap</span>
              <RunPicker
                label="Presets"
                icon={FolderOpen}
                disabled={!canRun || pending}
                emptyText="Chưa có lần chạy nào của dự án này — chạy lần đầu để tạo preset."
                items={history.map((item) => ({
                  id: item.id,
                  timestamp: new Date(item.createdAt).toLocaleString("vi-VN"),
                  summary:
                    item.input.sites?.[0]?.primaryKeyword?.trim() ||
                    "(không có từ khóa)",
                  statusLabel: statusLabels[item.status],
                  statusTone:
                    item.status === "succeeded"
                      ? "success"
                      : item.status === "failed" || item.status === "timed_out"
                        ? "destructive"
                        : "muted",
                }))}
                onPick={applyHistoryInput}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Dự án" htmlFor="sitemap-project" required>
                <select
                  id="sitemap-project"
                  value={projectId}
                  onChange={(event) => selectProject(event.target.value)}
                  disabled={!canRun || pending}
                  className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm"
                >
                  {projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Thị trường / địa điểm" htmlFor="sitemap-location" required>
                <Input
                  id="sitemap-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  disabled={!canRun || pending}
                />
              </FormField>
              <FormField label="Từ khóa chính" htmlFor="sitemap-keyword" required>
                <Input
                  id="sitemap-keyword"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Ví dụ: dịch vụ SEO tổng thể"
                  disabled={!canRun || pending}
                />
              </FormField>
              <FormField label="Giọng văn" htmlFor="sitemap-tone" required>
                <Input
                  id="sitemap-tone"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  disabled={!canRun || pending}
                />
              </FormField>
              <FormField label="Ngôn ngữ đầu ra" htmlFor="sitemap-language" required>
                <Input
                  id="sitemap-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  disabled={!canRun || pending}
                />
              </FormField>
              <FormField
                label="AI xử lý (BYOK)"
                htmlFor="sitemap-ai-provider"
                description={`Model: ${selectedAi?.model ?? "chưa chọn"} — nếu bạn đã lưu model riêng ở trang API Keys thì model đó được ưu tiên.`}
                required
              >
                <select
                  id="sitemap-ai-provider"
                  value={aiProvider}
                  onChange={(event) =>
                    setAiProvider(event.target.value as AiProviderId)
                  }
                  disabled={!canRun || pending}
                  className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm"
                >
                  {aiProviders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="sm:col-span-2">
                <FormField
                  label="Mô tả website"
                  htmlFor="sitemap-brief"
                  description="Tối thiểu 10 ký tự; đây là Website Brief trong hợp đồng pilot mới."
                  required
                >
                  <Textarea
                    id="sitemap-brief"
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                    placeholder="Mô tả doanh nghiệp, dịch vụ chính, khách hàng mục tiêu và điểm khác biệt..."
                    disabled={!canRun || pending}
                    rows={5}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField
                  label="Website đối thủ (tùy chọn)"
                  htmlFor="sitemap-competitors"
                  description="Tùy chọn — mỗi dòng một URL đầy đủ, tối đa 5 URL. Bỏ trống nếu không có đối thủ."
                >
                  <Textarea
                    id="sitemap-competitors"
                    value={competitors}
                    onChange={(event) => setCompetitors(event.target.value)}
                    placeholder={"https://doithu-1.vn\nhttps://doithu-2.vn"}
                    disabled={!canRun || pending}
                    rows={5}
                  />
                </FormField>
              </div>
              {!canRun && (
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Tài khoản chỉ xem không có quyền chạy automation.
                </p>
              )}
              {projects.length === 0 && (
                <p className="sm:col-span-2 text-xs text-destructive">
                  Hãy tạo ít nhất một dự án đang hoạt động trước khi chạy.
                </p>
              )}
              {error && (
                <p role="alert" className="sm:col-span-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {!runtime.bridgeConfigured && (
                <p className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Module 1 chưa cấu hình trên server (thiếu BRIDGE_DATABASE_URL) —
                  hãy đặt biến này rồi thử lại.
                </p>
              )}
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={
                    !canRun ||
                    pending ||
                    projects.length === 0 ||
                    !runtime.bridgeConfigured
                  }
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Tạo Sitemap
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <SitemapResult
          key={job?.id ?? "none"}
          job={job}
          canEdit={canRun}
          onSaved={(updated) => setJob(updated)}
          historyControl={
            <RunPicker
              label="Lịch sử kết quả"
              icon={History}
              emptyText="Chưa có kết quả hoàn thành nào của dự án này."
              items={history
                .filter((item) => item.status === "succeeded" && item.output)
                .map((item) => ({
                  id: item.id,
                  timestamp: new Date(item.createdAt).toLocaleString("vi-VN"),
                  summary:
                    item.output?.sites?.[0]?.selectedSitemap
                      ?.split("\n")[0]
                      ?.trim() || "(kết quả trống)",
                  statusTone: "success" as const,
                }))}
              onPick={(id) => {
                const item = history.find((entry) => entry.id === id);
                if (item) setJob(item);
              }}
            />
          }
        />
      </div>
    </div>
  );
}

function parseCompetitorUrls(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}
