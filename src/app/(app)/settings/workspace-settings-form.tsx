"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";

interface WorkspaceSettingsFormProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    members: Array<{
      userId: string;
      displayName: string;
      email: string;
      role: "owner" | "editor" | "viewer";
    }>;
  };
  canEdit: boolean;
}

export function WorkspaceSettingsForm({
  workspace,
  canEdit,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canEdit) return;
    setPending(true);
    setError(undefined);
    setSaved(false);
    try {
      const response = await fetch("/api/v1/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; details?: { issues?: Array<{ message: string }> } };
        };
        throw new Error(payload.error?.details?.issues?.[0]?.message ?? payload.error?.message ?? "Cập nhật thất bại.");
      }
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cập nhật thất bại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Cài đặt workspace</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Thông tin workspace và thành viên được lưu cục bộ</p>
        </div>
        {!canEdit && <Badge variant="outline"><LockKeyhole className="h-3 w-3" /> Chỉ chủ sở hữu</Badge>}
      </div>
      <Card>
        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField label="Tên workspace" htmlFor="workspace-name" required>
              <Input id="workspace-name" value={name} onChange={(event) => setName(event.target.value)} disabled={!canEdit || pending} />
            </FormField>
            <FormField label="Slug workspace" htmlFor="workspace-slug" description="Chỉ dùng chữ thường, số và dấu gạch ngang." required>
              <Input id="workspace-slug" value={slug} onChange={(event) => setSlug(event.target.value)} disabled={!canEdit || pending} />
            </FormField>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            {saved && <p role="status" className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu workspace.</p>}
            {canEdit && <Button type="submit" className="self-end" disabled={pending}>{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Lưu workspace</Button>}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Thành viên ({workspace.members.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {workspace.members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0"><p className="truncate text-sm">{member.displayName}</p><p className="truncate text-xs text-muted-foreground">{member.email}</p></div>
              <Badge variant="outline">{member.role === "owner" ? "Chủ sở hữu" : member.role === "editor" ? "Biên tập viên" : "Chỉ xem"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
