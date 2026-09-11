import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/shared/app-error";
import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { isWordpressComOAuthConfigured } from "@/infrastructure/config/wordpress-com-environment";
import { ProjectEditForm } from "@/app/(app)/projects/[projectId]/project-edit-form";
import { LeadSheetCard } from "@/app/(app)/projects/[projectId]/lead-sheet-card";
import { DriveFolderCard } from "@/app/(app)/projects/[projectId]/drive-folder-card";

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

  const canEdit =
    project.status === "active" && roleHasPermission(identity.role, "project.update");

  return (
    <div className="flex flex-col">
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
    {/* Bảng khách liên hệ — tách khỏi form vì nó không phải một trường để
        lưu, mà là một việc làm một lần (lập bảng) và một cặp giá trị để dán
        sang website. */}
    <div className="flex max-w-3xl flex-col gap-6 px-4 pb-6 sm:px-6">
      <DriveFolderCard projectId={project.id} canEdit={canEdit} />
      {/* Lập bảng khách: chỉ chủ workspace — xem chú thích trong route. */}
      <LeadSheetCard
        projectId={project.id}
        canEdit={
          canEdit && roleHasPermission(identity.role, "workspace.secrets.manage")
        }
      />
    </div>
    </div>
  );
}
