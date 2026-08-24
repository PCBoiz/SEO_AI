import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getSitemapPilotRuntimeSummary } from "@/lib/sitemap/sitemap-pilot-service.server";
import { SitemapPilotForm } from "@/app/(app)/automations/sitemap/sitemap-pilot-form";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";

export default async function SitemapPilotPage() {
  const identity = await requirePageIdentity();
  const projects = (await getProjectService().list(identity)).filter(
    (project) => project.status === "active",
  );
  const runtime = getSitemapPilotRuntimeSummary();
  const aiProviders = listAiProviderStatuses();

  return (
    <SitemapPilotForm
      projects={projects.map((project) => ({
        id: project.id,
        name: project.name,
        website: project.website,
        location: project.location,
        language: project.language,
        tone: project.tone,
        competitors: project.competitors.map((competitor) => competitor.domain),
      }))}
      canRun={roleHasPermission(identity.role, "pipeline.run")}
      runtime={runtime}
      aiProviders={aiProviders.map(({ id, label, model }) => ({
        id,
        label,
        model,
      }))}
    />
  );
}
