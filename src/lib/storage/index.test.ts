import { describe, expect, it } from 'vitest';
import { deleteFile, downloadFile, getSignedUrl, listFiles, uploadFile } from './index';

describe('storage helpers', () => {
  it('rejects unsafe storage bucket/path inputs before checking provider configuration', async () => {
    await expect(uploadFile('secrets', '2026/file.pdf', new Blob(['x']))).rejects.toThrow(
      'Storage bucket is not allowed.',
    );
    await expect(uploadFile('oficios', '../file.pdf', new Blob(['x']))).rejects.toThrow(
      'Storage path is invalid.',
    );
  });

  it('rejects invalid signed URL expiration and list pagination values', async () => {
    await expect(getSignedUrl('oficios', '2026/file.pdf', 0)).rejects.toThrow(
      'expiresIn must be a positive integer.',
    );
    await expect(listFiles('oficios', '2026', { limit: 0 })).rejects.toThrow(
      'limit must be a positive integer.',
    );
    await expect(listFiles('oficios', '2026', { offset: -1 })).rejects.toThrow(
      'offset must be a non-negative integer.',
    );
  });

  it('fails with a stable disabled-storage error until an object storage provider is chosen', async () => {
    const expected = 'Document storage is not configured for the managed PostgreSQL baseline.';

    await expect(uploadFile('oficios', '2026/file.pdf', new Blob(['x']))).rejects.toThrow(expected);
    await expect(getSignedUrl('oficios', '2026/file.pdf')).rejects.toThrow(expected);
    await expect(downloadFile('oficios', '2026/file.pdf')).rejects.toThrow(expected);
    await expect(deleteFile('oficios', ['2026/file.pdf'])).rejects.toThrow(expected);
    await expect(listFiles('oficios', '2026')).rejects.toThrow(expected);
  });
});
