import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/shared/app-error";
import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { isWordpressComOAuthConfigured } from "@/infrastructure/config/wordpress-com-environment";
import { ProjectEditForm } from "@/app/(app)/projects/[projectId]/project-edit-form";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ wpcom?: string }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const identity = await requirePageIdentity();
  const { projectId } = await params;
  const { wpcom } = await searchParams;
  let project;
  try {
    project = await getProjectService().get(identity, projectId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <ProjectEditForm
      project={{
        id: project.id,
        name: project.name,
        website: project.website,
        location: project.location ?? "",
        industry: project.industry ?? "",
        language: project.language,
        tone: project.tone,
        status: project.status,
        competitors: project.competitors.map((competitor) => ({
          id: competitor.id,
          domain: competitor.domain,
          priority: competitor.priority,
        })),
        wordpress: project.integrations.wordpress,
      }}
      canEdit={
        project.status === "active" &&
        roleHasPermission(identity.role, "project.update")
      }
      canArchive={
        project.status === "active" &&
        roleHasPermission(identity.role, "project.delete")
      }
      wordpressComConfigured={isWordpressComOAuthConfigured()}
      wordpressComResult={wpcom}
    />
  );
}
