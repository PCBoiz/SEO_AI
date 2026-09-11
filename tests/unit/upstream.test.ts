import { describe, expect, it } from "vitest";
import type { ModuleJob } from "@/domain/modules/module-job";
import { chonJobUpstream } from "@/domain/modules/upstream";

function job(p: Partial<ModuleJob> & Pick<ModuleJob, "id" | "moduleKey">): ModuleJob {
  const now = new Date("2026-09-12T00:00:00Z");
  return {
    workspaceId: "ws",
    userId: "u",
    projectId: "p1",
    idempotencyKey: p.id,
    status: "succeeded",
    input: {},
    output: { text: p.id },
    errorCode: null,
    errorMessage: null,
    attemptCount: 0,
    version: 1,
    pinnedAt: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    ...p,
  } as ModuleJob;
}

const HIEN_TAI = { moduleKey: "RIS_CONTENT_INTRO", projectId: "p1" };

describe("chonJobUpstream — lượt chạy thắng bản ghim", () => {
  it("không có lượt: giữ nguyên hành vi cũ (bản chính thức, bỏ chính module đang chạy)", () => {
    const ra = chonJobUpstream(HIEN_TAI, [
      job({ id: "ghim-tieu-de", moduleKey: "RIS_CONTENT_HEADLINE", pinnedAt: new Date() }),
      job({ id: "intro-cu", moduleKey: "RIS_CONTENT_INTRO" }),
    ], []);
    expect(ra.map((j) => j.id)).toEqual(["ghim-tieu-de"]);
  });

  it("tiêu đề CỦA LƯỢT NÀY đè tiêu đề đã ghim của chủ đề khác", () => {
    const ra = chonJobUpstream(
      HIEN_TAI,
      [job({ id: "ghim-chu-de-A", moduleKey: "RIS_CONTENT_HEADLINE", pinnedAt: new Date() })],
      [job({ id: "luot-chu-de-B", moduleKey: "RIS_CONTENT_HEADLINE" })],
    );
    expect(ra.map((j) => j.id)).toEqual(["luot-chu-de-B"]);
  });

  it("module ngoài lượt (quét website) vẫn lấy bản chính thức", () => {
    const ra = chonJobUpstream(
      HIEN_TAI,
      [
        job({ id: "quet-web", moduleKey: "RIS_SITE_SCAN" }),
        job({ id: "tieu-de-cu", moduleKey: "RIS_CONTENT_HEADLINE" }),
      ],
      [job({ id: "tieu-de-moi", moduleKey: "RIS_CONTENT_HEADLINE" })],
    );
    expect(ra.map((j) => j.id).sort()).toEqual(["quet-web", "tieu-de-moi"]);
  });

  it("job của dự án KHÁC trong upstreamJobIds bị bỏ — không lộ nội dung chéo dự án", () => {
    const ra = chonJobUpstream(
      HIEN_TAI,
      [job({ id: "tieu-de-p1", moduleKey: "RIS_CONTENT_HEADLINE" })],
      [job({ id: "tieu-de-p2", moduleKey: "RIS_CONTENT_HEADLINE", projectId: "p2" })],
    );
    expect(ra.map((j) => j.id)).toEqual(["tieu-de-p1"]);
  });

  it("job hỏng hoặc chưa xong trong lượt không đè bản tốt", () => {
    const ra = chonJobUpstream(
      HIEN_TAI,
      [job({ id: "tot", moduleKey: "RIS_CONTENT_HEADLINE" })],
      [
        job({ id: "hong", moduleKey: "RIS_CONTENT_HEADLINE", status: "failed", output: null }),
        job({ id: "dang-chay", moduleKey: "RIS_ONPAGE_SEO", status: "running", output: null }),
      ],
    );
    expect(ra.map((j) => j.id)).toEqual(["tot"]);
  });
});
