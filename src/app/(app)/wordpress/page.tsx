import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Play,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";

export const dynamic = "force-dynamic";

// Trang xuất bản WordPress: trạng thái kết nối từng dự án + các bài Module 12
// đã đăng. Trước đây là trang giữ chỗ ghi "chưa kết nối WordPress thật" —
// không còn đúng từ khi Module 12 đăng bài thật qua REST API / public-api.
export default async function WordpressPage() {
  const identity = await requirePageIdentity();
  const [projects, jobs] = await Promise.all([
    getProjectService().list(identity),
    getModuleJobService().listRecentActivity(identity, 50),
  ]);

  const projectNames = new Map(projects.map((item) => [item.id, item.name]));
  const publishJobs = jobs.filter((job) => job.moduleKey === "RIS_WP_PUBLISH");
  const connected = projects.filter(
    (project) => project.integrations.wordpress.status === "configured",
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">WordPress</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Trạng thái kết nối của từng dự án và các bài đã đăng. Bài viết được
          ghép từ Module 7/8/10/11 rồi đăng qua Module 12 — mặc định tạo bản nháp
          để bạn duyệt trong WordPress trước khi publish.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Globe className="h-4 w-4 text-geo" /> Kết nối theo dự án
          <span className="metric text-xs text-muted-foreground">
            {connected.length}/{projects.length} đã cấu hình
          </span>
        </h2>

        {projects.length === 0 ? (
          <p className="glass p-8 text-center text-sm text-muted-foreground">
            Chưa có dự án nào.{" "}
            <Link href="/projects/new" className="text-foreground underline">
              Tạo dự án đầu tiên
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const wordpress = project.integrations.wordpress;
              const ready = wordpress.status === "configured";
              return (
                <div key={project.id} className="glass flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {project.name}
                    </span>
                    <Badge variant={ready ? "success" : "outline"}>
                      {ready ? "Đã kết nối" : "Chưa cấu hình"}
                    </Badge>
                  </div>
                  {ready ? (
                    <>
                      <p className="truncate text-xs text-muted-foreground">
                        {wordpress.url}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" /> Thông tin đăng nhập
                        đã mã hóa
                      </p>
                    </>
                  ) : (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                      Thêm địa chỉ site và Application Password (hoặc bấm &quot;Kết
                      nối WordPress.com&quot;) để đăng bài tự động.
                    </p>
                  )}
                  <Link
                    href={`/projects/${project.id}`}
                    className="mt-auto inline-flex w-fit items-center gap-1.5 pt-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Settings2 className="h-3 w-3" />
                    {ready ? "Sửa cấu hình" : "Cấu hình ngay"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Bài đã đăng</h2>
        {publishJobs.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có bài nào được đăng qua Module 12.
            </p>
            <Link
              href="/automations/run/RIS_WP_PUBLISH"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5" /> Chạy Module 12
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {publishJobs.map((job) => {
              const postUrl =
                typeof job.output?.postUrl === "string" ? job.output.postUrl : null;
              const result =
                typeof job.output?.result === "string" ? job.output.result : "";
              const failed = job.status !== "succeeded";
              return (
                <div
                  key={job.id}
                  className="glass flex flex-wrap items-center gap-3 p-4"
                >
                  <Badge variant={failed ? "destructive" : "success"}>
                    {failed ? "Thất bại" : result.includes("ĐÃ PUBLISH") ? "Đã publish" : "Bản nháp"}
                  </Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {extractTitle(result) ?? job.errorMessage ?? "(không có tiêu đề)"}
                    </span>
                    <span className="metric text-[11px] text-muted-foreground/70">
                      {projectNames.get(job.projectId) ?? "(dự án đã xoá)"} ·{" "}
                      {job.createdAt.toLocaleString("vi-VN")}
                    </span>
                  </span>
                  {postUrl && (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" /> Mở bài
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Kết quả Module 12 là text nhiều dòng; lấy dòng "Tiêu đề: ..." để hiển thị.
function extractTitle(result: string): string | null {
  for (const line of result.split("\n")) {
    const match = line.match(/^\s*Tiêu đề:\s*(.+)$/);
    if (match) return match[1].trim();
  }
  return null;
}
