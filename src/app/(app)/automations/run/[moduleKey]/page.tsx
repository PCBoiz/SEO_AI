import { notFound } from "next/navigation";
import { roleHasPermission } from "@/domain/auth/permissions";
import {
  getModuleDefinition,
  listModuleDefinitions,
  toModuleDefinitionView,
} from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { databaseAdapter } from "@/lib/db";
import { layCheDo } from "@/lib/che-do-don-gian.server";
import { tenHienThi } from "@/domain/modules/ngon-ngu-nguoi-dung";
import { ModuleRunnerForm } from "@/app/(app)/automations/run/[moduleKey]/module-runner-form";

interface PageProps {
  params: Promise<{ moduleKey: string }>;
}

export default async function ModuleRunnerPage({ params }: PageProps) {
  const { moduleKey } = await params;
  let moduleView;
  try {
    moduleView = toModuleDefinitionView(getModuleDefinition(moduleKey));
  } catch {
    notFound();
  }

  const identity = await requirePageIdentity();
  const cheDo = await layCheDo();
  const projects = (await getProjectService().list(identity)).filter(
    (project) => project.status === "active",
  );

  const moduleTitles = Object.fromEntries(
    listModuleDefinitions().map((definition) => [
      definition.key,
      `Module ${definition.moduleNumber} · ${definition.title}`,
    ]),
  );

  return (
    <ModuleRunnerForm
      module={moduleView}
      moduleTitles={moduleTitles}
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        language: project.language,
        tone: project.tone,
        website: project.website,
      }))}
      canRun={roleHasPermission(identity.role, "pipeline.run")}
      tenViec={tenHienThi(moduleKey)}
      cheDo={cheDo}
      persistence={databaseAdapter.kind}
      aiProviders={listAiProviderStatuses().map(({ id, label, model }) => ({
        id,
        label,
        model,
      }))}
    />
  );
}
