import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/shared/app-error";
import { LocalStorageProvider } from "@/infrastructure/storage/local-storage-provider";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("LocalStorageProvider", () => {
  it("stores a file by key and resolves a provider URL", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-storage-"));
    temporaryDirectories.push(root);
    const provider = new LocalStorageProvider(root);

    const key = await provider.upload(
      "outputs",
      "project-1/article.md",
      "# Article",
      "text/markdown",
    );

    await expect(
      readFile(path.join(root, "outputs", "project-1", "article.md"), "utf8"),
    ).resolves.toBe("# Article");
    await expect(provider.getUrl("outputs", key)).resolves.toBe(
      "/api/v1/storage/outputs/project-1/article.md",
    );
  });

  it("rejects path traversal", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "antigravity-storage-"));
    temporaryDirectories.push(root);
    const provider = new LocalStorageProvider(root);

    await expect(
      provider.upload("outputs", "../secret.txt", "secret", "text/plain"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
