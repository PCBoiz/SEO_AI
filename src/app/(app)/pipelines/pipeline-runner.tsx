"use client";

import { useEffect, useMemo, useState } from "react";
// (useEffect dùng để đồng bộ sơ đồ khi bật/tắt bước đăng WordPress)
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Download,
  GitBranch,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { OutputBlockView } from "@/components/viz/output-block-view";
import { AiVietHo } from "@/components/ai/ai-viet-ho";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";

const POLL_INTERVAL_MS = 2_500;

// Trần chờ MỘT bước, chọn theo số đo chứ không chọn cho tròn.
//
// Mỗi lệnh gọi model có `timeoutMs: 120_000`, và `generateWithRetry` được phép
// gọi lại một lần → 240 giây cho mỗi lần `generate()`. Module 11 gọi hai lần,
// nên riêng nó đã có thể chạy tới 8 phút một cách hoàn toàn bình thường.
//
// 15 phút là gấp đôi trường hợp xấu nhất đã biết: đủ rộng để không cắt ngang
// một lượt chạy thật, đủ chặt để không treo cả buổi.
const TRAN_CHO_MS = 15 * 60_000;

// 10 lần trượt liên tiếp ≈ 25 giây. Chập mạng thoáng qua thì chưa tới ngưỡng;
// phiên hết hạn thì trượt mãi, nên chạm ngưỡng nhanh và báo đúng nguyên nhân.
const TRAN_LOI_LIEN_TIEP = 10;

interface PipelineModule {
  key: string;
  moduleNumber: number;
  title: string;
  category: string;
  fieldKeys: string[];
  asLinesKeys: string[];
  outputBlocks: Array<{ key: string; label: string }>;
}

interface PipelinePresetView {
  id: string;
  name: string;
  description: string;
  modules: PipelineModule[];
}

interface ProjectOption {
  id: string;
  name: string;
  location: string | null;
  language: string;
  tone: string;
  website: string;
  /**
   * Các loại kết nối dự án ĐÃ cấu hình ("wordpress", "custom_site"…).
   *
   * Chỉ để gợi ý mặc định và cảnh báo trước khi chạy — KHÔNG phải hàng rào.
   * Hàng rào thật nằm ở engine phía server, nơi nó giải mã credentials và
   * dừng job nếu thiếu. Danh sách này đi qua trình duyệt nên không được tin.
   */
  tichHopDaNoi?: string[];
}

type StepStatus = "pending" | "running" | "succeeded" | "failed";

interface StepState {
  key: string;
  moduleNumber: number;
  title: string;
  status: StepStatus;
  output?: Record<string, unknown> | null;
  error?: string;
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
  output: Record<string, unknown> | null;
  errorMessage: string | null;
}

interface ErrorEnvelope {
  error?: {
    message?: string;
    details?: { issues?: Array<{ path: string; message: string }> };
  };
}

const POOL_FIELDS: Array<{
  key: string;
  label: string;
  type: "text" | "textarea";
  required?: boolean;
  prefill?: "location" | "language" | "tone" | "name" | "website";
  placeholder?: string;
  description?: string;
}> = [
  {
    key: "primaryKeyword",
    label: "Chủ đề / từ khóa chính",
    type: "text",
    required: true,
    placeholder: "Ví dụ: học lập trình cho người mới",
  },
  {
    key: "pageLabel",
    label: "Trang / tiêu đề mục tiêu",
    type: "text",
    description: "Để trống sẽ dùng chính chủ đề chính.",
  },
  { key: "location", label: "Thị trường / địa điểm", type: "text", required: true, prefill: "location" },
  { key: "language", label: "Ngôn ngữ đầu ra", type: "text", required: true, prefill: "language" },
  { key: "tone", label: "Giọng văn", type: "text", required: true, prefill: "tone" },
  {
    key: "audienceBrief",
    label: "Mô tả doanh nghiệp / khách hàng",
    type: "textarea",
    required: true,
    description: "Tối thiểu 10 ký tự — nhập 1 lần, dùng cho cả luồng.",
  },
  {
    key: "pageUrl",
    label: "URL trang (tùy chọn)",
    type: "text",
    placeholder: "https://... để nhúng vào JSON-LD",
  },
  {
    key: "siteName",
    label: "Tên website / thương hiệu",
    type: "text",
    required: true,
    prefill: "name",
    description: "Tên hiện trong tệp khai báo với AI (bước GEO) và trong bản ý định (bước Dựng web).",
  },
  {
    key: "websiteUrl",
    label: "URL website",
    type: "text",
    required: true,
    prefill: "website",
    description: "Địa chỉ website hiện có — dùng cho sitemap/robots, và để bước Dựng web biết đã có gì.",
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function PipelineRunner({
  presets,
  publishModules = [],
  projects,
  canRun,
  persistence,
  aiProviders,
}: {
  presets: PipelinePresetView[];
  /** Các bước đăng bài có thể nối vào cuối luồng, kèm loại kết nối chúng cần. */
  publishModules?: Array<PipelineModule & { integrationType: string }>;
  projects: ProjectOption[];
  canRun: boolean;
  persistence: "sqlite" | "neon";
  aiProviders: Array<{ id: AiProviderId; label: string; model: string }>;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = useMemo(
    () => projects.find((item) => item.id === projectId),
    [projectId, projects],
  );
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id ?? "");
  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) ?? presets[0],
    [presets, selectedPresetId],
  );
  const pipelineModules = useMemo(
    () => selectedPreset?.modules ?? [],
    [selectedPreset],
  );
  const [pool, setPool] = useState<Record<string, string>>(() =>
    initialPool(projects[0]),
  );
  const [aiProvider, setAiProvider] = useState<AiProviderId>(
    aiProviders.find((item) => item.id === "deepseek")?.id ??
      aiProviders[0]?.id ??
      "deepseek",
  );
  const selectedAi = aiProviders.find((item) => item.id === aiProvider);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();

  // MẶC ĐỊNH THEO THỨ DỰ ÁN ĐÃ NỐI, và chỉ khi CHỈ CÓ MỘT lựa chọn hợp lệ.
  //
  // Dự án đã nối đúng một nơi đăng thì chọn sẵn nơi đó — đỡ một thao tác, và
  // quan trọng hơn là đỡ chọn nhầm sang nơi chưa cấu hình rồi chết ở bước cuối,
  // sau khi tám bước trước đã chạy xong và đã đốt tiền gọi mô hình.
  //
  // Nối từ hai nơi trở lên thì KHÔNG tự chọn. Máy không biết bài này nên lên
  // đâu, và đoán sai ở đây nghĩa là đăng nội dung của khách này lên trang của
  // khách kia. Để trống, buộc người dùng chỉ rõ.
  const macDinhDang = useMemo(() => {
    const daNoi = publishModules.filter((mod) =>
      project?.tichHopDaNoi?.includes(mod.integrationType),
    );
    return daNoi.length === 1 ? daNoi[0]!.key : "";
  }, [project, publishModules]);

  // Đổi dự án thì đặt lại lựa chọn — KHÔNG dùng useEffect.
  //
  // Viết bằng effect thì lint chặn ("Avoid calling setState() directly within
  // an effect"), và nó chặn có lý: effect chạy SAU khi đã vẽ xong, nên có đúng
  // một khung hình hiển thị lựa chọn của dự án CŨ trên dự án MỚI. Với một ô
  // quyết định bài viết lên trang nào, một khung hình sai cũng là một khung
  // hình quá nhiều.
  //
  // Đây là khuôn React khuyến nghị cho "đổi prop thì đặt lại state": so với giá
  // trị lần trước ngay trong lúc vẽ, lệch thì đặt lại và React vẽ lại ngay,
  // trước khi bất cứ thứ gì lên màn hình.
  const [publishKey, setPublishKey] = useState(macDinhDang);
  const [duAnTruoc, setDuAnTruoc] = useState(projectId);
  if (duAnTruoc !== projectId) {
    setDuAnTruoc(projectId);
    setPublishKey(macDinhDang);
  }

  const publishModule = useMemo(
    () => publishModules.find((mod) => mod.key === publishKey),
    [publishModules, publishKey],
  );

  // Danh sách bước thực chạy: chuỗi bài viết + (tùy chọn) một bước đăng.
  //
  // ⚠️ PHẢI KIỂM BƯỚC ĐĂNG ĐÃ NẰM SẴN TRONG LUỒNG CHƯA — ĐĂNG HAI LẦN LÀ HAI BÀI.
  //
  // Luồng "Chuỗi bài viết → đẩy thẳng sang site" (`article_publish`) đã kết thúc
  // bằng chính bước đăng đó. Cộng thêm lần nữa ở đây thì bước đăng chạy hai lượt
  // liên tiếp, và hàng chờ duyệt của trang thật nhận HAI BÀI TRÙNG — người duyệt
  // phải xoá tay, mỗi lần chạy.
  //
  // Hàng rào idempotency không cứu được: `buildInput` sinh `crypto.randomUUID()`
  // mới cho mỗi lượt, nên chỉ mục duy nhất trên `module_jobs` coi hai lượt là hai
  // việc khác nhau. Giao diện cũng lệch theo, vì `setSteps` tìm bước theo khoá —
  // hai dòng cùng khoá sẽ đổi trạng thái cùng lúc.
  //
  // Điều kiện đủ để lỗi xảy ra khá dễ gặp: chọn đúng luồng đó, và dự án chỉ nối
  // MỘT nơi đăng nên `macDinhDang` tự chọn sẵn. Không cần ai bấm nhầm gì cả.
  const activeModules = useMemo(() => {
    if (!publishModule) return pipelineModules;
    const daCo = pipelineModules.some((mod) => mod.key === publishModule.key);
    return daCo ? pipelineModules : [...pipelineModules, publishModule];
  }, [publishModule, pipelineModules]);
  const [steps, setSteps] = useState<StepState[]>(() =>
    pipelineModules.map((mod) => ({
      key: mod.key,
      moduleNumber: mod.moduleNumber,
      title: mod.title,
      status: "pending",
    })),
  );
  // Hiển thị: nếu bật/tắt bước đăng làm danh sách lệch với steps đã lưu (và
  // không đang chạy) thì derive lại các bước "chờ" từ activeModules.
  const displaySteps = useMemo(() => {
    const sameShape =
      steps.length === activeModules.length &&
      steps.every((step, index) => step.key === activeModules[index]?.key);
    if (sameShape || running) return steps;
    return activeModules.map(
      (mod): StepState => ({
        key: mod.key,
        moduleNumber: mod.moduleNumber,
        title: mod.title,
        status: "pending",
      }),
    );
  }, [steps, activeModules, running]);

  // Preset khôi phục khi reload + bối cảnh chung của dự án.
  useEffect(() => {
    if (!projectId || pipelineModules.length === 0) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(
        `/api/v1/modules/${pipelineModules[0].key}/context?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as {
        sharedContext: Record<string, string> | null;
      };
      if (cancelled || !data.sharedContext) return;
      setPool((current) => {
        const next = { ...current };
        for (const key of Object.keys(next)) {
          const shared = data.sharedContext?.[key];
          if (!next[key] && typeof shared === "string") next[key] = shared;
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, pipelineModules]);

  function selectProject(nextProjectId: string): void {
    setProjectId(nextProjectId);
    const nextProject = projects.find((item) => item.id === nextProjectId);
    setPool((current) => ({
      ...current,
      location: nextProject?.location ?? current.location,
      language: nextProject?.language ?? current.language,
      tone: nextProject?.tone ?? current.tone,
      siteName: nextProject?.name ?? current.siteName,
      websiteUrl: nextProject?.website ?? current.websiteUrl,
    }));
  }

  function buildInput(
    mod: PipelineModule,
    upstreamJobIds: readonly string[],
  ): Record<string, unknown> {
    const effective: Record<string, string> = { ...pool };
    if (!effective.pageLabel) effective.pageLabel = effective.primaryKeyword;
    const input: Record<string, unknown> = {
      projectId,
      idempotencyKey: crypto.randomUUID(),
      ai: { provider: aiProvider, model: selectedAi?.model ?? "deepseek-v4-flash" },
    };
    // Các bước đã xong của CHÍNH lượt này — để bước sau đọc đầu ra vừa sinh,
    // không phải một bản ghim cũ của chủ đề khác. Xem `domain/modules/upstream.ts`.
    if (upstreamJobIds.length > 0) input.upstreamJobIds = [...upstreamJobIds];
    for (const key of mod.fieldKeys) {
      const value = effective[key];
      if (value === undefined || value === "") continue;
      input[key] = mod.asLinesKeys.includes(key)
        ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : value;
    }
    return input;
  }

  async function runStep(
    mod: PipelineModule,
    upstreamJobIds: readonly string[],
  ): Promise<JobView> {
    const response = await fetch(`/api/v1/modules/${mod.key}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: buildInput(mod, upstreamJobIds),
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ErrorEnvelope;
      throw new Error(
        payload.error?.details?.issues?.[0]?.message ??
          payload.error?.message ??
          "Không thể tạo job.",
      );
    }
    let { job } = (await response.json()) as { job: JobView };

    /* ═══════════════════════════════════════════════════════════════════════
       ⚠️ VÒNG NÀY TRƯỚC ĐÂY KHÔNG CÓ TRẦN, VÀ CÓ HAI ĐƯỜNG CHẠY MÃI.

       1. `while` chỉ thoát khi job đổi trạng thái. Job kẹt ở "running" thì
          vòng quay vô hạn — và giao diện không phân biệt được "đang chạy" với
          "kẹt", nên nó hiện vòng xoay mãi mãi.

       2. Tệ hơn: `if (!poll.ok) continue;` nuốt MỌI lỗi. Phiên hết hạn trả
          401, máy chủ trả 500 — vòng cứ 2,5 giây gõ cửa một lần, mãi mãi, và
          người dùng không bao giờ thấy một chữ nào báo có chuyện gì. Đường này
          dễ gặp hơn đường 1 nhiều, vì phiên hết hạn là chuyện thường ngày.

       Hai trần dưới đây tách bạch hai chuyện đó, và mỗi cái báo một câu khác
       nhau — gộp lại thành "có lỗi" là vứt đi đúng phần người dùng cần để biết
       nên chờ tiếp hay đăng nhập lại.
       ═══════════════════════════════════════════════════════════════════════ */
    const hetHanLuc = Date.now() + TRAN_CHO_MS;
    let lanLoiLienTiep = 0;

    while (["queued", "dispatching", "running"].includes(job.status)) {
      if (Date.now() > hetHanLuc) {
        throw new Error(
          `Bước "${mod.title}" chạy quá ${Math.round(TRAN_CHO_MS / 60_000)} phút mà chưa xong. ` +
            "Mở trang Kết quả để xem job còn chạy không — nó có thể vẫn đang chạy ở máy chủ.",
        );
      }
      await delay(POLL_INTERVAL_MS);
      const poll = await fetch(`/api/v1/modules/${mod.key}/jobs/${job.id}`, {
        cache: "no-store",
      });
      if (!poll.ok) {
        lanLoiLienTiep += 1;
        if (lanLoiLienTiep >= TRAN_LOI_LIEN_TIEP) {
          throw new Error(
            `Không hỏi được trạng thái job sau ${TRAN_LOI_LIEN_TIEP} lần thử (HTTP ${poll.status}). ` +
              (poll.status === 401 || poll.status === 403
                ? "Phiên đăng nhập có thể đã hết hạn — tải lại trang."
                : "Kiểm tra kết nối mạng rồi thử lại."),
          );
        }
        continue;
      }
      // Một lần hỏi được là chuỗi lỗi đứt. Không đặt lại thì một trục trặc
      // thoáng qua sẽ cộng dồn qua nhiều phút và làm hỏng một lượt chạy đang ổn.
      lanLoiLienTiep = 0;
      job = ((await poll.json()) as { job: JobView }).job;
    }
    return job;
  }

  async function runPipeline(): Promise<void> {
    if (!project || !canRun || running) return;
    setRunning(true);
    setError(undefined);
    setSteps(
      activeModules.map((mod) => ({
        key: mod.key,
        moduleNumber: mod.moduleNumber,
        title: mod.title,
        status: "pending",
      })),
    );
    try {
      const daXong: string[] = [];
      for (const mod of activeModules) {
        setSteps((current) =>
          current.map((step) =>
            step.key === mod.key ? { ...step, status: "running" } : step,
          ),
        );
        const job = await runStep(mod, daXong);
        if (job.status !== "succeeded") {
          setSteps((current) =>
            current.map((step) =>
              step.key === mod.key
                ? {
                    ...step,
                    status: "failed",
                    error: job.errorMessage ?? "Bước không hoàn thành.",
                  }
                : step,
            ),
          );
          setError(
            `Dừng ở Module ${mod.moduleNumber} · ${mod.title}. ${job.errorMessage ?? ""}`,
          );
          return;
        }
        daXong.push(job.id);
        setSteps((current) =>
          current.map((step) =>
            step.key === mod.key
              ? { ...step, status: "succeeded", output: job.output }
              : step,
          ),
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pipeline thất bại.");
    } finally {
      setRunning(false);
    }
  }

  const markdown = useMemo(
    () => assembleMarkdown(activeModules, displaySteps, pool.primaryKeyword),
    [activeModules, displaySteps, pool.primaryKeyword],
  );
  const allDone =
    displaySteps.length > 0 && displaySteps.every((step) => step.status === "succeeded");
  // CHỈ hiện ô mà ít nhất một bước trong luồng đang chọn thật sự nhận. Bản
  // trước bày cả 9 ô cho mọi luồng — luồng "Dựng website" thì bị bắt điền
  // "Chủ đề / từ khóa chính" (không bước nào dùng) mới bấm được Chạy, còn ô nó
  // cần thật ("Mô tả doanh nghiệp") thì lẫn giữa những ô vô nghĩa.
  const khoaDangDung = useMemo(() => {
    const k = new Set<string>();
    for (const mod of activeModules) for (const key of mod.fieldKeys) k.add(key);
    // `pageLabel` được suy từ chủ đề khi trống — chỉ hiện khi có bước dùng chủ đề.
    return k;
  }, [activeModules]);
  const oHienThi = POOL_FIELDS.filter((field) => khoaDangDung.has(field.key));
  const requiredMissing = oHienThi.some(
    (field) => field.required && !pool[field.key]?.trim(),
  );
  // Luồng không có bước viết bài thì không có gì để "đăng" — giấu ô chọn nơi đăng.
  const coBuocVietBai = pipelineModules.some((mod) => mod.fieldKeys.includes("primaryKeyword"));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <GitBranch className="h-5 w-5" /> Quy trình · Chạy cả luồng
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Nhập 1 chủ đề → chạy liên tiếp{" "}
            {pipelineModules.map((m) => `#${m.moduleNumber}`).join(" → ")}. Đầu ra
            mỗi bước tự vào bước sau; kết quả lưu vào{" "}
            {persistence === "neon" ? "Neon" : "SQLite local"}. Muốn chạy từng
            bước riêng lẻ, dùng trang{" "}
            <Link href="/automations" className="text-foreground underline">
              Tự động hóa
            </Link>
            .
          </p>
        </div>
        <Badge variant="success">AI trực tiếp (BYOK)</Badge>
      </div>

      <div className="glass flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
        <label htmlFor="pl-preset" className="text-sm font-medium text-foreground">
          Chọn luồng
        </label>
        <select
          id="pl-preset"
          value={selectedPresetId}
          onChange={(event) => setSelectedPresetId(event.target.value)}
          disabled={!canRun || running}
          className="h-9 rounded-md border border-border bg-input px-3 text-sm"
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          {selectedPreset?.description}
        </span>
      </div>

      <PipelineGraph steps={displaySteps} modules={activeModules} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Đầu vào chung (điền 1 lần)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Dự án" htmlFor="pl-project" required>
                <select
                  id="pl-project"
                  value={projectId}
                  onChange={(event) => selectProject(event.target.value)}
                  disabled={!canRun || running}
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
                label="AI xử lý (BYOK)"
                htmlFor="pl-ai"
                description={`Model: ${selectedAi?.model ?? "chưa chọn"}`}
                required
              >
                <select
                  id="pl-ai"
                  value={aiProvider}
                  onChange={(event) =>
                    setAiProvider(event.target.value as AiProviderId)
                  }
                  disabled={!canRun || running}
                  className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm"
                >
                  {aiProviders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              {oHienThi.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                >
                  <FormField
                    label={field.label}
                    htmlFor={`pl-${field.key}`}
                    description={field.description}
                    required={field.required}
                  >
                    {field.type === "textarea" ? (
                      <Textarea
                        id={`pl-${field.key}`}
                        value={pool[field.key] ?? ""}
                        onChange={(event) =>
                          setPool((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        disabled={!canRun || running}
                        rows={4}
                      />
                    ) : (
                      <Input
                        id={`pl-${field.key}`}
                        value={pool[field.key] ?? ""}
                        onChange={(event) =>
                          setPool((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        disabled={!canRun || running}
                      />
                    )}
                  </FormField>
                  {canRun && projectId && (
                    <AiVietHo
                      projectId={projectId}
                      truong={field.key}
                      nhan={field.label}
                      moTa={[field.description, field.placeholder].filter(Boolean).join(" · ")}
                      giaTri={pool[field.key] ?? ""}
                      onChange={(v) => setPool((current) => ({ ...current, [field.key]: v }))}
                      boiCanh={pool}
                      nhaCungCap={aiProviders}
                      macDinh={aiProvider}
                      disabled={running}
                    />
                  )}
                </div>
              ))}
              {publishModules.length > 0 && coBuocVietBai && (
                <div className="sm:col-span-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
                  <label
                    htmlFor="buoc-dang"
                    className="block font-medium text-foreground"
                  >
                    Bước cuối: đăng bài
                  </label>
                  <select
                    id="buoc-dang"
                    value={publishKey}
                    onChange={(event) => setPublishKey(event.target.value)}
                    disabled={!canRun || running}
                    className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">
                      Không đăng — chỉ chạy nội dung
                    </option>
                    {publishModules.map((mod) => {
                      const daNoi = project?.tichHopDaNoi?.includes(
                        mod.integrationType,
                      );
                      return (
                        <option key={mod.key} value={mod.key}>
                          {mod.title}
                          {daNoi ? " — đã nối" : " — chưa nối"}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-muted-foreground">
                    {publishKey === "" ? (
                      <>
                        Tám bước nội dung vẫn chạy đủ và ra kết quả. Chọn nơi
                        đăng nếu muốn bài tự lên trang sau khi chạy xong.
                      </>
                    ) : project?.tichHopDaNoi?.includes(
                        publishModule?.integrationType ?? "",
                      ) ? (
                      <>
                        Bài lên dưới dạng <strong>chờ duyệt</strong> — bạn đọc
                        lại rồi mới bấm cho hiện trên trang.
                      </>
                    ) : (
                      <>
                        ⚠️ Dự án này <strong>chưa nối</strong> nơi đăng vừa chọn.
                        Chạy sẽ chết ở đúng bước cuối, sau khi tám bước trước đã
                        chạy xong. Mở phần “Kết nối nền tảng” ở trang module để
                        điền trước.
                      </>
                    )}
                  </p>
                </div>
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
                  type="button"
                  onClick={runPipeline}
                  disabled={
                    !canRun ||
                    running ||
                    projects.length === 0 ||
                    requiredMissing
                  }
                >
                  {running ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Chạy cả luồng ({activeModules.length} bước)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Tiến trình chi tiết</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {displaySteps.map((step) => (
                <div
                  key={step.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    Module {step.moduleNumber} · {step.title}
                  </span>
                  <StepBadge status={step.status} />
                </div>
              ))}
              {displaySteps.some((step) => step.error) && (
                <p role="alert" className="text-xs text-destructive">
                  {displaySteps.find((step) => step.error)?.error}
                </p>
              )}
            </CardContent>
          </Card>

          {allDone && (
            <Card className="h-fit" data-testid="pipeline-package">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Gói nội
                    dung
                  </span>
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(markdown)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadMarkdown(markdown, pool.primaryKeyword)}
                    >
                      <Download className="h-3.5 w-3.5" /> Tải .md
                    </Button>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PipelinePackage modules={activeModules} steps={displaySteps} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Flow graph ngang: mỗi bước một node kính, badge số đổi màu theo trạng thái
// live; đường nối gradient có shimmer chạy khi dữ liệu đang truyền sang bước sau.
function PipelineGraph({
  steps,
  modules,
}: {
  steps: StepState[];
  modules: PipelineModule[];
}) {
  const done = steps.filter((step) => step.status === "succeeded").length;
  return (
    <div className="glass p-5" data-testid="pipeline-graph">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitBranch className="h-4 w-4 text-geo" /> Sơ đồ luồng
        </h2>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-accent">
            <span
              className="block h-full rounded-full transition-all duration-500"
              style={{
                width: `${steps.length > 0 ? (done / steps.length) * 100 : 0}%`,
                background: "linear-gradient(90deg,var(--spectrum-1),var(--spectrum-3))",
              }}
            />
          </span>
          <span className="metric text-xs text-muted-foreground">
            {done}/{steps.length} bước xong
          </span>
        </span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center">
          {steps.map((step, index) => {
            const mod = modules.find((item) => item.key === step.key);
            const next = steps[index + 1];
            return (
              <div key={step.key} className="flex items-center">
                <PipelineNode
                  step={step}
                  category={translateCategory(mod?.category ?? "")}
                />
                {index < steps.length - 1 && (
                  <Connector
                    active={step.status === "succeeded"}
                    flowing={
                      step.status === "succeeded" && next?.status === "running"
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PipelineNode({
  step,
  category,
}: {
  step: StepState;
  category: string;
}) {
  const ring =
    step.status === "succeeded"
      ? "border-success/50"
      : step.status === "failed"
        ? "border-destructive/50"
        : step.status === "running"
          ? "border-spectrum-2/60"
          : "border-border";
  const badgeStyle: React.CSSProperties =
    step.status === "succeeded"
      ? { background: "color-mix(in oklab, var(--success) 22%, transparent)", color: "var(--success)" }
      : step.status === "failed"
        ? { background: "color-mix(in oklab, var(--destructive) 22%, transparent)", color: "var(--destructive)" }
        : step.status === "running"
          ? { background: "linear-gradient(135deg,#35c4f0,#9b8cff)", color: "#0a0a12" }
          : { background: "var(--accent)", color: "var(--muted-foreground)" };
  return (
    <div
      className={`glass-hover flex w-48 shrink-0 flex-col gap-2 rounded-2xl border ${ring} p-3.5`}
      style={{ background: "var(--glass-bg)" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="metric flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
          style={badgeStyle}
        >
          {step.moduleNumber}
        </span>
        {step.status === "succeeded" ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : step.status === "failed" ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : step.status === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin text-spectrum-2" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
      <span className="eyebrow">{category}</span>
      <p className="text-sm font-medium leading-snug text-foreground">
        {step.title}
      </p>
      <p className="metric text-[10px] text-muted-foreground/60">
        {step.status === "succeeded"
          ? "Đã xong · dữ liệu chuyển sang bước sau"
          : step.status === "running"
            ? "Đang chạy…"
            : step.status === "failed"
              ? "Thất bại"
              : `Module ${step.moduleNumber}`}
      </p>
    </div>
  );
}

function Connector({ active, flowing }: { active: boolean; flowing: boolean }) {
  return (
    <div
      className="relative mx-2 h-1 w-12 shrink-0 overflow-hidden rounded-full"
      style={{
        background: active
          ? "linear-gradient(90deg,var(--spectrum-1),var(--spectrum-3))"
          : "var(--border)",
      }}
    >
      {flowing && <span className="absolute inset-0 rounded-full flow-active" />}
    </div>
  );
}

function translateCategory(category: string): string {
  return (
    {
      Research: "Nghiên cứu",
      SEO: "SEO",
      Content: "Nội dung",
      Publishing: "Xuất bản",
      Video: "Video",
      Website: "Dựng web",
    }[category] ?? category
  );
}

// Gói kết quả cuối: mỗi module một mục xổ được, bên trong dùng bộ trình bày
// OutputBlockView (checklist, chips, so sánh A/B, storyboard…) thay vì text thô.
function PipelinePackage({
  modules,
  steps,
}: {
  modules: PipelineModule[];
  steps: StepState[];
}) {
  return (
    <div className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1">
      {modules.map((mod, index) => {
        const step = steps.find((item) => item.key === mod.key);
        if (!step || step.status !== "succeeded" || !step.output) return null;
        const blocks = mod.outputBlocks.filter((block) => {
          const value = step.output?.[block.key];
          return typeof value === "string" && value.length > 0;
        });
        if (blocks.length === 0) return null;
        return (
          <details
            key={mod.key}
            open={index === 0}
            className="group rounded-lg border border-border bg-background/40"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium text-foreground">
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold">
                {mod.moduleNumber}
              </span>
              {mod.title}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {blocks.length} khối
              </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-border p-3">
              {blocks.map((block) => (
                <OutputBlockView
                  key={block.key}
                  blockKey={block.key}
                  label={block.label}
                  value={step.output?.[block.key] as string}
                />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === "succeeded")
    return <Badge variant="success">Hoàn thành</Badge>;
  if (status === "failed") return <Badge variant="destructive">Thất bại</Badge>;
  if (status === "running")
    return (
      <Badge variant="blue">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Đang chạy
      </Badge>
    );
  return <Badge variant="outline">Chờ</Badge>;
}

function initialPool(project: ProjectOption | undefined): Record<string, string> {
  return {
    primaryKeyword: "",
    pageLabel: "",
    location: project?.location ?? "Việt Nam",
    language: project?.language ?? "Tiếng Việt",
    tone: project?.tone ?? "Chuyên nghiệp",
    audienceBrief: "",
    pageUrl: "",
    siteName: project?.name ?? "",
    websiteUrl: project?.website ?? "",
  };
}

function assembleMarkdown(
  modules: PipelineModule[],
  steps: StepState[],
  topic: string,
): string {
  const lines: string[] = [`# Gói nội dung SEO + GEO: ${topic || "(chủ đề)"}`, ""];
  for (const mod of modules) {
    const step = steps.find((item) => item.key === mod.key);
    if (!step || step.status !== "succeeded" || !step.output) continue;
    for (const block of mod.outputBlocks) {
      const value = step.output[block.key];
      if (typeof value !== "string" || value.length === 0) continue;
      lines.push(
        `## Module ${mod.moduleNumber} · ${mod.title} — ${block.label}`,
        "",
        value,
        "",
      );
    }
  }
  return lines.join("\n");
}

function downloadMarkdown(markdown: string, topic: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(topic || "goi-noi-dung").replace(/[^\p{L}\p{N}]+/gu, "-")}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
