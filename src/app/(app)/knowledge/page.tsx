import { BookOpen, Braces, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getKnowledgeOverview } from "@/lib/knowledge/knowledge-overview.server";

export default async function KnowledgePage() {
  const identity = await requirePageIdentity();
  const overview = await getKnowledgeOverview(identity.workspaceId);
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-lg font-semibold">Kho tri thức và prompt mẫu</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Dữ liệu lưu cục bộ; chưa tạo embedding hoặc gọi mô hình bên ngoài</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Bản ghi tri thức</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.knowledge.map((item) => (
              <div key={item.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><Badge variant="outline">{item.type}</Badge></div>
                <p className="mt-1 text-xs text-muted-foreground">{item.projectName}</p>
                <p className="mt-3 text-xs leading-relaxed">{item.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Phiên bản prompt</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {overview.prompts.map((prompt) => (
              <div key={prompt.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{prompt.name}</p><Badge variant="outline">v{prompt.currentVersion}</Badge></div>
                <p className="mt-1 text-xs text-muted-foreground">{prompt.description}</p>
                <p className="mt-3 rounded bg-accent/50 p-2 font-mono text-xs">{prompt.content}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Braces className="h-3 w-3" /> {prompt.variables.join(", ")}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
