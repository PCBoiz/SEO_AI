"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pin, Play, Search } from "lucide-react";
import { OutputBlockView } from "@/components/viz/output-block-view";

export interface OutputRecord {
  id: string;
  moduleKey: string;
  moduleNumber: number;
  moduleTitle: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  pinned: boolean;
  outputBlocks: Array<{ key: string; label: string }>;
  output: Record<string, unknown>;
}

export function OutputsBrowser({
  records,
  projects,
  modules,
}: {
  records: OutputRecord[];
  projects: Array<{ id: string; name: string }>;
  modules: Array<{ key: string; label: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [moduleKey, setModuleKey] = useState("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      if (projectId && record.projectId !== projectId) return false;
      if (moduleKey && record.moduleKey !== moduleKey) return false;
      if (!needle) return true;
      // Tìm trong tên module, tên dự án và toàn bộ nội dung kết quả.
      const haystack = [
        record.moduleTitle,
        record.projectName,
        ...record.outputBlocks.map((block) =>
          typeof record.output[block.key] === "string"
            ? (record.output[block.key] as string)
            : "",
        ),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [records, projectId, moduleKey, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="eyebrow">Tìm trong kết quả</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: lập trình cho trẻ em"
              className="h-8 w-full rounded-md border border-border bg-input pl-8 pr-3 text-sm"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Dự án</span>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-8 rounded-md border border-border bg-input px-3 text-sm"
          >
            <option value="">Tất cả dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Module</span>
          <select
            value={moduleKey}
            onChange={(event) => setModuleKey(event.target.value)}
            className="h-8 rounded-md border border-border bg-input px-3 text-sm"
          >
            <option value="">Tất cả module</option>
            {modules.map((module) => (
              <option key={module.key} value={module.key}>
                {module.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="metric text-xs text-muted-foreground">
        {filtered.length}/{records.length} kết quả
      </p>

      {filtered.length === 0 ? (
        <p className="glass p-8 text-center text-sm text-muted-foreground">
          Không có kết quả nào khớp bộ lọc.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((record) => (
            <OutputCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function OutputCard({ record }: { record: OutputRecord }) {
  const blocks = record.outputBlocks.filter(
    (block) =>
      typeof record.output[block.key] === "string" &&
      (record.output[block.key] as string).length > 0,
  );
  const preview =
    blocks.length > 0
      ? (record.output[blocks[0].key] as string).trim().split("\n")[0].slice(0, 110)
      : "(kết quả trống)";

  return (
    <details className="group glass overflow-hidden">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-foreground">
              {record.moduleNumber || "?"}
            </span>
            <span className="text-sm font-medium text-foreground">
              {record.moduleTitle}
            </span>
            {record.pinned && (
              <span className="flex items-center gap-1 rounded-full bg-spectrum-3/15 px-2 py-0.5 text-[10px] text-spectrum-3">
                <Pin className="h-2.5 w-2.5" /> Đã ghim
              </span>
            )}
          </span>
          <span className="truncate text-xs text-muted-foreground">{preview}</span>
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
          <span className="text-xs text-muted-foreground">{record.projectName}</span>
          <span className="metric text-[10px] text-muted-foreground/70">
            {new Date(record.createdAt).toLocaleString("vi-VN")}
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        {blocks.map((block) => (
          <OutputBlockView
            key={block.key}
            blockKey={block.key}
            label={block.label}
            value={record.output[block.key] as string}
          />
        ))}
        <Link
          href={`/automations/run/${record.moduleKey}`}
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Play className="h-3 w-3" /> Mở module để chạy lại hoặc chỉnh sửa
        </Link>
      </div>
    </details>
  );
}
