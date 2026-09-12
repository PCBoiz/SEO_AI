import { notFound } from "next/navigation";
import { NotFoundError } from "@/domain/shared/app-error";
import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { isWordpressComOAuthConfigured } from "@/infrastructure/config/wordpress-com-environment";
import { ProjectEditForm } from "@/app/(app)/projects/[projectId]/project-edit-form";
import { LeadSheetCard } from "@/app/(app)/projects/[projectId]/lead-sheet-card";
import { DriveFolderCard } from "@/app/(app)/projects/[projectId]/drive-folder-card";
import { XoaDuAnCard } from "@/app/(app)/projects/[projectId]/xoa-du-an-card";
import { LichDangCard } from "@/app/(app)/projects/[projectId]/lich-dang-card";
import { trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { layCheDo } from "@/lib/che-do-don-gian.server";

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
  // Xoá hẳn: chỉ chủ workspace, và được cả với dự án đã lưu trữ — dọn dự án thử
  // là việc hay làm nhất với nút này.
  const canDelete = roleHasPermission(identity.role, "project.delete");
  const bangKhach = canDelete ? await trangThaiBangKhach(identity, project.id) : { daLap: false };
  // Lịch đăng chạy bằng khoá AI của người bấm Lưu — hộp chọn chỉ mở những nhà
  // cung cấp người này đã có khoá.
  const khoaCuaToi = await getAiKeyService().listStatus(identity.userId);
  const nhaCungCap = listAiProviderStatuses().map((n) => {
    const k = khoaCuaToi.find((x) => x.provider === n.id && x.configured);
    return { id: n.id, label: n.label, model: k ? (k.model ?? n.model) : null };
  });
  // Chế độ Đơn giản: thẻ tự động hoá lên trước, biểu mẫu cấu hình xuống dưới —
  // người vận hành mở trang này để xem "hôm nay có bài chưa", không phải để
  // sửa giọng văn. Nâng cao giữ thứ tự cũ (cấu hình trước).
  const donGian = (await layCheDo()) === "don-gian";

  const bieuMau = (
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

  return (
    <div className="flex flex-col">
    {donGian ? (
      <header className="flex flex-col gap-1 px-4 pt-6 sm:px-6">
        <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          Ba việc máy tự làm cho website này. Thông tin website và giọng văn nằm ở cuối trang.
        </p>
      </header>
    ) : bieuMau}
    {/* Bảng khách liên hệ — tách khỏi form vì nó không phải một trường để
        lưu, mà là một việc làm một lần (lập bảng) và một cặp giá trị để dán
        sang website. */}
    <div className="flex max-w-3xl flex-col gap-6 px-4 pb-6 sm:px-6">
      <LichDangCard
        projectId={project.id}
        tenDuAn={project.name}
        website={project.website}
        canEdit={canEdit && roleHasPermission(identity.role, "pipeline.run")}
        canRotate={roleHasPermission(identity.role, "workspace.secrets.manage")}
        macDinh={{
          location: project.location ?? "Việt Nam",
          language: project.language,
          tone: project.tone,
        }}
        nhaCungCap={nhaCungCap}
      />
      <DriveFolderCard projectId={project.id} canEdit={canEdit} />
      {/* Lập bảng khách: chỉ chủ workspace — xem chú thích trong route. */}
      <LeadSheetCard
        projectId={project.id}
        canEdit={
          canEdit && roleHasPermission(identity.role, "workspace.secrets.manage")
        }
      />
      {canDelete && (
        <XoaDuAnCard
          projectId={project.id}
          tenDuAn={project.name}
          coBangKhach={bangKhach.daLap}
        />
      )}
    </div>
    {donGian ? (
      <details className="px-4 pb-8 sm:px-6">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Thông tin website, giọng văn, đối thủ (ít khi cần sửa)
        </summary>
        {bieuMau}
      </details>
    ) : null}
    </div>
  );
}
