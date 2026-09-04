import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addNote, createConsultation, updateConsultationStatusFromForm } from './actions';

const headersMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const requireRoleMock = vi.fn();
const createConsultationServiceMock = vi.fn();
const updateConsultationStatusServiceMock = vi.fn();
const addNoteServiceMock = vi.fn();
const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => headersMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/juridico/service', () => ({
  createConsultationService: (...args: unknown[]) => createConsultationServiceMock(...args),
  updateConsultationStatusService: (...args: unknown[]) =>
    updateConsultationStatusServiceMock(...args),
  addNoteService: (...args: unknown[]) => addNoteServiceMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe('juridico actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    requireRoleMock.mockResolvedValue({ userId: 7 });
    createConsultationServiceMock.mockResolvedValue({ id: 15 });
    updateConsultationStatusServiceMock.mockResolvedValue(undefined);
    addNoteServiceMock.mockResolvedValue(undefined);
  });

  it('creates a consultation, revalidates, and redirects', async () => {
    const formData = new FormData();
    formData.set('title', 'Consulta nova');
    formData.set('questionSummary', 'Resumo');
    formData.set('questionFullText', 'Texto completo');
    formData.set('associateId', '11');
    formData.set('slaDays', '10');

    await expect(createConsultation(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/app/juridico/consultas/15',
    );

    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria']);
    expect(createConsultationServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Consulta nova',
        questionSummary: 'Resumo',
        questionFullText: 'Texto completo',
        associateId: 11,
        slaDays: 10,
        createdBy: 7,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico/consultas');
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:summary', {});
  });

  it('rejects when juridico rate limit is exceeded', async () => {
    consumeIpRateLimitMock.mockResolvedValue({ allowed: false });
    const formData = new FormData();
    formData.set('title', 'Consulta nova');
    formData.set('questionSummary', 'Resumo');

    await expect(createConsultation(formData)).rejects.toThrow(
      'Muitas requisições. Aguarde um momento.',
    );

    expect(requireRoleMock).not.toHaveBeenCalled();
    expect(createConsultationServiceMock).not.toHaveBeenCalled();
  });

  it('rejects invalid consultation payloads before calling the service', async () => {
    const formData = new FormData();
    formData.set('title', '');
    formData.set('questionSummary', '');

    await expect(createConsultation(formData)).rejects.toThrow('Título é obrigatório.');
    expect(createConsultationServiceMock).not.toHaveBeenCalled();
  });

  it('updates consultation status and revalidates related views', async () => {
    const formData = new FormData();
    formData.set('id', '21');
    formData.set('status', 'respondida');

    await updateConsultationStatusFromForm(formData);

    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria']);
    expect(updateConsultationStatusServiceMock).toHaveBeenCalledWith(21, 'respondida');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico/consultas');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico/consultas/21');
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:consultation-detail', {});
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:summary', {});
    expect(revalidateTagMock).not.toHaveBeenCalledWith('legal:notes', expect.anything());
  });

  it('parses escritorio response and revalidates after adding a note', async () => {
    const formData = new FormData();
    formData.set('entityType', 'consultation');
    formData.set('entityId', '33');
    formData.set('content', 'Nova nota');
    formData.set('isEscritorioResponse', 'true');

    await addNote(formData);

    expect(requireRoleMock).toHaveBeenCalledWith(['admin', 'diretoria']);
    expect(addNoteServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'consultation',
        entityId: 33,
        content: 'Nova nota',
        isEscritorioResponse: true,
        createdBy: 7,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico/consultas');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/juridico/consultas/33');
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:notes', {});
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:consultation-detail', {});
    expect(revalidateTagMock).toHaveBeenCalledWith('legal:summary', {});
  });

  it('rejects every mutation when the juridico role boundary denies access', async () => {
    requireRoleMock.mockRejectedValue(new Error('Acesso negado.'));

    const createFormData = new FormData();
    createFormData.set('title', 'Consulta nova');
    createFormData.set('questionSummary', 'Resumo');

    const updateFormData = new FormData();
    updateFormData.set('id', '21');
    updateFormData.set('status', 'respondida');

    const noteFormData = new FormData();
    noteFormData.set('entityType', 'consultation');
    noteFormData.set('entityId', '33');
    noteFormData.set('content', 'Nova nota');

    await expect(createConsultation(createFormData)).rejects.toThrow('Acesso negado.');
    await expect(updateConsultationStatusFromForm(updateFormData)).rejects.toThrow(
      'Acesso negado.',
    );
    await expect(addNote(noteFormData)).rejects.toThrow('Acesso negado.');

    expect(requireRoleMock).toHaveBeenCalledTimes(3);
    expect(requireRoleMock).toHaveBeenNthCalledWith(1, ['admin', 'diretoria']);
    expect(requireRoleMock).toHaveBeenNthCalledWith(2, ['admin', 'diretoria']);
    expect(requireRoleMock).toHaveBeenNthCalledWith(3, ['admin', 'diretoria']);
    expect(createConsultationServiceMock).not.toHaveBeenCalled();
    expect(updateConsultationStatusServiceMock).not.toHaveBeenCalled();
    expect(addNoteServiceMock).not.toHaveBeenCalled();
  });
});
