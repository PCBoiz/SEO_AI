export interface StorageProvider {
  upload(
    bucket: string,
    path: string,
    content: Buffer | string,
    contentType: string,
  ): Promise<string>;

  getUrl(bucket: string, path: string): Promise<string>;

  delete(bucket: string, path: string): Promise<void>;
}
