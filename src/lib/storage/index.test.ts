import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFile, downloadFile, getSignedUrl, listFiles, uploadFile } from './index';

const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const downloadMock = vi.fn();
const removeMock = vi.fn();
const listMock = vi.fn();
const fromMock = vi.fn(() => ({
  upload: uploadMock,
  createSignedUrl: createSignedUrlMock,
  download: downloadMock,
  remove: removeMock,
  list: listMock,
}));

vi.mock('@/lib/storage/client', () => ({
  getSupabaseAdminStorageClient: () => ({
    storage: {
      from: fromMock,
    },
  }),
}));

describe('storage helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockResolvedValue({
      data: { id: '1', path: 'oficios/file.pdf', fullPath: 'oficios/oficios/file.pdf' },
      error: null,
    });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    });
    downloadMock.mockResolvedValue({
      data: new Blob(['file']),
      error: null,
    });
    removeMock.mockResolvedValue({ error: null });
    listMock.mockResolvedValue({
      data: [
        {
          name: 'file.pdf',
          id: '1',
          updated_at: null,
          created_at: null,
          last_accessed_at: null,
          metadata: null,
        },
      ],
      error: null,
    });
  });

  it('uploads files to allowed buckets with safe paths', async () => {
    const result = await uploadFile('oficios', '2026/file.pdf', new Blob(['x']), 'application/pdf');

    expect(fromMock).toHaveBeenCalledWith('oficios');
    expect(uploadMock).toHaveBeenCalledWith('2026/file.pdf', expect.any(Blob), {
      contentType: 'application/pdf',
      upsert: false,
    });
    expect(result.fullPath).toContain('oficios/');
  });

  it('rejects unsafe storage bucket/path inputs', async () => {
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

  it('downloads, deletes, and lists files through the storage client', async () => {
    const blob = await downloadFile('documents', 'folder/file.txt');
    await deleteFile('documents', ['folder/file.txt']);
    const rows = await listFiles('documents', 'folder', { limit: 10, offset: 5 });

    expect(blob).toBeInstanceOf(Blob);
    expect(removeMock).toHaveBeenCalledWith(['folder/file.txt']);
    expect(listMock).toHaveBeenCalledWith('folder', { limit: 10, offset: 5 });
    expect(rows).toHaveLength(1);
  });

  it('throws stable errors when storage operations fail', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: null },
      error: { message: 'boom' },
    });
    downloadMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    removeMock.mockResolvedValue({ error: { message: 'boom' } });
    listMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(getSignedUrl('oficios', '2026/file.pdf')).rejects.toThrow(
      'Storage signed URL generation failed.',
    );
    await expect(downloadFile('oficios', '2026/file.pdf')).rejects.toThrow(
      'Storage download failed.',
    );
    await expect(deleteFile('oficios', ['2026/file.pdf'])).rejects.toThrow(
      'Storage delete failed.',
    );
    await expect(listFiles('oficios', '2026')).rejects.toThrow('Storage list failed.');
  });
});
