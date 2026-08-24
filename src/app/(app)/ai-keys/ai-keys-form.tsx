"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import {
  aiModelCatalog,
  costIcon,
  speedLabel,
} from "@/domain/ai/ai-model-catalog";
import type { AiProviderId } from "@/domain/ai/ai-model-provider";

const CUSTOM_MODEL = "__custom__";

type KeyStatus = "unverified" | "active" | "error";

interface KeyStatusView {
  provider: string;
  configured: boolean;
  status: KeyStatus;
  keyHint: string | null;
  model: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
}

interface ProviderInfo {
  id: string;
  label: string;
  model: string;
}

interface ApiEnvelope {
  error?: { message?: string };
  key?: KeyStatusView;
  verified?: boolean;
  message?: string;
  model?: string;
}

export function AiKeysForm({
  providers,
  initialKeys,
}: {
  providers: ProviderInfo[];
  initialKeys: KeyStatusView[];
}) {
  const initialMap: Record<string, KeyStatusView | undefined> = {};
  for (const key of initialKeys) initialMap[key.provider] = key;
  const [keys, setKeys] = useState(initialMap);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <KeyRound className="h-5 w-5 text-primary" /> API Keys AI
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Dán API key của bạn cho từng nhà cung cấp và chọn model muốn dùng. Key
          được mã hoá và lưu an toàn phía máy chủ, không bao giờ hiển thị lại và
          không gửi cho bên thứ ba. Antigravity dùng key này để chạy các module
          AI bằng tài khoản của bạn (BYOK) — bạn trả phí trực tiếp cho nhà cung
          cấp.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            status={keys[provider.id]}
            onChange={(value) =>
              setKeys((current) => ({ ...current, [provider.id]: value }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  status,
  onChange,
}: {
  provider: ProviderInfo;
  status: KeyStatusView | undefined;
  onChange: (value: KeyStatusView | undefined) => void;
}) {
  const catalog = aiModelCatalog[provider.id as AiProviderId] ?? [];
  const storedModel = status?.model ?? "";
  const storedInCatalog = catalog.some((option) => option.id === storedModel);

  const [modelChoice, setModelChoice] = useState<string>(() => {
    if (storedModel === "") return catalog[0]?.id ?? CUSTOM_MODEL;
    return storedInCatalog ? storedModel : CUSTOM_MODEL;
  });
  const [customModel, setCustomModel] = useState(
    storedModel !== "" && !storedInCatalog ? storedModel : "",
  );
  const effectiveModel =
    modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice;
  const modelReady =
    modelChoice !== CUSTOM_MODEL || customModel.trim().length > 0;

  const [value, setValue] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState<null | "save" | "verify" | "delete">(
    null,
  );
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function call(url: string, method: string): Promise<ApiEnvelope> {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: provider.id,
        apiKey: value.trim(),
        model: effectiveModel,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiEnvelope;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Yêu cầu thất bại.");
    }
    return payload;
  }

  async function save() {
    if (!value.trim() || !modelReady) return;
    setPending("save");
    setError(undefined);
    setNotice(undefined);
    try {
      const payload = await call("/api/v1/ai/keys", "POST");
      onChange(payload.key);
      setValue("");
      setNotice("Đã lưu key + model an toàn.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được key.");
    } finally {
      setPending(null);
    }
  }

  async function verify() {
    setPending("verify");
    setError(undefined);
    setNotice(undefined);
    try {
      const payload = await call("/api/v1/ai/keys/verify", "POST");
      if (payload.verified) {
        if (status) {
          onChange({
            ...status,
            status: "active",
            model: payload.model ?? effectiveModel,
          });
        }
        setNotice(`Model "${payload.model ?? effectiveModel}" hợp lệ — đã xác minh.`);
      } else {
        if (status) onChange({ ...status, status: "error" });
        setError(payload.message ?? "Key không hợp lệ.");
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không xác minh được.",
      );
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("delete");
    setError(undefined);
    setNotice(undefined);
    try {
      await call("/api/v1/ai/keys", "DELETE");
      onChange(undefined);
      setValue("");
      setNotice("Đã xoá key.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không xoá được key.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{provider.label}</span>
          <StatusBadge status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status?.configured && (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {status.keyHint && (
              <span>
                Key hiện tại:{" "}
                <code className="text-foreground">{status.keyHint}</code>
              </span>
            )}
            <span>
              Model đang dùng:{" "}
              <code className="text-foreground">
                {status.model ?? "(mặc định)"}
              </code>
            </span>
          </div>
        )}

        <FormField
          label="Model"
          htmlFor={`ai-model-${provider.id}`}
          description="Chọn model phù hợp với tài khoản của bạn — hoặc tự nhập model ID nếu không có trong danh sách. Bấm Verify để kiểm tra ngay model đang chọn (dùng key đã lưu)."
        >
          <select
            id={`ai-model-${provider.id}`}
            value={modelChoice}
            onChange={(event) => setModelChoice(event.target.value)}
            disabled={pending !== null}
            className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground"
          >
            {catalog.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} · {costIcon(option.cost)} ·{" "}
                {speedLabel(option.speed)}
              </option>
            ))}
            <option value={CUSTOM_MODEL}>Tự nhập model khác…</option>
          </select>
        </FormField>
        {modelChoice === CUSTOM_MODEL && (
          <Input
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value)}
            placeholder="ví dụ: gpt-5.4, claude-opus-4-8, gemini-3.6-pro"
            disabled={pending !== null}
          />
        )}

        <FormField
          label={status?.configured ? "Thay key mới" : "Dán API key"}
          htmlFor={`ai-key-${provider.id}`}
          description="Key chỉ được lưu ở dạng mã hoá và không hiển thị lại sau khi lưu."
        >
          <div className="flex gap-2">
            <Input
              id={`ai-key-${provider.id}`}
              type={reveal ? "text" : "password"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              disabled={pending !== null}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setReveal((previous) => !previous)}
              aria-label={reveal ? "Ẩn key" : "Hiện key"}
            >
              {reveal ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </FormField>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-400">
            {notice}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={save}
            disabled={pending !== null || !value.trim() || !modelReady}
          >
            {pending === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Lưu key
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={verify}
            disabled={pending !== null || !status?.configured}
          >
            {pending === "verify" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Verify
          </Button>
          {status?.configured && (
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={pending !== null}
            >
              {pending === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Xoá
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: KeyStatusView | undefined }) {
  if (!status?.configured) {
    return <Badge variant="warning">Chưa cấu hình</Badge>;
  }
  if (status.status === "active") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Đã xác minh
      </Badge>
    );
  }
  if (status.status === "error") {
    return (
      <Badge variant="destructive">
        <ShieldAlert className="mr-1 h-3 w-3" />
        Lỗi key
      </Badge>
    );
  }
  return (
    <Badge variant="blue">
      <ShieldQuestion className="mr-1 h-3 w-3" />
      Chưa xác minh
    </Badge>
  );
}
