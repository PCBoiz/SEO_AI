"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  FileCode2,
  FileImage,
  FileText,
  List,
  Loader2,
  Network,
  Rows3,
  Save,
  Shapes,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TreeSitemap } from "@/components/viz/tree-sitemap";
import {
  parseSitemapStructure,
  sitemapRowsFromTree,
  sitemapTextFromRows,
  sitemapToXml,
  type SitemapNode,
} from "@/domain/sitemap/sitemap-structure";
import { SitemapBlockEditor } from "./sitemap-block-editor";
import {
  downloadSitemapPng,
  downloadSitemapSvg,
  downloadText,
  safeFilename,
} from "@/lib/sitemap/sitemap-export";

interface Site {
  reference: string;
  draftSitemap: string;
  selectedSitemap: string;
  structure?: SitemapNode;
}

export interface SitemapJobView {
  id: string;
  status:
    | "queued"
    | "dispatching"
    | "running"
    | "succeeded"
    | "failed"
    | "timed_out";
  attemptCount: number;
  output: { contractVersion: "1.0"; mocked?: boolean; sites: Site[] } | null;
  errorMessage: string | null;
}

const statusLabels: Record<SitemapJobView["status"], string> = {
  queued: "Đang xếp hàng",
  dispatching: "Đang chuẩn bị",
  running: "AI đang tạo sitemap",
  succeeded: "Hoàn thành",
  failed: "Thất bại",
  timed_out: "Quá thời gian",
};

export function SitemapResult({
  job,
  canEdit,
  historyControl,
  onSaved,
}: {
  job?: SitemapJobView;
  canEdit: boolean;
  historyControl?: React.ReactNode;
  onSaved?: (job: SitemapJobView) => void;
}) {
  return (
    <div className="glass flex flex-col p-5" data-testid="sitemap-job-result">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          Kết quả
          {historyControl}
        </span>
        {job && (
          <Badge
            variant={
              job.status === "succeeded"
                ? "success"
                : job.status === "failed" || job.status === "timed_out"
                  ? "destructive"
                  : "blue"
            }
          >
            {["queued", "dispatching", "running"].includes(job.status) && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            {statusLabels[job.status]}
          </Badge>
        )}
      </div>

      {!job && (
        <div className="py-8">
          <p className="text-center text-sm text-muted-foreground">
            Điền thông tin bên trái rồi bấm{" "}
            <span className="text-foreground">Tạo Sitemap</span> — AI sẽ dựng cấu
            trúc website và vẽ thành sơ đồ cây tại đây.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            Kết quả xem được ở 3 dạng: danh sách trang sửa được, sơ đồ cây, và
            văn bản. Tải về được PNG, SVG, sitemap.xml.
          </p>
        </div>
      )}

      {job && ["queued", "dispatching", "running"].includes(job.status) && (
        <RunningState status={job.status} />
      )}

      {job && (job.status === "failed" || job.status === "timed_out") && (
        <p role="alert" className="flex gap-2 py-6 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {job.errorMessage ?? "Job không hoàn thành."}
        </p>
      )}

      {job && job.status === "succeeded" && job.output?.sites[0] && (
        <SucceededView
          jobId={job.id}
          site={job.output.sites[0]}
          canEdit={canEdit}
          onSaved={(selectedSitemap, structure) =>
            onSaved?.({
              ...job,
              output: {
                ...job.output!,
                sites: job.output!.sites.map((s, i) =>
                  i === 0 ? { ...s, selectedSitemap, structure } : s,
                ),
              },
            })
          }
        />
      )}
    </div>
  );
}

function RunningState({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-spectrum-2/20" />
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg,#35c4f0,#9b8cff)" }}
        >
          <Loader2 className="h-6 w-6 animate-spin text-[#0a0a12]" />
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {status === "running"
            ? "AI đang phân tích và dựng sitemap…"
            : "Đang chuẩn bị chạy…"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Giữ tab mở — kết quả sẽ tự hiện khi xong (thường 20–60 giây).
        </p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-spectrum-3"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function SucceededView({
  jobId,
  site,
  canEdit,
  onSaved,
}: {
  jobId: string;
  site: Site;
  canEdit: boolean;
  onSaved: (selectedSitemap: string, structure: SitemapNode) => void;
}) {
  const [view, setView] = useState<"blocks" | "text" | "diagram">("blocks");
  const [text, setText] = useState(site.selectedSitemap);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const diagramRef = useRef<HTMLDivElement>(null);

  const dirty = text.trim() !== site.selectedSitemap.trim();
  const structure = useMemo(
    () =>
      site.structure && !dirty
        ? site.structure
        : parseSitemapStructure(text, site.reference),
    [site.structure, dirty, text, site.reference],
  );

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/v1/sitemap-jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSitemap: text }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(payload.error?.message ?? "Không lưu được.");
      }
      setSaved(true);
      onSaved(text, parseSitemapStructure(text, site.reference));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  const baseName = `sitemap-${site.reference || "site"}`;

  // Sơ đồ chỉ nằm trong DOM khi đang ở tab "Sơ đồ" — nhắc người dùng thay vì
  // xuất ra file rỗng.
  function withSvg(action: (svg: SVGSVGElement) => void | Promise<void>) {
    const svg = diagramRef.current?.querySelector<SVGSVGElement>(
      "svg[data-sitemap-svg]",
    );
    if (!svg) {
      setError('Hãy chuyển sang tab "Sơ đồ" trước khi tải ảnh.');
      return;
    }
    setError(undefined);
    void action(svg);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> {site.reference}
      </p>

      {/* 3 chế độ xem */}
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        <ViewBtn active={view === "blocks"} onClick={() => setView("blocks")}>
          <Rows3 className="h-3.5 w-3.5" /> Danh sách trang
        </ViewBtn>
        <ViewBtn active={view === "diagram"} onClick={() => setView("diagram")}>
          <Network className="h-3.5 w-3.5" /> Sơ đồ
        </ViewBtn>
        <ViewBtn active={view === "text"} onClick={() => setView("text")}>
          <List className="h-3.5 w-3.5" /> Dạng văn bản
        </ViewBtn>
      </div>

      {view === "blocks" ? (
        <SitemapBlockEditor
          rows={sitemapRowsFromTree(structure)}
          disabled={!canEdit}
          onChange={(rows) => {
            setText(sitemapTextFromRows(rows));
            setSaved(false);
          }}
        />
      ) : view === "diagram" ? (
        <div ref={diagramRef}>
          <TreeSitemap root={structure} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Mỗi dòng một trang theo mẫu{" "}
            <span className="metric text-foreground">Tên trang | /duong-dan</span>.{" "}
            <span className="text-foreground">Thụt đầu dòng 2 dấu cách</span> ={" "}
            trang con của mục ngay phía trên. Sơ đồ cập nhật theo bản chữ.
          </p>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSaved(false);
            }}
            disabled={!canEdit}
            spellCheck={false}
            rows={16}
            className="w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs leading-relaxed"
          />
        </div>
      )}

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

      {/* Hành động */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(text)}
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="Ảnh PNG — dán vào slide, Word, Zalo, email"
          onClick={() =>
            withSvg((svg) =>
              downloadSitemapPng(svg, safeFilename(baseName, "png")).catch(
                (caught: unknown) =>
                  setError(
                    caught instanceof Error ? caught.message : "Không tạo được ảnh.",
                  ),
              ),
            )
          }
        >
          <FileImage className="h-3.5 w-3.5" /> Tải ảnh PNG
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="SVG vector — phóng to không vỡ, mở sửa được trong Figma"
          onClick={() =>
            withSvg((svg) => downloadSitemapSvg(svg, safeFilename(baseName, "svg")))
          }
        >
          <Shapes className="h-3.5 w-3.5" /> Tải SVG
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title="File chuẩn để nộp cho Google Search Console"
          onClick={() =>
            downloadText(
              sitemapToXml(structure, site.reference),
              "sitemap.xml",
              "application/xml;charset=utf-8",
            )
          }
        >
          <FileCode2 className="h-3.5 w-3.5" /> Tải sitemap.xml
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadText(text, safeFilename(baseName, "txt"))}
        >
          <FileText className="h-3.5 w-3.5" /> Tải .txt
        </Button>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={saving || !dirty}
            className="ml-auto"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved && !dirty ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saved && !dirty ? "Đã lưu" : "Lưu thay đổi"}
          </Button>
        )}
      </div>

      {/* Bản nháp đầy đủ (tham khảo) */}
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Xem bản nháp đầy đủ (tham khảo)
        </summary>
        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
          {site.draftSitemap}
        </pre>
      </details>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
