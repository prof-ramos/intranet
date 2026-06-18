import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  updateTriageStatusFromForm,
  addTriageObservacaoFromForm,
  updateTriageDeadlineFromForm,
} from './actions';

const headersMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const requireRoleMock = vi.fn();
const updateTriageStatusMock = vi.fn();
const addTriageObservacaoMock = vi.fn();
const updateTriageDeadlineMock = vi.fn();
const revalidatePathMock = vi.fn();

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

vi.mock('@/lib/email-triage/repository', () => ({
  updateTriageStatus: (...args: unknown[]) => updateTriageStatusMock(...args),
  addTriageObservacao: (...args: unknown[]) => addTriageObservacaoMock(...args),
  updateTriageDeadline: (...args: unknown[]) => updateTriageDeadlineMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: vi.fn(),
}));

function fd(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return form;
}

describe('email-triage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
    requireRoleMock.mockResolvedValue({ userId: 3, role: 'admin' });
    updateTriageStatusMock.mockResolvedValue(undefined);
    addTriageObservacaoMock.mockResolvedValue(undefined);
    updateTriageDeadlineMock.mockResolvedValue(undefined);
  });

  it('rejects non-admin roles', async () => {
    requireRoleMock.mockRejectedValue(new Error('Permissão insuficiente.'));
    await expect(
      updateTriageStatusFromForm(fd({ id: '1', status: 'validado' })),
    ).rejects.toThrow('Permissão insuficiente.');
    expect(updateTriageStatusMock).not.toHaveBeenCalled();
  });

  // ─── updateTriageStatusFromForm ─────────────────────────────────────────────

  describe('updateTriageStatusFromForm', () => {
    it('calls updateTriageStatus with correct args and revalidates', async () => {
      await updateTriageStatusFromForm(fd({ id: '7', status: 'validado', observacoes: 'ok' }));

      expect(updateTriageStatusMock).toHaveBeenCalledWith(7, 'validado', 3, 'ok');
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });

    it('calls updateTriageStatus without observacoes when not provided', async () => {
      await updateTriageStatusFromForm(fd({ id: '7', status: 'arquivado' }));

      expect(updateTriageStatusMock).toHaveBeenCalledWith(7, 'arquivado', 3, undefined);
    });

    it('throws on invalid status value', async () => {
      await expect(
        updateTriageStatusFromForm(fd({ id: '7', status: 'nao_existe' })),
      ).rejects.toThrow();
      expect(updateTriageStatusMock).not.toHaveBeenCalled();
    });
  });

  // ─── addTriageObservacaoFromForm ─────────────────────────────────────────────

  describe('addTriageObservacaoFromForm', () => {
    it('calls addTriageObservacao with correct args and revalidates', async () => {
      await addTriageObservacaoFromForm(fd({ id: '5', observacoes: 'Nota importante' }));

      expect(addTriageObservacaoMock).toHaveBeenCalledWith(5, 'Nota importante', 3);
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });

    it('throws when observacoes is empty', async () => {
      await expect(
        addTriageObservacaoFromForm(fd({ id: '5', observacoes: '' })),
      ).rejects.toThrow();
      expect(addTriageObservacaoMock).not.toHaveBeenCalled();
    });
  });

  // ─── updateTriageDeadlineFromForm ─────────────────────────────────────────────

  describe('updateTriageDeadlineFromForm', () => {
    it('calls updateTriageDeadline with correct args and revalidates', async () => {
      await updateTriageDeadlineFromForm(
        fd({ id: '2', prazoData: '2026-07-01', prazoHora: '09:00' }),
      );

      expect(updateTriageDeadlineMock).toHaveBeenCalledWith(2, '2026-07-01', '09:00');
      expect(revalidatePathMock).toHaveBeenCalledWith('/app/email-triage');
    });

    it('calls updateTriageDeadline without prazoHora when not provided', async () => {
      await updateTriageDeadlineFromForm(fd({ id: '2', prazoData: '2026-07-01' }));

      expect(updateTriageDeadlineMock).toHaveBeenCalledWith(2, '2026-07-01', undefined);
    });

    it('throws on invalid prazoData format', async () => {
      await expect(
        updateTriageDeadlineFromForm(fd({ id: '2', prazoData: '01/07/2026' })),
      ).rejects.toThrow();
      expect(updateTriageDeadlineMock).not.toHaveBeenCalled();
    });
  });
});
