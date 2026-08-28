"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plug, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";

// Card "Kết nối nền tảng": dán token theo dự án cho các module đăng bài
// (Facebook/Zalo/Google Business). Token gửi thẳng lên server, mã hoá vault,
// không bao giờ hiển thị lại — chỉ hiện trạng thái đã kết nối.

interface IntegrationStatus {
  type: string;
  configured: boolean;
  config: Record<string, string>;
}

const integrationMeta: Record<
  string,
  {
    label: string;
    secretLabel: string;
    configFields: Array<{ key: string; label: string; placeholder?: string }>;
    hint: string;
  }
> = {
  facebook: {
    label: "Facebook Page",
    secretLabel: "Page Access Token",
    configFields: [
      { key: "pageId", label: "Page ID", placeholder: "Ví dụ: 1234567890" },
    ],
    hint: "Tạo Meta App tại developers.facebook.com, cấp quyền pages_manage_posts, lấy Page Access Token.",
  },
  zalo: {
    label: "Zalo OA",
    secretLabel: "OA Access Token",
    configFields: [],
    hint: "Lấy Access Token của Official Account tại developers.zalo.me.",
  },
  google_business: {
    label: "Google Business Profile",
    secretLabel: "OAuth Access Token",
    configFields: [
      { key: "accountId", label: "Account ID" },
      { key: "locationId", label: "Location ID" },
    ],
    hint: "Token OAuth (có thể lấy nhanh qua Google OAuth Playground, scope business.manage). Lưu ý: access token Google hết hạn sau ~1 giờ — dán lại khi cần đăng.",
  },
  custom_site: {
    label: "Trang tự code",
    secretLabel: "Khoá đăng bài",
    configFields: [
      {
        key: "siteUrl",
        label: "Địa chỉ trang",
        placeholder: "https://tenmien.vn",
      },
    ],
    hint: "Dành cho trang do đội mình tự dựng, nhận bài qua cổng /api/ingest. Địa chỉ phải là TÊN MIỀN CHÍNH và dùng https — dạng www. hay tên miền phụ sẽ bị chuyển hướng, mà bộ đẩy bài cố ý không đi theo chuyển hướng (chuẩn fetch xoá header xác thực khi sang host khác, nên bài sẽ báo thành công mà không được tạo). Khoá đăng bài phải trùng với INGEST_TOKEN đặt ở phía trang.",
  },
};

export function IntegrationSetup({
  projectId,
  needs,
  canRun,
}: {
  projectId: string;
  needs: string[];
  canRun: boolean;
}) {
  const socialNeeds = needs.filter((type) => integrationMeta[type]);
  const needsWordpress = needs.includes("wordpress");
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { secret: string; config: Record<string, string> }>
  >({});
  const [saving, setSaving] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!projectId || socialNeeds.length === 0) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/integrations`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const payload = (await response.json()) as {
        integrations: IntegrationStatus[];
      };
      if (!cancelled) setStatuses(payload.integrations);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (socialNeeds.length === 0 && !needsWordpress) return null;

  async function save(type: string): Promise<void> {
    const draft = drafts[type];
    if (!draft?.secret?.trim()) return;
    setSaving(type);
    setMessage(undefined);
    try {
      const response = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/integrations/${type}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: draft.config ?? {},
            secret: draft.secret.trim(),
          }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? "Không thể lưu token.");
      }
      setMessage(`Đã kết nối ${integrationMeta[type].label}.`);
      setDrafts((current) => ({
        ...current,
        [type]: { secret: "", config: current[type]?.config ?? {} },
      }));
      setStatuses((current) =>
        current.map((item) =>
          item.type === type
            ? {
                ...item,
                configured: true,
                config: { ...item.config, ...(draft.config ?? {}) },
              }
            : item,
        ),
      );
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Không thể lưu token.");
    } finally {
      setSaving(undefined);
    }
  }

  return (
    <Card data-testid="integration-setup">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-4 w-4" /> Kết nối nền tảng
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {needsWordpress && (
          <p className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            WordPress được cấu hình trong <strong>Dự án → Sửa</strong> (URL,
            username, Application Password).
          </p>
        )}
        {socialNeeds.map((type) => {
          const meta = integrationMeta[type];
          const status = statuses.find((item) => item.type === type);
          const draft = drafts[type] ?? { secret: "", config: {} };
          return (
            <div
              key={type}
              className="flex flex-col gap-3 rounded-md border border-border bg-muted/10 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{meta.label}</span>
                {status?.configured ? (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Đã kết nối
                  </Badge>
                ) : (
                  <Badge variant="warning">Chưa kết nối</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{meta.hint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {meta.configFields.map((field) => (
                  <FormField
                    key={field.key}
                    label={field.label}
                    htmlFor={`intg-${type}-${field.key}`}
                  >
                    <Input
                      id={`intg-${type}-${field.key}`}
                      value={
                        draft.config[field.key] ??
                        status?.config[field.key] ??
                        ""
                      }
                      placeholder={field.placeholder}
                      disabled={!canRun || saving === type}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [type]: {
                            secret: current[type]?.secret ?? "",
                            config: {
                              ...(current[type]?.config ?? {}),
                              [field.key]: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </FormField>
                ))}
                <FormField
                  label={meta.secretLabel}
                  htmlFor={`intg-${type}-secret`}
                  description="Chỉ lưu dạng mã hoá; không hiển thị lại sau khi lưu."
                >
                  <Input
                    id={`intg-${type}-secret`}
                    type="password"
                    value={draft.secret}
                    disabled={!canRun || saving === type}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [type]: {
                          secret: event.target.value,
                          config: current[type]?.config ?? {},
                        },
                      }))
                    }
                  />
                </FormField>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canRun || !draft.secret.trim() || saving === type}
                  onClick={() => save(type)}
                >
                  {saving === type ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Lưu kết nối
                </Button>
              </div>
            </div>
          );
        })}
        {message && (
          <p role="status" className="text-xs text-emerald-400">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
