"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutputBlockView } from "@/components/viz/output-block-view";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";

interface ProviderOption {
  id: AiProviderId;
  label: string;
  model: string;
}

// Nhận định AI on-demand trên dữ liệu nội bộ (BYOK). Bấm nút → gọi route
// /api/v1/analytics/insights (gom số liệu module_jobs + gọi model bằng key user).
export function AnalyticsInsights({
  aiProviders,
}: {
  aiProviders: ProviderOption[];
}) {
  const [provider, setProvider] = useState<AiProviderId>(
    aiProviders.find((p) => p.id === "deepseek")?.id ??
      aiProviders[0]?.id ??
      "deepseek",
  );
  const selected = aiProviders.find((p) => p.id === provider);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [insights, setInsights] = useState<string>();

  async function run(): Promise<void> {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/v1/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: selected?.model }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? "Không tạo được nhận định.");
      }
      const payload = (await response.json()) as { insights: string };
      setInsights(payload.insights);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không tạo được nhận định.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 text-geo" /> Nhận định AI
        </h2>
        <div className="flex items-center gap-2">
          {/* `aria-label` chứ không phải nhãn nhìn thấy được: ô này nằm cạnh
              tiêu đề "Nhận định AI" nên với người nhìn thì ngữ cảnh đã rõ.
              Nhưng trình đọc màn hình đọc từng phần tử tách rời — không có nhãn
              thì nó chỉ đọc "hộp chọn", người dùng không biết đang chọn gì. */}
          <select
            aria-label="Chọn trợ lý AI dùng để phân tích"
            value={provider}
            onChange={(event) => setProvider(event.target.value as AiProviderId)}
            disabled={pending || aiProviders.length === 0}
            className="h-8 rounded-md border border-border bg-input px-2 text-xs"
          >
            {aiProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={run}
            disabled={pending || aiProviders.length === 0}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Tạo nhận định AI
          </Button>
        </div>
      </div>
      {/* ⚠️ CÂU CŨ HỨA MỘT VIỆC CHƯA LÀM: "Sẽ mở rộng sang dữ liệu xếp hạng GSC
          khi kết nối". Việc đó đã làm xong (10/09) — cố vấn giờ đọc cả truy vấn
          và trang từ Search Console khi có kết nối.

          Đừng viết lại thành thì tương lai. Một dòng chữ hứa hẹn nằm mãi trên
          giao diện là cách chắc chắn nhất để không ai nhận ra lúc nó đã thành
          sự thật — hoặc lúc nó không bao giờ thành. */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Đọc hoạt động nội bộ (module_jobs) <strong>và số liệu Search Console</strong>{" "}
        — truy vấn, trang, vị trí — rồi dùng API key của bạn (BYOK) để đưa khuyến
        nghị. Chưa kết nối GSC thì nó nói rõ là không có số thứ hạng, thay vì đoán.
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {insights ? (
        <OutputBlockView label="Khuyến nghị" value={insights} />
      ) : (
        !error && (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground/60">
            Bấm &quot;Tạo nhận định AI&quot; để nhận khuyến nghị từ số liệu của bạn.
          </div>
        )
      )}
    </div>
  );
}
