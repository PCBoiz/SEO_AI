import { FileText } from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import {
  getModuleDefinition,
  listModuleDefinitions,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { EmptyState } from "@/components/ui/empty-state";
import { OutputsBrowser, type OutputRecord } from "./outputs-browser";

export const dynamic = "force-dynamic";

// Kho kết quả: mọi lần chạy THÀNH CÔNG của mọi module, lọc theo dự án/module,
// xem lại nội dung bằng đúng bộ trình bày của trang chạy module.
export default async function OutputsPage() {
  const identity = await requirePageIdentity();
  const [jobs, projects] = await Promise.all([
    getModuleJobService().listRecentActivity(identity, 50),
    getProjectService().list(identity),
  ]);

  const projectNames = new Map(projects.map((item) => [item.id, item.name]));
  const records: OutputRecord[] = jobs
    .filter((job) => job.status === "succeeded" && job.output)
    .map((job) => {
      let title = job.moduleKey;
      let moduleNumber = 0;
      let outputBlocks: Array<{ key: string; label: string }> = [];
      try {
        const definition = getModuleDefinition(job.moduleKey);
        title = definition.title;
        moduleNumber = definition.moduleNumber;
        outputBlocks = definition.outputBlocks;
      } catch {
        // Module đã gỡ khỏi registry — vẫn hiện bản ghi cũ, chỉ thiếu nhãn đẹp.
      }
      return {
        id: job.id,
        moduleKey: job.moduleKey,
        moduleNumber,
        moduleTitle: title,
        projectId: job.projectId,
        projectName: projectNames.get(job.projectId) ?? "(dự án đã xoá)",
        createdAt: job.createdAt.toISOString(),
        pinned: job.pinnedAt !== null,
        outputBlocks,
        output: job.output as Record<string, unknown>,
      };
    });

  const moduleOptions = listModuleDefinitions().map((definition) => ({
    key: definition.key,
    label: `${definition.moduleNumber} · ${definition.title}`,
  }));

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Nội dung đầu ra
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mọi kết quả đã chạy thành công, gom về một chỗ để xem lại, copy và tải
          về — không cần mở lại từng module.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="glass">
          <EmptyState
            icon={FileText}
            title="Chưa có kết quả nào"
            description="Đây là kho chứa mọi nội dung AI đã tạo. Chạy một module bất kỳ, kết quả sẽ tự động xuất hiện ở đây để bạn xem lại, tìm kiếm và tải về."
            action={{ label: "Chạy một module", href: "/automations" }}
            secondaryAction={{ label: "Chạy cả luồng", href: "/pipelines" }}
            hint="Gợi ý: bắt đầu từ Module 1 · Tạo Sitemap để dựng cấu trúc website, rồi các module sau tự dùng lại kết quả đó."
          />
        </div>
      ) : (
        <OutputsBrowser
          records={records}
          projects={projects.map((item) => ({ id: item.id, name: item.name }))}
          modules={moduleOptions}
        />
      )}
    </div>
  );
}
