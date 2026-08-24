import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "@/domain/storage/storage-provider";
import { ValidationError } from "@/domain/shared/app-error";

const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}$/;

export class LocalStorageProvider implements StorageProvider {
  readonly id = "local";
  private readonly rootDirectory: string;
  private readonly publicBaseUrl: string;

  constructor(
    rootDirectory = path.join(process.cwd(), ".data", "storage"),
    publicBaseUrl = "/api/v1/storage",
  ) {
    this.rootDirectory = path.resolve(rootDirectory);
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, "");
  }

  async upload(
    bucket: string,
    storagePath: string,
    content: Buffer | string,
    contentType: string,
  ): Promise<string> {
    if (!contentType.trim()) {
      throw new ValidationError(
        "INVALID_CONTENT_TYPE",
        "A storage content type is required.",
      );
    }
    const destination = this.resolvePath(bucket, storagePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content);
    return this.normalizeStoragePath(storagePath);
  }

  async getUrl(bucket: string, storagePath: string): Promise<string> {
    this.resolvePath(bucket, storagePath);
    const encodedPath = this.normalizeStoragePath(storagePath)
      .split("/")
      .map(encodeURIComponent)
      .join("/");
    return `${this.publicBaseUrl}/${encodeURIComponent(bucket)}/${encodedPath}`;
  }

  async delete(bucket: string, storagePath: string): Promise<void> {
    const destination = this.resolvePath(bucket, storagePath);
    await unlink(destination);
  }

  private resolvePath(bucket: string, storagePath: string): string {
    if (!BUCKET_PATTERN.test(bucket)) {
      throw new ValidationError(
        "INVALID_STORAGE_BUCKET",
        "Storage bucket names may only contain lowercase letters, digits, hyphens, and underscores.",
      );
    }

    const normalized = this.normalizeStoragePath(storagePath);
    const bucketRoot = path.resolve(this.rootDirectory, bucket);
    const destination = path.resolve(bucketRoot, normalized);
    const relative = path.relative(bucketRoot, destination);

    if (
      relative === "" ||
      relative.startsWith(`..${path.sep}`) ||
      relative === ".." ||
      path.isAbsolute(relative)
    ) {
      throw new ValidationError(
        "INVALID_STORAGE_PATH",
        "Storage paths must resolve to a file inside the selected bucket.",
      );
    }

    return destination;
  }

  private normalizeStoragePath(storagePath: string): string {
    const normalized = storagePath.replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized || normalized.endsWith("/") || normalized.includes("\0")) {
      throw new ValidationError(
        "INVALID_STORAGE_PATH",
        "A non-empty storage file path is required.",
      );
    }
    return normalized;
  }
}
