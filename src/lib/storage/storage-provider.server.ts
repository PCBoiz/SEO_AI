import "server-only";

import type { StorageProvider } from "@/domain/storage/storage-provider";
import { parseServerEnvironment } from "@/infrastructure/config/environment";
import { LocalStorageProvider } from "@/infrastructure/storage/local-storage-provider";
import { VercelBlobStorageProvider } from "@/infrastructure/storage/vercel-blob-storage-provider";

let provider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  const environment = parseServerEnvironment();
  provider =
    environment.STORAGE_PROVIDER === "vercel_blob"
      ? new VercelBlobStorageProvider(environment.VERCEL_BLOB_ACCESS)
      : new LocalStorageProvider(environment.STORAGE_LOCAL_ROOT);
  return provider;
}
