
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  uploadDocumentAction,
  downloadDocumentAction,
  deleteDocumentAction,
} from '@/app/app/secretaria/documentos/actions';
import { uploadFile, getSignedUrl, deleteFile } from '@/lib/storage';
import { logAuditAction, logDataAccess } from '@/lib/audit/service';
import { revalidatePath } from 'next/cache';

// Mock Auth e DB elevados (hoisted) no Vitest
const { mockRequireAuth, mockDb } = vi.hoisted(() => {
  const mockRequireAuth = vi.fn();
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
  };
  return { mockRequireAuth, mockDb };
});

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

// Mock Repository (used by service)
const mockRepository = vi.hoisted(() => ({
  getDocumentById: vi.fn(),
  insertDocument: vi.fn(),
  updateDocumentStoragePath: vi.fn(),
  deleteDocumentById: vi.fn(),
}));

vi.mock('@/lib/documents/repository', () => mockRepository);

// Mock Storage
vi.mock('@/lib/storage', () => ({
  uploadFile: vi.fn(),
  getSignedUrl: vi.fn(),
  deleteFile: vi.fn(),
}));

// Mock Audit
vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
  logDataAccess: vi.fn(),
}));

// Mock Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Documentos Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.transaction.mockImplementation((callback) => callback(mockDb));
  });

  describe('uploadDocumentAction', () => {
    it('deve realizar upload e salvar metadados com admin', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      mockRepository.insertDocument.mockResolvedValue({ id: 42 });
      vi.mocked(uploadFile).mockResolvedValue({ id: '1', path: 'path', fullPath: 'fullPath' });

      const file = new File(['conteudo'], 'contrato.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('name', 'Contrato de Prestação de Serviço');
      formData.append('description', 'Prestação de serviço de TI');
      formData.append('category', 'contrato');
      formData.append('file', file);

      const result = await uploadDocumentAction(formData);

      expect(result).toEqual({ success: true, id: 42 });
      expect(uploadFile).toHaveBeenCalledWith(
        'documents',
        expect.any(String),
        expect.any(ArrayBuffer),
        'application/pdf',
      );
      expect(mockRepository.insertDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Contrato de Prestação de Serviço',
          category: 'contrato',
        }),
      );
      expect(logAuditAction).toHaveBeenCalledWith({
        adminId: 1,
        action: 'upload',
        entityType: 'document',
        entityId: 42,
        metadata: expect.objectContaining({
          name: 'Contrato de Prestação de Serviço',
          category: 'contrato',
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve realizar upload e salvar metadados com secretaria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 2, role: 'secretaria' });
      mockRepository.insertDocument.mockResolvedValue({ id: 43 });

      const file = new File(['conteudo'], 'ata.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('name', 'Ata da Reunião');
      formData.append('category', 'ata');
      formData.append('file', file);

      const result = await uploadDocumentAction(formData);

      expect(result).toEqual({ success: true, id: 43 });
      expect(uploadFile).toHaveBeenCalled();
      expect(mockRepository.insertDocument).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve bloquear upload para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      const formData = new FormData();
      formData.append('name', 'Estatuto ASOF');
      formData.append('category', 'estatuto');
      formData.append('file', new File([''], 'estatuto.pdf'));

      await expect(uploadDocumentAction(formData)).rejects.toThrow('Acesso negado');
      expect(uploadFile).not.toHaveBeenCalled();
      expect(mockRepository.insertDocument).not.toHaveBeenCalled();
    });

    it('deve validar limites de tamanho de arquivo', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });

      const file = new File([], 'grande.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 });

      const formData = new FormData();
      formData.append('name', 'Arquivo Grande');
      formData.append('category', 'outro');
      formData.append('file', file);

      await expect(uploadDocumentAction(formData)).rejects.toThrow(
        'O arquivo não pode exceder 15MB',
      );
      expect(uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('downloadDocumentAction', () => {
    it('deve gerar url assinada e auditar com logDataAccess', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'secretaria' });
      mockRepository.getDocumentById.mockResolvedValue({
        id: 10,
        name: 'Ata 2026',
        description: 'Ata desc',
        category: 'ata',
        storagePath: 'ata/xyz.pdf',
        fileSize: 1000,
        fileType: 'application/pdf',
        uploadedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(getSignedUrl).mockResolvedValue('http://storage.signed.url');

      const result = await downloadDocumentAction(10);

      expect(result).toEqual({ signedUrl: 'http://storage.signed.url' });
      expect(getSignedUrl).toHaveBeenCalledWith('documents', 'ata/xyz.pdf', 3600);
      expect(logDataAccess).toHaveBeenCalledWith({
        adminId: 3,
        action: 'view',
        entityType: 'document',
        entityId: 10,
        metadata: {
          name: 'Ata 2026',
          category: 'ata',
          storagePath: 'ata/xyz.pdf',
        },
      });
    });

    it('deve dar erro caso documento nao exista', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      mockRepository.getDocumentById.mockResolvedValue(null);

      await expect(downloadDocumentAction(404)).rejects.toThrow('Documento não encontrado');
    });

    it('deve bloquear download para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      await expect(downloadDocumentAction(10)).rejects.toThrow('Acesso negado');
    });
  });

  describe('deleteDocumentAction', () => {
    it('deve excluir registro do db e arquivo do storage com admin', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      mockRepository.getDocumentById.mockResolvedValue({
        id: 10,
        name: 'Ata 2026',
        description: 'Ata desc',
        category: 'ata',
        storagePath: 'ata/xyz.pdf',
        fileSize: 1000,
        fileType: 'application/pdf',
        uploadedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await deleteDocumentAction(10);

      expect(result).toEqual({ success: true });
      expect(mockRepository.deleteDocumentById).toHaveBeenCalledWith(10);
      expect(deleteFile).toHaveBeenCalledWith('documents', ['ata/xyz.pdf']);
      expect(logAuditAction).toHaveBeenCalledWith({
        adminId: 1,
        action: 'delete',
        entityType: 'document',
        entityId: 10,
        metadata: {
          name: 'Ata 2026',
          category: 'ata',
          storagePath: 'ata/xyz.pdf',
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve bloquear exclusao para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      await expect(deleteDocumentAction(10)).rejects.toThrow('Acesso negado');
      expect(mockRepository.deleteDocumentById).not.toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });
});
