import { del, head, put, type BlobAccessType } from "@vercel/blob";
import type { StorageProvider } from "@/domain/storage/storage-provider";
import { ValidationError } from "@/domain/shared/app-error";

const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}$/;

interface BlobClient {
  put(
    pathname: string,
    content: Buffer | string,
    options: {
      access: BlobAccessType;
      addRandomSuffix: boolean;
      allowOverwrite: boolean;
      contentType: string;
    },
  ): Promise<{ pathname: string }>;
  head(pathname: string): Promise<{ url: string }>;
  del(pathname: string): Promise<void>;
}

const defaultBlobClient: BlobClient = {
  put: (pathname, content, options) => put(pathname, content, options),
  head: (pathname) => head(pathname),
  del: (pathname) => del(pathname),
};

export class VercelBlobStorageProvider implements StorageProvider {
  readonly id = "vercel_blob";

  constructor(
    private readonly access: BlobAccessType = "private",
    private readonly client: BlobClient = defaultBlobClient,
  ) {}

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
    const pathname = this.resolvePath(bucket, storagePath);
    const result = await this.client.put(pathname, content, {
      access: this.access,
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType,
    });
    return result.pathname;
  }

  async getUrl(bucket: string, storagePath: string): Promise<string> {
    const metadata = await this.client.head(this.resolvePath(bucket, storagePath));
    return metadata.url;
  }

  async delete(bucket: string, storagePath: string): Promise<void> {
    await this.client.del(this.resolvePath(bucket, storagePath));
  }

  private resolvePath(bucket: string, storagePath: string): string {
    if (!BUCKET_PATTERN.test(bucket)) {
      throw new ValidationError(
        "INVALID_STORAGE_BUCKET",
        "Storage bucket names may only contain lowercase letters, digits, hyphens, and underscores.",
      );
    }
    const normalized = storagePath.replaceAll("\\", "/").replace(/^\/+/, "");
    const segments = normalized.split("/");
    if (
      !normalized ||
      normalized.endsWith("/") ||
      normalized.includes("\0") ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new ValidationError(
        "INVALID_STORAGE_PATH",
        "A safe, non-empty storage file path is required.",
      );
    }
    return `${bucket}/${normalized}`;
  }
}
