import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Globe,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { layCheDo } from "@/lib/che-do-don-gian.server";
import { getProjectService } from "@/lib/projects/project-service.server";

const statusConfig = {
  active: { label: "Đang hoạt động", variant: "success" as const, icon: CheckCircle2 },
  archived: { label: "Đã lưu trữ", variant: "outline" as const, icon: Archive },
};

export default async function ProjectsPage() {
  const identity = await requirePageIdentity();
  const projects = await getProjectService().list(identity);
  const canCreate = roleHasPermission(identity.role, "project.create");
  // Chế độ Đơn giản: gọi đúng chữ ở thanh bên ("Website của tôi"), không "workspace".
  const donGian = (await layCheDo()) === "don-gian";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{donGian ? "Website của tôi" : "Dự án"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {donGian
              ? `${projects.length} website — mỗi website là một dự án, có lịch tự viết bài riêng`
              : `${projects.length} dự án trong workspace`}
          </p>
        </div>
        {canCreate ? (
          <Link href="/projects/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Tạo dự án
            </Button>
          </Link>
        ) : (
          <Badge variant="outline">Quyền chỉ xem</Badge>
        )}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Globe}
              title="Chưa có dự án nào"
              description={
                canCreate
                  ? "Dự án là nơi lưu website, thị trường, ngôn ngữ và giọng văn. Mọi module đều chạy theo dự án, nên đây là bước đầu tiên."
                  : "Chưa có dự án nào trong workspace. Chủ sở hữu hoặc biên tập viên là người tạo dự án đầu tiên."
              }
              action={
                canCreate ? { label: "Tạo dự án đầu tiên", href: "/projects/new" } : undefined
              }
              hint={
                canCreate
                  ? "Sau khi có dự án, vào API Keys thêm key DeepSeek rồi bắt đầu từ Module 1 · Tạo Sitemap."
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const { label, variant, icon: StatusIcon } =
              statusConfig[project.status];
            return (
              <Card
                key={project.id}
                data-testid="project-card"
                className="h-full transition-colors hover:border-border/80"
              >
                <CardContent className="pt-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-accent">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">
                            {project.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {hostname(project.website)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={variant} className="shrink-0">
                        <StatusIcon className="h-2.5 w-2.5" />
                        {label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{localizePreset(project.language)}</Badge>
                      <Badge variant="outline">{localizePreset(project.tone)}</Badge>
                      {project.industry && (
                        <Badge variant="outline">{project.industry}</Badge>
                      )}
                      {project.integrations.wordpress.status === "configured" && (
                        <Badge variant="purple">
                          <ShieldCheck className="h-2.5 w-2.5" /> WordPress
                        </Badge>
                      )}
                    </div>

                    <div className="flex min-h-10 flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        Đối thủ ({project.competitors.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {project.competitors.slice(0, 3).map((competitor) => (
                          <span
                            key={competitor.id}
                            className="rounded border border-border bg-accent px-1.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {competitor.domain}
                          </span>
                        ))}
                        {project.competitors.length > 3 && (
                          <span className="rounded border border-border bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">
                            +{project.competitors.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted-foreground">
                        Cập nhật {formatDate(project.updatedAt)}
                      </span>
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function hostname(url: string): string {
  return new URL(url).hostname;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
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
