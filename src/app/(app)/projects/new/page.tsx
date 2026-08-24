import { LockKeyhole } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { roleHasPermission } from "@/domain/auth/permissions";
import { requirePageIdentity } from "@/lib/auth/dal";
import { ProjectForm } from "@/app/(app)/projects/new/project-form";

export default async function NewProjectPage() {
  const identity = await requirePageIdentity();
  if (!roleHasPermission(identity.role, "project.create")) {
    return (
      <div className="max-w-2xl p-4 sm:p-6">
        <Card>
          <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
            <LockKeyhole className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-sm font-medium">Workspace chỉ đọc</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Tài khoản chỉ xem không thể tạo hoặc chỉnh sửa dự án.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProjectForm />;
}
