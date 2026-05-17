import { getSupabaseAdminStorageClient } from '@/lib/storage/client';

export const STORAGE_BUCKETS = ['oficios', 'documents', 'uploads'] as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[number];
export type StorageUploadBody = File | Blob | Buffer | ArrayBuffer;

export interface StorageUploadResult {
  id: string;
  path: string;
  fullPath: string;
}

export interface StorageFileObject {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, unknown> | null;
  bucket_id?: string;
  owner?: string;
}

export interface StorageListOptions {
  limit?: number;
  offset?: number;
}

const ALLOWED_BUCKETS = new Set<string>(STORAGE_BUCKETS);

function assertSafeBucket(bucket: string): asserts bucket is StorageBucket {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error('Storage bucket is not allowed.');
  }
}

function assertSafePath(path: string): void {
  if (!path || path.startsWith('/') || path.includes('..') || /[\r\n]/.test(path)) {
    throw new Error('Storage path is invalid.');
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

export async function uploadFile(
  bucket: string,
  path: string,
  body: StorageUploadBody,
  contentType?: string,
): Promise<StorageUploadResult> {
  assertSafeBucket(bucket);
  assertSafePath(path);

  const { data, error } = await getSupabaseAdminStorageClient()
    .storage.from(bucket)
    .upload(path, body, { contentType, upsert: false });

  if (error) throw new Error('Storage upload failed.');
  return data;
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string> {
  assertSafeBucket(bucket);
  assertSafePath(path);
  assertPositiveInteger(expiresIn, 'expiresIn');

  const { data, error } = await getSupabaseAdminStorageClient()
    .storage.from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data.signedUrl) throw new Error('Storage signed URL generation failed.');
  return data.signedUrl;
}

export async function downloadFile(bucket: string, path: string): Promise<Blob> {
  assertSafeBucket(bucket);
  assertSafePath(path);

  const { data, error } = await getSupabaseAdminStorageClient().storage.from(bucket).download(path);

  if (error) throw new Error('Storage download failed.');
  return data;
}

export async function deleteFile(bucket: string, paths: readonly string[]): Promise<void> {
  assertSafeBucket(bucket);
  paths.forEach(assertSafePath);

  if (paths.length === 0) return;

  const { error } = await getSupabaseAdminStorageClient()
    .storage.from(bucket)
    .remove([...paths]);

  if (error) throw new Error('Storage delete failed.');
}

export async function listFiles(
  bucket: string,
  folder: string,
  options?: StorageListOptions,
): Promise<StorageFileObject[]> {
  assertSafeBucket(bucket);
  if (folder) assertSafePath(folder);
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  assertPositiveInteger(limit, 'limit');
  assertNonNegativeInteger(offset, 'offset');

  const { data, error } = await getSupabaseAdminStorageClient()
    .storage.from(bucket)
    .list(folder, { limit, offset });

  if (error) throw new Error('Storage list failed.');
  return data;
}
