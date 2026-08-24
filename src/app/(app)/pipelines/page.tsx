import { roleHasPermission } from "@/domain/auth/permissions";
import {
  getModuleDefinition,
  toModuleDefinitionView,
} from "@/domain/modules/module-definition";
import { pipelinePresets } from "@/domain/modules/registry";
import "@/domain/modules/registry";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
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
  // Bước cuối tùy chọn: đăng WordPress (bản nháp) sau khi cả chuỗi xong.
  const publishModule = toPipelineModule("RIS_WP_PUBLISH");

  return (
    <PipelineRunner
      presets={presets}
      publishModule={publishModule}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        language: project.language,
        tone: project.tone,
        website: project.website,
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
