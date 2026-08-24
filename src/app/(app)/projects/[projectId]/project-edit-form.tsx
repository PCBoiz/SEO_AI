"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Plug,
  Plus,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { WordpressHelp } from "@/components/modules/wordpress-help";

interface EditableProject {
  id: string;
  name: string;
  website: string;
  location: string;
  industry: string;
  language: string;
  tone: string;
  status: "active" | "archived";
  competitors: Array<{ id: string; domain: string; priority: number }>;
  wordpress: {
    status: "configured" | "unconfigured" | "disabled" | "error";
    url: string | null;
    username: string | null;
  };
}

interface ProjectEditFormProps {
  project: EditableProject;
  canEdit: boolean;
  canArchive: boolean;
  // Server đã cấu hình WORDPRESS_COM_CLIENT_ID/SECRET → hiện nút kết nối 1 chạm.
  wordpressComConfigured?: boolean;
  // Kết quả quay về từ luồng OAuth (?wpcom=...) để hiện thông báo tiếng Việt.
  wordpressComResult?: string;
}

const wordpressComMessages: Record<
  string,
  { tone: "success" | "error"; text: string }
> = {
  connected: {
    tone: "success",
    text: "Đã kết nối WordPress.com — token được mã hóa và lưu vào dự án. Bạn có thể chạy Module 12 để đăng bài.",
  },
  denied: {
    tone: "error",
    text: "Bạn đã từ chối cấp quyền ở màn hình WordPress.com. Bấm lại nút kết nối nếu muốn thử lại.",
  },
  state_mismatch: {
    tone: "error",
    text: "Phiên kết nối không hợp lệ hoặc đã quá hạn (10 phút). Bấm lại nút kết nối để bắt đầu lại.",
  },
  missing_code: {
    tone: "error",
    text: "WordPress.com không trả về mã uỷ quyền. Bấm lại nút kết nối để thử lại.",
  },
  failed: {
    tone: "error",
    text: "Không lấy được token từ WordPress.com. Kiểm tra Redirect URL của ứng dụng tại developer.wordpress.com có khớp với địa chỉ app không.",
  },
};

interface ApiErrorEnvelope {
  error?: {
    message?: string;
    details?: { issues?: Array<{ path: string; message: string }> };
  };
}

export function ProjectEditForm({
  project,
  canEdit,
  canArchive,
  wordpressComConfigured = false,
  wordpressComResult,
}: ProjectEditFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState({
    name: project.name,
    website: project.website,
    location: project.location,
    industry: project.industry,
    language: localizePreset(project.language),
    tone: localizePreset(project.tone),
  });
  const [competitors, setCompetitors] = useState(project.competitors);
  const [competitorInput, setCompetitorInput] = useState("");
  const [wordpressEnabled, setWordpressEnabled] = useState(
    project.wordpress.status === "configured",
  );
  const [wordpress, setWordpress] = useState({
    url: project.wordpress.url ?? "",
    username: project.wordpress.username ?? "",
    password: "",
  });
  const [pending, setPending] = useState<"save" | "archive">();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  function updateField(name: keyof typeof fields, value: string): void {
    setFields((current) => ({ ...current, [name]: value }));
    setSaved(false);
  }

  function addCompetitor(): void {
    const domain = normalizeCompetitor(competitorInput);
    if (!domain) {
      setError("Hãy nhập tên miền đối thủ hợp lệ.");
      return;
    }
    if (competitors.some((competitor) => competitor.domain === domain)) {
      setError("Đối thủ này đã có trong danh sách.");
      return;
    }
    if (competitors.length >= 10) {
      setError("Mỗi dự án có tối đa 10 đối thủ.");
      return;
    }
    setCompetitors((current) => [
      ...current,
      { id: `new-${crypto.randomUUID()}`, domain, priority: 0 },
    ]);
    setCompetitorInput("");
    setError(undefined);
    setSaved(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEdit) return;
    setPending("save");
    setError(undefined);
    setSaved(false);
    try {
      const response = await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          competitors: competitors.map(({ domain, priority }) => ({
            domain,
            priority,
          })),
          wordpress: wordpressEnabled
            ? {
                url: wordpress.url,
                username: wordpress.username,
                password: wordpress.password || undefined,
              }
            : null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setWordpress((current) => ({ ...current, password: "" }));
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cập nhật thất bại.");
    } finally {
      setPending(undefined);
    }
  }

  async function archiveProject(): Promise<void> {
    if (!canArchive || !window.confirm("Bạn có muốn lưu trữ dự án này?")) return;
    setPending("archive");
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      router.push("/projects");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lưu trữ thất bại.");
      setPending(undefined);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/projects" aria-label="Quay lại danh sách dự án">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <Badge variant={project.status === "active" ? "success" : "outline"}>
                {project.status === "active" ? "Đang hoạt động" : "Đã lưu trữ"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {canEdit ? "Chỉnh sửa cấu hình dự án đã lưu" : "Cấu hình dự án chỉ đọc"}
            </p>
          </div>
        </div>
        {!canEdit && <Badge variant="outline"><LockKeyhole className="h-3 w-3" /> Chỉ đọc</Badge>}
      </div>

      <form onSubmit={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Thông tin dự án</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tên dự án" htmlFor="edit-project-name" required>
              <Input id="edit-project-name" value={fields.name} onChange={(event) => updateField("name", event.target.value)} disabled={!canEdit} />
            </FormField>
            <FormField label="URL website" htmlFor="edit-project-website" required>
              <Input id="edit-project-website" type="url" value={fields.website} onChange={(event) => updateField("website", event.target.value)} disabled={!canEdit} />
            </FormField>
            <FormField label="Địa điểm / thị trường" htmlFor="edit-project-location">
              <Input id="edit-project-location" value={fields.location} onChange={(event) => updateField("location", event.target.value)} disabled={!canEdit} />
            </FormField>
            <FormField label="Ngành nghề" htmlFor="edit-project-industry">
              <Input id="edit-project-industry" value={fields.industry} onChange={(event) => updateField("industry", event.target.value)} disabled={!canEdit} />
            </FormField>
            <FormField label="Ngôn ngữ" htmlFor="edit-project-language" required>
              <Input id="edit-project-language" value={fields.language} onChange={(event) => updateField("language", event.target.value)} disabled={!canEdit} />
            </FormField>
            <FormField label="Giọng văn" htmlFor="edit-project-tone" required>
              <Input id="edit-project-tone" value={fields.tone} onChange={(event) => updateField("tone", event.target.value)} disabled={!canEdit} />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Đối thủ</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {canEdit && (
              <FormField label="Thêm đối thủ" htmlFor="edit-competitor-domain">
                <div className="flex gap-2">
                  <Input id="edit-competitor-domain" value={competitorInput} onChange={(event) => setCompetitorInput(event.target.value)} placeholder="competitor.com" />
                  <Button type="button" variant="outline" onClick={addCompetitor}><Plus className="h-3.5 w-3.5" /> Thêm</Button>
                </div>
              </FormField>
            )}
            <div className="flex flex-wrap gap-1.5">
              {competitors.map((competitor) => (
                <Badge key={competitor.id} variant="outline" className="gap-1 pr-1">
                  {competitor.domain}
                  {canEdit && (
                    <button
                      type="button"
                      aria-label={`Xóa ${competitor.domain}`}
                      onClick={() => setCompetitors((current) => current.filter((item) => item.id !== competitor.id))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </Badge>
              ))}
              {competitors.length === 0 && <p className="text-xs text-muted-foreground">Chưa cấu hình đối thủ.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Cấu hình mẫu WordPress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={wordpressEnabled} onChange={(event) => setWordpressEnabled(event.target.checked)} disabled={!canEdit} />
              Lưu cấu hình WordPress đã mã hóa
            </label>
            {wordpressEnabled && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="WordPress URL" htmlFor="edit-wordpress-url" description="Địa chỉ gốc của site, ví dụ https://tenmien.com — không kèm /wp-admin." required>
                  <Input id="edit-wordpress-url" type="url" placeholder="https://tenmien.com" value={wordpress.url} onChange={(event) => setWordpress((current) => ({ ...current, url: event.target.value }))} disabled={!canEdit} />
                </FormField>
                <FormField label="Tên đăng nhập" htmlFor="edit-wordpress-username" description="Username đăng nhập WP (site tự host) — không phải email, không phải tên hiển thị." required>
                  <Input id="edit-wordpress-username" placeholder="vd: admin" value={wordpress.username} onChange={(event) => setWordpress((current) => ({ ...current, username: event.target.value }))} disabled={!canEdit} />
                </FormField>
                {canEdit && (
                  <FormField label="Mật khẩu ứng dụng / token" htmlFor="edit-wordpress-password" description={project.wordpress.status === "configured" ? "Để trống để giữ thông tin đã mã hóa hiện tại." : "Application Password (site tự host) hoặc OAuth2 token (site WordPress.com) — xem hướng dẫn bên dưới."}>
                    <Input id="edit-wordpress-password" type="password" placeholder="abcd EFGH ijkl MNOP qrst UVWX" value={wordpress.password} onChange={(event) => setWordpress((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" />
                  </FormField>
                )}
              </div>
            )}
            {wordpressComResult && wordpressComMessages[wordpressComResult] && (
              <p
                role={
                  wordpressComMessages[wordpressComResult].tone === "error"
                    ? "alert"
                    : "status"
                }
                className={`flex items-start gap-2 rounded-md border p-3 text-xs ${
                  wordpressComMessages[wordpressComResult].tone === "success"
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {wordpressComMessages[wordpressComResult].tone === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                {wordpressComMessages[wordpressComResult].text}
              </p>
            )}

            {wordpressEnabled && canEdit && wordpressComConfigured && (
              <div className="flex flex-col gap-2 rounded-lg border border-spectrum-3/30 bg-spectrum-3/5 p-3">
                <p className="text-xs text-foreground">
                  Site của bạn ở trên <span className="font-medium">WordPress.com</span> (địa chỉ *.wordpress.com, gói Free/Cá nhân/Cao cấp)?
                </p>
                <p className="text-xs text-muted-foreground">
                  Bấm nút dưới đây để cấp quyền một chạm — không cần tự lấy token, không cần dùng terminal. Bạn sẽ được chuyển sang WordPress.com để chọn site và bấm Approve, rồi quay lại đây.
                </p>
                <a
                  href={`/api/v1/integrations/wordpress-com/start?projectId=${encodeURIComponent(project.id)}`}
                  className="inline-flex w-fit items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                >
                  <Plug className="h-3.5 w-3.5" /> Kết nối WordPress.com
                </a>
              </div>
            )}

            {wordpressEnabled && <WordpressHelp />}
            <p className="text-xs text-muted-foreground">Màn hình này chỉ lưu (đã mã hóa). Kết nối thật chạy khi bạn chạy Module 12 · Đăng WordPress.</p>
          </CardContent>
        </Card>

        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
        {saved && <p role="status" className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu thay đổi dự án.</p>}

        {(canEdit || canArchive) && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {canArchive ? (
              <Button type="button" variant="destructive" onClick={archiveProject} disabled={Boolean(pending)}>
                {pending === "archive" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                Lưu trữ dự án
              </Button>
            ) : <span />}
            {canEdit && (
              <Button type="submit" disabled={Boolean(pending)}>
                {pending === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Lưu thay đổi
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

async function readApiError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
  return payload.error?.details?.issues?.[0]?.message ?? payload.error?.message ?? "Yêu cầu thất bại.";
}

function localizePreset(value: string): string {
  const presets: Record<string, string> = {
    English: "Tiếng Anh",
    Vietnamese: "Tiếng Việt",
    Professional: "Chuyên nghiệp",
    Engaging: "Cuốn hút",
    Technical: "Chuyên sâu kỹ thuật",
    Conversational: "Trò chuyện tự nhiên",
    Authoritative: "Uy tín",
    Friendly: "Thân thiện",
    Formal: "Trang trọng",
    Casual: "Gần gũi",
  };
  return presets[value] ?? value;
}

function normalizeCompetitor(value: string): string | undefined {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return undefined;
    if (url.hostname !== "localhost" && !url.hostname.includes(".")) return undefined;
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return undefined;
  }
}
