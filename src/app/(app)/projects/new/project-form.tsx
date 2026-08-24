"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Globe, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";
import { WordpressHelp } from "@/components/modules/wordpress-help";

const languages = [
  "Tiếng Việt",
  "Tiếng Anh",
  "Tiếng Tây Ban Nha",
  "Tiếng Pháp",
  "Tiếng Đức",
  "Tiếng Nhật",
  "Tiếng Hàn",
  "Tiếng Trung",
  "Tiếng Bồ Đào Nha",
  "Tiếng Ý",
];

const tones = [
  "Chuyên nghiệp",
  "Cuốn hút",
  "Chuyên sâu kỹ thuật",
  "Trò chuyện tự nhiên",
  "Uy tín",
  "Thân thiện",
  "Trang trọng",
  "Gần gũi",
];

const optionalUrl = z.union([z.url("URL không hợp lệ"), z.literal("")]);
const projectFormSchema = z
  .object({
    name: z.string().trim().min(1, "Tên dự án là bắt buộc").max(100),
    website: z.url("URL không hợp lệ"),
    location: z.string().trim().max(100),
    industry: z.string().trim().max(100),
    language: z.string().min(1, "Ngôn ngữ là bắt buộc"),
    tone: z.string().min(1, "Giọng văn là bắt buộc"),
    wordpressUrl: optionalUrl,
    wordpressUsername: z.string().trim().max(100),
    wordpressPassword: z.string().max(512),
  })
  .superRefine((input, context) => {
    const wordpressValues = [
      input.wordpressUrl,
      input.wordpressUsername,
      input.wordpressPassword,
    ];
    const hasAny = wordpressValues.some(Boolean);
    const hasAll = wordpressValues.every(Boolean);
    if (hasAny && !hasAll) {
      context.addIssue({
        code: "custom",
        path: ["wordpressPassword"],
        message: "Cần nhập đủ URL, tên đăng nhập và mật khẩu ứng dụng.",
      });
    }
  });

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ApiErrorEnvelope {
  error?: {
    message?: string;
    details?: { issues?: Array<{ path: string; message: string }> };
  };
}

export function ProjectForm() {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitorError, setCompetitorError] = useState<string>();
  const [serverError, setServerError] = useState<string>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      location: "",
      industry: "",
      language: "Tiếng Việt",
      tone: "Chuyên nghiệp",
      wordpressUrl: "",
      wordpressUsername: "",
      wordpressPassword: "",
    },
  });

  function addCompetitor(): void {
    const domain = normalizeCompetitor(competitorInput);
    if (!domain) {
      setCompetitorError("Hãy nhập tên miền đối thủ hợp lệ.");
      return;
    }
    if (competitors.includes(domain)) {
      setCompetitorError("Đối thủ này đã có trong danh sách.");
      return;
    }
    if (competitors.length >= 10) {
      setCompetitorError("Mỗi dự án có tối đa 10 đối thủ.");
      return;
    }
    setCompetitors((current) => [...current, domain]);
    setCompetitorInput("");
    setCompetitorError(undefined);
  }

  async function onSubmit(data: ProjectFormData): Promise<void> {
    setServerError(undefined);
    const response = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        website: data.website,
        location: data.location || undefined,
        industry: data.industry || undefined,
        language: data.language,
        tone: data.tone,
        competitors: competitors.map((domain) => ({ domain, priority: 0 })),
        wordpress: data.wordpressUrl
          ? {
              url: data.wordpressUrl,
              username: data.wordpressUsername,
              password: data.wordpressPassword,
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
      const firstIssue = payload.error?.details?.issues?.[0]?.message;
      setServerError(
        firstIssue ?? payload.error?.message ?? "Không thể tạo dự án.",
      );
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        {/* Liên kết ĐƯỢC TẠO DÁNG như nút, chứ KHÔNG phải nút lồng trong liên
            kết. `<button>` nằm trong `<a>` là HTML không hợp lệ — hai phần tử
            tương tác không được lồng nhau — và trình đọc màn hình gặp một nút
            không có tên bên trong một liên kết có tên, không biết đọc cái nào.
            Audit bắt được đúng chỗ này. */}
        <Link
          href="/projects"
          aria-label="Quay lại danh sách dự án"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tạo dự án</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Thiết lập không gian tự động hóa được lưu cục bộ
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" /> Thông tin chung
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="Tên dự án" htmlFor="project-name" error={errors.name?.message} required>
              <Input id="project-name" {...register("name")} placeholder="Ví dụ: SEO Công ty ABC" autoFocus />
            </FormField>
            <FormField label="URL website" htmlFor="project-website" error={errors.website?.message} required>
              <Input id="project-website" {...register("website")} placeholder="https://example.com" type="url" />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Địa điểm / thị trường" htmlFor="project-location" error={errors.location?.message}>
                <Input id="project-location" {...register("location")} placeholder="TP. Hồ Chí Minh" />
              </FormField>
              <FormField label="Ngành nghề" htmlFor="project-industry" error={errors.industry?.message}>
                <Input id="project-industry" {...register("industry")} placeholder="Thương mại điện tử" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Ngôn ngữ" htmlFor="project-language" error={errors.language?.message} required>
                <select id="project-language" {...register("language")} className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {languages.map((language) => <option key={language}>{language}</option>)}
                </select>
              </FormField>
              <FormField label="Giọng văn" htmlFor="project-tone" error={errors.tone?.message} required>
                <select id="project-tone" {...register("tone")} className="flex h-8 w-full rounded-md border border-border bg-input px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  {tones.map((tone) => <option key={tone}>{tone}</option>)}
                </select>
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Đối thủ</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <FormField label="Tên miền đối thủ" htmlFor="competitor-domain" error={competitorError} description="Thêm tối đa 10 tên miền để phân tích Sitemap.">
              <div className="flex gap-2">
                <Input
                  id="competitor-domain"
                  value={competitorInput}
                  onChange={(event) => setCompetitorInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCompetitor();
                    }
                  }}
                  placeholder="competitor.com"
                />
                <Button type="button" variant="outline" size="sm" onClick={addCompetitor}>
                  <Plus className="h-3.5 w-3.5" /> Thêm
                </Button>
              </div>
            </FormField>
            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {competitors.map((domain) => (
                  <Badge key={domain} variant="outline" className="gap-1 pr-1">
                    {domain}
                    <button
                      type="button"
                      aria-label={`Xóa ${domain}`}
                      onClick={() => setCompetitors((current) => current.filter((item) => item !== domain))}
                      className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Tích hợp WordPress
              <Badge variant="outline" className="text-[10px]">Tùy chọn · lưu nháp, chưa kết nối live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Thông tin đăng nhập được mã hóa khi lưu. Kết nối thật chạy khi bạn chạy Module 12 · Đăng WordPress.
            </p>
            <FormField label="WordPress URL" htmlFor="wordpress-url" description="Địa chỉ gốc của site — không kèm /wp-admin." error={errors.wordpressUrl?.message}>
              <Input id="wordpress-url" {...register("wordpressUrl")} placeholder="https://tenmien.com" type="url" />
            </FormField>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Tên đăng nhập" htmlFor="wordpress-username" description="Username đăng nhập WP (site tự host) — không phải email." error={errors.wordpressUsername?.message}>
                <Input id="wordpress-username" {...register("wordpressUsername")} placeholder="vd: admin" autoComplete="off" />
              </FormField>
              <FormField label="Mật khẩu ứng dụng / token" htmlFor="wordpress-password" description="Application Password (tự host) hoặc OAuth2 token (WordPress.com) — xem hướng dẫn dưới." error={errors.wordpressPassword?.message}>
                <Input id="wordpress-password" {...register("wordpressPassword")} type="password" placeholder="abcd EFGH ijkl MNOP qrst UVWX" autoComplete="new-password" />
              </FormField>
            </div>
            <WordpressHelp />
          </CardContent>
        </Card>

        {serverError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/projects"><Button type="button" variant="outline">Hủy</Button></Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Tạo dự án
          </Button>
        </div>
      </form>
    </div>
  );
}

function normalizeCompetitor(value: string): string | undefined {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
      return undefined;
    }
    if (url.hostname !== "localhost" && !url.hostname.includes(".")) {
      return undefined;
    }
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return undefined;
  }
}
