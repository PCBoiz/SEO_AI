import { roleHasPermission } from "@/domain/auth/permissions";
import {
  getModuleDefinition,
  toModuleDefinitionView,
} from "@/domain/modules/module-definition";
import { pipelinePresets } from "@/domain/modules/registry";
import "@/domain/modules/registry";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { listSocialIntegrationStatus } from "@/lib/integrations/integration-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { databaseAdapter } from "@/lib/db";
import { PipelineRunner } from "@/app/(app)/pipelines/pipeline-runner";

// Trang Quy trình = chạy cả luồng thật với sơ đồ trạng thái live theo từng bước.
// (Preview mô phỏng Phase 2 cũ đã được thay thế theo quyết định của owner.)
export default async function PipelinesPage() {
  const identity = await requirePageIdentity();
  const projects = (await getProjectService().list(identity)).filter(
    (project) => project.status === "active",
  );

  const toPipelineModule = (key: string) => {
    const view = toModuleDefinitionView(getModuleDefinition(key));
    return {
      key: view.key,
      moduleNumber: view.moduleNumber,
      title: view.title,
      category: view.category,
      fieldKeys: view.form.map((field) => field.key),
      asLinesKeys: view.form
        .filter((field) => field.asLines)
        .map((field) => field.key),
      outputBlocks: view.outputBlocks,
    };
  };
  const presets = pipelinePresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    modules: preset.moduleKeys.map(toPipelineModule),
  }));
  // ═══════════════════════════════════════════════════════════════════════
  // BƯỚC ĐĂNG CUỐI: CHỌN THEO DỰ ÁN, KHÔNG ĐÓNG CỨNG.
  //
  // Dòng cũ ở đây là `const publishModule = toPipelineModule("RIS_WP_PUBLISH")`
  // — một chuỗi cứng, nghĩa là MỌI dự án đều chỉ có một lựa chọn đăng bài:
  // WordPress.
  //
  // Hậu quả đo được: dự án "hạ long xanh" là trang Next.js tự code, nhận bài
  // qua `/api/ingest`, không có WordPress và không nên có. Chạy cả luồng thì
  // tám bước đầu chạy xong, bước chín chết với "Dự án chưa cấu hình WordPress
  // — vào Dự án → Sửa để thêm URL, username và Application Password". Lời
  // khuyên đó dẫn người dùng đi làm một việc không làm được.
  //
  // Và module ĐÚNG thì đã có sẵn: `RIS_VHGG_PUBLISH` viết xong, đăng ký ở
  // `registry.ts`, rồi không xuất hiện ở bất kỳ đâu khác trong ứng dụng — không
  // trong thứ tự module, không trong luồng dựng sẵn, không trong màn này. Nó
  // tồn tại mà không có đường nào chạm tới.
  //
  // Giờ đưa cả hai lên cho người dùng chọn, kèm trạng thái đã cấu hình của
  // từng dự án để mặc định chọn đúng cái.
  // ═══════════════════════════════════════════════════════════════════════
  const publishModules = [
    { ...toPipelineModule("RIS_WP_PUBLISH"), integrationType: "wordpress" },
    { ...toPipelineModule("RIS_VHGG_PUBLISH"), integrationType: "custom_site" },
  ];

  // Dự án nào đã nối trang tự code. Chỉ một câu SELECT cho mỗi dự án, KHÔNG
  // giải mã bí mật nào — chỉ đọc cột trạng thái.
  const trangDaNoi = await Promise.all(
    projects.map(async (project) => {
      try {
        const statuses = await listSocialIntegrationStatus(
          identity.workspaceId,
          project.id,
        );
        return [
          project.id,
          statuses
            .filter((item) => item.configured)
            .map((item) => item.type as string),
        ] as const;
      } catch {
        // Đọc trạng thái hỏng thì coi như chưa nối — người dùng vẫn chọn tay
        // được. Đây là dữ liệu để GỢI Ý mặc định, không phải hàng rào.
        return [project.id, [] as string[]] as const;
      }
    }),
  );
  const banDoTichHop = Object.fromEntries(trangDaNoi);

  return (
    <PipelineRunner
      presets={presets}
      publishModules={publishModules}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        language: project.language,
        tone: project.tone,
        website: project.website,
        tichHopDaNoi: banDoTichHop[project.id] ?? [],
      }))}
      canRun={roleHasPermission(identity.role, "pipeline.run")}
      persistence={databaseAdapter.kind}
      aiProviders={listAiProviderStatuses().map(({ id, label, model }) => ({
        id,
        label,
        model,
      }))}
    />
  );
}
