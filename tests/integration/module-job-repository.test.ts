import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteModuleJobRepository } from "@/infrastructure/modules/sqlite-module-job-repository";

const temporaryDirectories: string[] = [];
const openAdapters: SqliteDatabaseAdapter[] = [];

afterEach(async () => {
  // Windows giữ lock file DB tới khi đóng kết nối — đóng trước rồi mới xoá.
  for (const adapter of openAdapters.splice(0)) adapter.close();
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-module-job-"));
  temporaryDirectories.push(root);
  const adapter = new SqliteDatabaseAdapter(path.join(root, "test.db"));
  openAdapters.push(adapter);
  migrate(adapter.db, { migrationsFolder: path.resolve("drizzle") });
  return new SqliteModuleJobRepository(adapter.db);
}

async function seedSucceededJob(
  repository: SqliteModuleJobRepository,
  id: string,
  minutesAgo: number,
) {
  const at = new Date(Date.now() - minutesAgo * 60_000);
  await repository.create({
    id,
    workspaceId: "ws-1",
    userId: "user-1",
    projectId: "project-1",
    moduleKey: "RIS_SITEMAP_KEYWORDS",
    idempotencyKey: crypto.randomUUID(),
    input: { primaryKeyword: `topic-${id}` },
    now: at,
  });
  await repository.setStatus("ws-1", id, "succeeded", at, {
    output: { contractVersion: "1.0", keywordPlan: `plan-${id}`, geoPlan: "geo" },
  });
}

describe("lưu trữ + ghim lịch sử module theo dự án (SQLite)", () => {
  it("mặc định dùng bản thành công mới nhất; ghim thì bản ghim thắng; bỏ ghim quay lại mặc định", async () => {
    const repository = await setup();
    await seedSucceededJob(repository, "job-1", 30);
    await seedSucceededJob(repository, "job-2", 20);
    await seedSucceededJob(repository, "job-3", 10);

    // Lịch sử: mới → cũ, đủ 3 bản.
    const history = await repository.listRecentForModule(
      "ws-1",
      "project-1",
      "RIS_SITEMAP_KEYWORDS",
      10,
    );
    expect(history.map((job) => job.id)).toEqual(["job-3", "job-2", "job-1"]);

    // Mặc định: bản mới nhất là bản chính thức cho nối luồng.
    let official = await repository.listLatestSucceededByProject(
      "ws-1",
      "project-1",
    );
    expect(official).toHaveLength(1);
    expect(official[0].id).toBe("job-3");

    // Ghim job-2 (khách thấy đầu ra lần 2 tốt nhất) → nối luồng + preset dùng nó.
    await repository.setPinned(
      "ws-1",
      "project-1",
      "RIS_SITEMAP_KEYWORDS",
      "job-2",
      new Date(),
    );
    official = await repository.listLatestSucceededByProject("ws-1", "project-1");
    expect(official[0].id).toBe("job-2");
    const preset = await repository.getLatestForModule(
      "ws-1",
      "project-1",
      "RIS_SITEMAP_KEYWORDS",
    );
    expect(preset?.id).toBe("job-2");
    expect(preset?.pinnedAt).not.toBeNull();

    // Bỏ ghim → quay lại bản mới nhất.
    await repository.setPinned(
      "ws-1",
      "project-1",
      "RIS_SITEMAP_KEYWORDS",
      null,
      new Date(),
    );
    official = await repository.listLatestSucceededByProject("ws-1", "project-1");
    expect(official[0].id).toBe("job-3");
  });

  it("listRecentByWorkspace: gộp mọi dự án/module, mới→cũ, giới hạn, đúng workspace", async () => {
    const repository = await setup();
    await seedSucceededJob(repository, "job-1", 30);
    await seedSucceededJob(repository, "job-2", 20);
    await seedSucceededJob(repository, "job-3", 10);
    // Job ở dự án khác, module khác, cùng workspace — vẫn phải gộp vào.
    await repository.create({
      id: "job-4",
      workspaceId: "ws-1",
      userId: "user-1",
      projectId: "project-2",
      moduleKey: "RIS_ICN_KEYWORDS",
      idempotencyKey: crypto.randomUUID(),
      input: {},
      now: new Date(Date.now() - 5 * 60_000),
    });
    // Job ở workspace khác — KHÔNG được lẫn vào.
    await repository.create({
      id: "job-other",
      workspaceId: "ws-2",
      userId: "user-2",
      projectId: "project-9",
      moduleKey: "RIS_SITEMAP_KEYWORDS",
      idempotencyKey: crypto.randomUUID(),
      input: {},
      now: new Date(),
    });

    // Giới hạn 3, mới → cũ.
    const recent = await repository.listRecentByWorkspace("ws-1", 3);
    expect(recent.map((job) => job.id)).toEqual(["job-4", "job-3", "job-2"]);

    // Chỉ job của ws-1 (4 job), không lẫn ws-2.
    const all = await repository.listRecentByWorkspace("ws-1", 50);
    expect(all).toHaveLength(4);
    expect(all.some((job) => job.id === "job-other")).toBe(false);
  });
});
