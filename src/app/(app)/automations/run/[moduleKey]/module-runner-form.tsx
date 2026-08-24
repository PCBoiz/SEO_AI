"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  Copy,
  Download,
  Eye,
  FolderOpen,
  History,
  Link2,
  Loader2,
  Pencil,
  Play,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { RunPicker } from "@/components/modules/run-picker";
import { IntegrationSetup } from "@/components/modules/integration-setup";
import { OutputBlockView } from "@/components/viz/output-block-view";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";
import type {
  ModuleDefinitionView,
  ModuleFormField,
} from "@/domain/modules/module-definition";

const POLL_INTERVAL_MS = 2_500;

interface ProjectOption {
  id: string;
  name: string;
  location: string | null;
  language: string;
  tone: string;
  website: string;
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
  output: Record<string, unknown> | null;
  errorMessage: string | null;
}

interface ErrorEnvelope {
  error?: {
    message?: string;
    details?: { issues?: Array<{ path: string; message: string }> };
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

function projectValue(
  project: ProjectOption | undefined,
  source: NonNullable<ModuleFormField["prefillFromProject"]>,
): string {
  if (!project) return "";
  if (source === "location") return project.location ?? "";
  if (source === "language") return project.language;
  if (source === "tone") return project.tone;
  if (source === "website") return project.website;
  return project.name;
}

function initialValues(
  fields: ModuleFormField[],
  project: ProjectOption | undefined,
): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.prefillFromProject
        ? projectValue(project, field.prefillFromProject)
        : "",
    ]),
  );
}

interface ModuleContext {
  sharedContext: Record<string, string> | null;
  moduleInput: Record<string, unknown> | null;
  upstream: string[];
}

interface HistoryJob extends JobView {
  input: Record<string, unknown>;
  pinnedAt: string | null;
  createdAt: string;
}

export function ModuleRunnerForm({
  module,
  moduleTitles,
  projects,
  canRun,
  tenViec,
  cheDo,
  aiProviders,
}: {
  module: ModuleDefinitionView;
  moduleTitles: Record<string, string>;
  projects: ProjectOption[];
  canRun: boolean;
  /** Tên việc theo ngôn ngữ người dùng — xem `ngon-ngu-nguoi-dung.ts`. */
  tenViec: string;
  /**
   * "don-gian" thì giấu số hiệu module, mã module và các chữ viết tắt kỹ thuật
   * (BYOK, Presets). Chúng vẫn còn nguyên ở bản đầy đủ cho người cần.
   */
  cheDo: "don-gian" | "nang-cao";
  persistence?: "sqlite" | "neon";
  aiProviders: Array<{ id: AiProviderId; label: string; model: string }>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projectId, projects],
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(module.form, projects[0]),
  );
  const [availableUpstream, setAvailableUpstream] = useState<string[]>([]);
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
      `/api/v1/modules/${module.key}/jobs?projectId=${encodeURIComponent(targetProjectId)}&limit=10`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const payload = (await response.json()) as { jobs: HistoryJob[] };
    setHistory(payload.jobs);
  }

  // Lịch sử run: nạp khi đổi dự án và làm mới khi một job vừa kết thúc.
  const jobStatus = job?.status;
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await loadHistory(projectId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, module.key]);
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

  // Nạp ngữ cảnh dự án: preset reload (input gần nhất) + bối cảnh chung + module
  // upstream đã có kết quả (để hiển thị "sẽ tự dùng"). Chạy khi đổi dự án.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(
        `/api/v1/modules/${module.key}/context?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as ModuleContext;
      if (cancelled) return;
      setAvailableUpstream(
        module.consumes.filter((key) => data.upstream.includes(key)),
      );
      setValues((current) => {
        const next = { ...current };
        for (const field of module.form) {
          const saved = data.moduleInput?.[field.key];
          const shared = data.sharedContext?.[field.key];
          if (Array.isArray(saved)) {
            next[field.key] = saved.join("\n");
          } else if (typeof saved === "string" && saved.length > 0) {
            next[field.key] = saved;
          } else if (typeof shared === "string" && shared.length > 0) {
            next[field.key] = shared;
          }
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, module.key, module.form, module.consumes]);

  useEffect(() => {
    if (!job || !["queued", "dispatching", "running"].includes(job.status)) {
      return;
    }
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/v1/modules/${module.key}/jobs/${job.id}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { job: JobView };
      setJob(payload.job);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [job, module.key]);

  function selectProject(nextProjectId: string): void {
    setProjectId(nextProjectId);
    const nextProject = projects.find((item) => item.id === nextProjectId);
    // Cập nhật lại các trường có prefill từ dự án (ngôn ngữ, thị trường, giọng).
    setValues((current) => {
      const next = { ...current };
      for (const field of module.form) {
        if (field.prefillFromProject) {
          next[field.key] = projectValue(nextProject, field.prefillFromProject);
        }
      }
      return next;
    });
  }

  // Preset: nạp lại toàn bộ input của một lần chạy cũ vào form.
  function applyHistoryInput(id: string): void {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    setValues((current) => {
      const next = { ...current };
      for (const field of module.form) {
        const saved = item.input[field.key];
        if (Array.isArray(saved)) next[field.key] = saved.join("\n");
        else if (typeof saved === "string") next[field.key] = saved;
      }
      return next;
    });
  }

  // Ghim/bỏ ghim một run làm bản "chính thức" cho nối luồng.
  async function togglePin(id: string): Promise<void> {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    await fetch(`/api/v1/modules/${module.key}/jobs/${item.id}/pin`, {
      method: item.pinnedAt ? "DELETE" : "POST",
    });
    if (projectId) await loadHistory(projectId);
  }

  // Tóm tắt input/output cho dropdown (timestamp + nội dung chính).
  function summarizeInput(item: HistoryJob): string {
    for (const key of ["primaryKeyword", "pageLabel", ...module.form.map((f) => f.key)]) {
      const value = item.input[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "(không có tóm tắt)";
  }
  function summarizeOutput(item: HistoryJob): string {
    for (const block of module.outputBlocks) {
      const value = item.output?.[block.key];
      if (typeof value === "string" && value.trim()) {
        return value.trim().split("\n")[0].slice(0, 80);
      }
    }
    return "(kết quả trống)";
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      projectId,
      idempotencyKey: crypto.randomUUID(),
      ai: {
        provider: aiProvider,
        model: selectedAi?.model ?? "deepseek-v4-flash",
      },
    };
    for (const field of module.form) {
      const raw = values[field.key] ?? "";
      payload[field.key] = field.asLines
        ? raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
        : raw;
    }
    return payload;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!project || !canRun) return;
    setPending(true);
    setError(undefined);
    setJob(undefined);
    try {
      const response = await fetch(`/api/v1/modules/${module.key}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildPayload() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ErrorEnvelope;
        throw new Error(
          payload.error?.details?.issues?.[0]?.message ??
            payload.error?.message ??
            "Không thể tạo job.",
        );
      }
      const payload = (await response.json()) as { job: JobView };
      setJob(payload.job);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo job.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <Link
            href="/automations"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />{" "}
            {cheDo === "don-gian" ? "Quay lại" : "Quay lại thư viện tự động hóa"}
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            {cheDo === "don-gian"
              ? tenViec
              : `Module ${module.moduleNumber} · ${module.title}`}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {module.description}
            {cheDo === "nang-cao"
              ? " AI gọi trực tiếp bằng API key của bạn (BYOK)."
              : null}
          </p>
        </div>
        {cheDo === "nang-cao" ? (
          <Badge variant="success">AI trực tiếp (BYOK)</Badge>
        ) : null}
      </div>

      {module.needsIntegrations.length > 0 && (
        <IntegrationSetup
          projectId={projectId}
          needs={module.needsIntegrations}
          canRun={canRun}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Thông tin đầu vào</span>
              <RunPicker
                label={cheDo === "don-gian" ? "Lần trước" : "Presets"}
                icon={FolderOpen}
                disabled={!canRun || pending}
                emptyText="Chưa có lần chạy nào của dự án này — chạy lần đầu để tạo preset."
                items={history.map((item) => ({
                  id: item.id,
                  timestamp: new Date(item.createdAt).toLocaleString("vi-VN"),
                  summary: summarizeInput(item),
                  statusLabel: statusLabels[item.status],
                  statusTone:
                    item.status === "succeeded"
                      ? ("success" as const)
                      : item.status === "failed" || item.status === "timed_out"
                        ? ("destructive" as const)
                        : ("muted" as const),
                  pinned: item.pinnedAt !== null,
                }))}
                onPick={applyHistoryInput}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Dự án" htmlFor="run-project" required>
                <select
                  id="run-project"
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
              <FormField
                label={cheDo === "don-gian" ? "Trợ lý AI" : "AI xử lý (BYOK)"}
                htmlFor="run-ai-provider"
                description={
                  cheDo === "don-gian"
                    ? "Nếu bạn đã lưu lựa chọn riêng thì hệ thống dùng lựa chọn đó."
                    : `Model: ${selectedAi?.model ?? "chưa chọn"} — model đã lưu ở trang API Keys được ưu tiên.`
                }
                required
              >
                <select
                  id="run-ai-provider"
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

              {module.form.map((field) => (
                <RunnerField
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  disabled={!canRun || pending}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, [field.key]: value }))
                  }
                />
              ))}

              {availableUpstream.length > 0 && (
                <p className="sm:col-span-2 flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                  <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Nối luồng tự động: sẽ dùng kết quả đã lưu của dự án —{" "}
                    {availableUpstream
                      .map((key) => moduleTitles[key] ?? key)
                      .join(", ")}
                    . Không cần dán tay.
                  </span>
                </p>
              )}
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
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={!canRun || pending || projects.length === 0}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {cheDo === "don-gian" ? "Bắt đầu" : `Chạy Module ${module.moduleNumber}`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <JobResult
          key={job?.id ?? "none"}
          job={job}
          moduleKey={module.key}
          outputBlocks={module.outputBlocks}
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
                  summary: summarizeOutput(item),
                  statusTone: "success" as const,
                  pinned: item.pinnedAt !== null,
                  pinnable: canRun,
                }))}
              onPick={(id) => {
                const item = history.find((entry) => entry.id === id);
                if (item) setJob(item);
              }}
              onTogglePin={togglePin}
            />
          }
        />
      </div>
    </div>
  );
}

function RunnerField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: ModuleFormField;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `run-field-${field.key}`;
  const wide = field.type === "textarea";
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <FormField
        label={field.label}
        htmlFor={id}
        description={field.description}
        required={field.required}
      >
        {field.type === "textarea" ? (
          <Textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
            rows={field.rows ?? 4}
          />
        ) : field.type === "select" ? (
          <select
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm"
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        )}
      </FormField>
    </div>
  );
}

function JobResult({
  job,
  moduleKey,
  outputBlocks,
  canEdit,
  historyControl,
  onSaved,
}: {
  job?: JobView;
  moduleKey: string;
  outputBlocks: ModuleDefinitionView["outputBlocks"];
  canEdit: boolean;
  historyControl?: React.ReactNode;
  onSaved?: (job: JobView) => void;
}) {
  const running = job
    ? ["queued", "dispatching", "running"].includes(job.status)
    : false;
  return (
    <Card className="h-fit" data-testid="module-job-result">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            Kết quả
            {historyControl}
          </span>
          {job && (
            <Badge
              variant={
                job.status === "succeeded"
                  ? "success"
                  : job.status === "failed" || job.status === "timed_out"
                    ? "destructive"
                    : "blue"
              }
            >
              {running && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {statusLabels[job.status]}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!job && (
          <div className="py-2">
            <p className="text-center text-sm text-muted-foreground">
              Điền thông tin bên trái rồi bấm <span className="text-foreground">Chạy</span> —
              kết quả hiện tại đây sau khoảng 20–60 giây.
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground/70">
              Đã chạy trước đó? Mở &quot;Lịch sử kết quả&quot; để xem lại, sửa và
              ghim bản tốt nhất làm bản chính thức cho các module sau dùng.
            </p>
          </div>
        )}
        {job && running && <RunnerRunningState status={job.status} />}
        {job && (job.status === "failed" || job.status === "timed_out") && (
          <p role="alert" className="flex gap-2 py-4 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {job.errorMessage ?? "Job không hoàn thành."}
          </p>
        )}
        {job && job.status === "succeeded" && job.output && (
          <SucceededOutput
            jobId={job.id}
            moduleKey={moduleKey}
            outputBlocks={outputBlocks}
            output={job.output}
            canEdit={canEdit}
            onSaved={(output) => onSaved?.({ ...job, output })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function RunnerRunningState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-spectrum-2/20" />
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg,#35c4f0,#9b8cff)" }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-[#0a0a12]" />
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">
        {status === "running" ? "AI đang tạo nội dung…" : "Đang chuẩn bị chạy…"}
      </p>
      <p className="text-xs text-muted-foreground">
        Giữ tab mở — kết quả tự hiện khi xong.
      </p>
    </div>
  );
}

function SucceededOutput({
  jobId,
  moduleKey,
  outputBlocks,
  output,
  canEdit,
  onSaved,
}: {
  jobId: string;
  moduleKey: string;
  outputBlocks: ModuleDefinitionView["outputBlocks"];
  output: Record<string, unknown>;
  canEdit: boolean;
  onSaved: (output: Record<string, unknown>) => void;
}) {
  const blocks = outputBlocks.filter(
    (b) => typeof output[b.key] === "string" && (output[b.key] as string).length > 0,
  );
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<Record<string, string>>(() =>
    Object.fromEntries(blocks.map((b) => [b.key, output[b.key] as string])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const dirty = blocks.some((b) => edited[b.key] !== output[b.key]);

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/v1/modules/${moduleKey}/jobs/${jobId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ output: edited }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? "Không lưu được.");
      }
      setSaved(true);
      onSaved({ ...output, ...edited });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Đã nhận kết quả.
        </p>
        {canEdit && (
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                !editMode ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Xem
            </button>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                editMode ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </button>
          </div>
        )}
      </div>

      {editMode
        ? blocks.map((block) => (
            <div key={block.key}>
              <p className="eyebrow mb-1.5">{block.label}</p>
              <Textarea
                value={edited[block.key]}
                onChange={(event) =>
                  setEdited((prev) => ({ ...prev, [block.key]: event.target.value }))
                }
                rows={8}
              />
            </div>
          ))
        : blocks.map((block) => (
            <OutputBlockView
              key={block.key}
              blockKey={block.key}
              label={block.label}
              value={edited[block.key]}
            />
          ))}

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {/* Tải toàn bộ kết quả — ngang bằng Module 1 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(assembleAll(blocks, edited))}
        >
          <Copy className="h-3.5 w-3.5" /> Copy tất cả
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Tải về dạng Markdown, mở được bằng Word/Google Docs"
          onClick={() =>
            downloadTextFile(
              assembleAll(blocks, edited),
              `${moduleKey.toLowerCase()}.md`,
              "text/markdown;charset=utf-8",
            )
          }
        >
          <Download className="h-3.5 w-3.5" /> Tải .md
        </Button>
      </div>

      {canEdit && editMode && (
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving || !dirty}
          className="w-fit"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved && !dirty ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved && !dirty ? "Đã lưu" : "Lưu thay đổi"}
        </Button>
      )}
    </div>
  );
}


// Ghép mọi khối đầu ra thành một tài liệu Markdown có tiêu đề từng phần.
function assembleAll(
  blocks: ModuleDefinitionView["outputBlocks"],
  values: Record<string, string>,
): string {
  return blocks
    .map((block) => [`## ${block.label}`, "", values[block.key] ?? ""].join("\n"))
    .join("\n\n");
}

function downloadTextFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
