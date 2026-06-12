import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  uploadDocumentAction,
  downloadDocumentAction,
  deleteDocumentAction,
} from '@/app/app/secretaria/documentos/actions';
import { revalidatePath } from 'next/cache';

// Mock do service layer - as actions agora delegam para o service
vi.mock('@/lib/documents/service', () => ({
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

// Mock Auth
const { mockRequireAuth } = vi.hoisted(() => {
  const mockRequireAuth = vi.fn();
  return { mockRequireAuth };
});

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: async (roles: string[]) => {
    const user = await mockRequireAuth();
    if (!roles.includes(user.role)) {
      throw new Error('Acesso negado');
    }
    return user;
  },
  requireAuth: () => mockRequireAuth(),
}));

// Mock Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock redirect para testes de bloqueio de role
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

// Import dos mocks do service após vi.mock
import { uploadDocument, downloadDocument, deleteDocument } from '@/lib/documents/service';

describe('Documentos Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadDocumentAction', () => {
    it('deve realizar upload e salvar metadados com admin', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      vi.mocked(uploadDocument).mockResolvedValue({
        success: true,
        id: 42,
        message: 'Documento enviado com sucesso.',
      });

      const file = new File(['conteudo'], 'contrato.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('name', 'Contrato de Prestação de Serviço');
      formData.append('description', 'Prestação de serviço de TI');
      formData.append('category', 'contrato');
      formData.append('file', file);

      const result = await uploadDocumentAction(formData);

      expect(result).toEqual({
        success: true,
        id: 42,
        message: 'Documento enviado com sucesso.',
      });
      expect(uploadDocument).toHaveBeenCalledWith({
        name: 'Contrato de Prestação de Serviço',
        description: 'Prestação de serviço de TI',
        category: 'contrato',
        file: {
          bytes: expect.any(ArrayBuffer),
          size: expect.any(Number),
          type: 'application/pdf',
          originalName: 'contrato.pdf',
        },
        uploadedBy: 1,
      });
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve realizar upload e salvar metadados com secretaria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 2, role: 'secretaria' });
      vi.mocked(uploadDocument).mockResolvedValue({
        success: true,
        id: 43,
        message: 'Documento enviado com sucesso.',
      });

      const file = new File(['conteudo'], 'ata.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('name', 'Ata da Reunião');
      formData.append('category', 'ata');
      formData.append('file', file);

      const result = await uploadDocumentAction(formData);

      expect(result).toEqual({
        success: true,
        id: 43,
        message: 'Documento enviado com sucesso.',
      });
      expect(uploadDocument).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve bloquear upload para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      const formData = new FormData();
      formData.append('name', 'Estatuto ASOF');
      formData.append('category', 'estatuto');
      formData.append('file', new File([''], 'estatuto.pdf'));

      await expect(uploadDocumentAction(formData)).rejects.toThrow('Acesso negado');
      expect(uploadDocument).not.toHaveBeenCalled();
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
      expect(uploadDocument).not.toHaveBeenCalled();
    });

    it('deve rejeitar payload de arquivo que não seja File', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });

      const formData = new FormData();
      formData.append('name', 'Arquivo inválido');
      formData.append('category', 'outro');
      formData.append('file', 'conteúdo textual');

      await expect(uploadDocumentAction(formData)).rejects.toThrow('Nenhum arquivo enviado.');
      expect(uploadDocument).not.toHaveBeenCalled();
    });

    it('deve rejeitar upload sem arquivo como erro de validação', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });

      const formData = new FormData();
      formData.append('name', 'Arquivo ausente');
      formData.append('category', 'outro');

      await expect(uploadDocumentAction(formData)).rejects.toThrow('Nenhum arquivo enviado.');
      expect(uploadDocument).not.toHaveBeenCalled();
    });
  });

  describe('downloadDocumentAction', () => {
    it('deve gerar url assinada e auditar com logDataAccess', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'secretaria' });
      vi.mocked(downloadDocument).mockResolvedValue({
        success: true,
        signedUrl: 'http://storage.signed.url',
        message: 'URL assinada gerada com sucesso.',
      });

      const result = await downloadDocumentAction({ id: 10 });

      expect(result).toEqual({ signedUrl: 'http://storage.signed.url' });
      expect(downloadDocument).toHaveBeenCalledWith(10, 3);
    });

    it('deve dar erro caso documento nao exista', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      vi.mocked(downloadDocument).mockResolvedValue({
        success: false,
        message: 'Documento não encontrado.',
      });

      await expect(downloadDocumentAction({ id: 404 })).rejects.toThrow('Documento não encontrado');
    });

    it('deve bloquear download para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      await expect(downloadDocumentAction({ id: 10 })).rejects.toThrow();
    });
  });

  describe('deleteDocumentAction', () => {
    it('deve excluir registro do db e arquivo do storage com admin', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 1, role: 'admin' });
      vi.mocked(deleteDocument).mockResolvedValue({
        success: true,
        message: 'Documento excluído com sucesso.',
      });

      const result = await deleteDocumentAction({ id: 10 });

      expect(result).toEqual({
        success: true,
        message: 'Documento excluído com sucesso.',
      });
      expect(deleteDocument).toHaveBeenCalledWith(10, 1);
      expect(revalidatePath).toHaveBeenCalledWith('/app/secretaria/documentos');
    });

    it('deve bloquear exclusao para diretoria', async () => {
      mockRequireAuth.mockResolvedValue({ userId: 3, role: 'diretoria' });

      await expect(deleteDocumentAction({ id: 10 })).rejects.toThrow();
      expect(deleteDocument).not.toHaveBeenCalled();
    });
  });
});
