import { describe, expect, it, vi } from "vitest";
import { VercelBlobStorageProvider } from "@/infrastructure/storage/vercel-blob-storage-provider";

describe("VercelBlobStorageProvider", () => {
  it("namespaces safe paths by logical bucket", async () => {
    const client = {
      put: vi.fn(async (pathname: string) => ({ pathname })),
      head: vi.fn(async (pathname: string) => ({ url: `https://blob.test/${pathname}` })),
      del: vi.fn(async () => undefined),
    };
    const provider = new VercelBlobStorageProvider("private", client);

    await expect(
      provider.upload("assets", "project/logo.png", "image", "image/png"),
    ).resolves.toBe("assets/project/logo.png");
    await expect(provider.getUrl("assets", "project/logo.png")).resolves.toBe(
      "https://blob.test/assets/project/logo.png",
    );
    await provider.delete("assets", "project/logo.png");

    expect(client.put).toHaveBeenCalledWith(
      "assets/project/logo.png",
      "image",
      expect.objectContaining({ access: "private", allowOverwrite: false }),
    );
    expect(client.del).toHaveBeenCalledWith("assets/project/logo.png");
  });

  it.each(["../secret.txt", "folder/../secret.txt", "folder//file.txt", "folder/"])(
    "rejects an unsafe path: %s",
    async (storagePath) => {
      const provider = new VercelBlobStorageProvider("private", {
        put: vi.fn(),
        head: vi.fn(),
        del: vi.fn(),
      });
      await expect(
        provider.upload("assets", storagePath, "x", "text/plain"),
      ).rejects.toMatchObject({ code: "INVALID_STORAGE_PATH" });
    },
  );
});
