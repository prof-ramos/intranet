import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDependentAction,
  editDependentAction,
  removeDependentAction,
  addHealthAgreementAction,
  editHealthAgreementAction,
  removeHealthAgreementAction,
} from './actions';

const {
  requireAuthMock,
  revalidatePathMock,
  revalidateTagMock,
  createDependentMock,
  updateDependentByIdMock,
  deleteDependentByIdMock,
  createHealthAgreementMock,
  updateHealthAgreementByIdMock,
  deleteHealthAgreementByIdMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  createDependentMock: vi.fn(),
  updateDependentByIdMock: vi.fn(),
  deleteDependentByIdMock: vi.fn(),
  createHealthAgreementMock: vi.fn(),
  updateHealthAgreementByIdMock: vi.fn(),
  deleteHealthAgreementByIdMock: vi.fn(),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => requireAuthMock(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('@/lib/associates/repository', () => ({
  createDependent: (...args: unknown[]) => createDependentMock(...args),
  updateDependentById: (...args: unknown[]) => updateDependentByIdMock(...args),
  deleteDependentById: (...args: unknown[]) => deleteDependentByIdMock(...args),
  createHealthAgreement: (...args: unknown[]) => createHealthAgreementMock(...args),
  updateHealthAgreementById: (...args: unknown[]) => updateHealthAgreementByIdMock(...args),
  deleteHealthAgreementById: (...args: unknown[]) => deleteHealthAgreementByIdMock(...args),
}));

function fd(fields: Record<string, string | null>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null) form.set(k, v);
  }
  return form;
}

describe('associate [id] actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ userId: 5, role: 'admin' });
  });

  it('throws when caller lacks required role', async () => {
    requireAuthMock.mockResolvedValue({ userId: 9, role: 'unknown_role' });
    await expect(
      addDependentAction(fd({ associateId: '1', name: 'Filho', relationship: 'filho' })),
    ).rejects.toThrow('Permissão insuficiente.');
  });

  // ─── addDependentAction ─────────────────────────────────────────────────

  it('addDependentAction: creates dependent and revalidates', async () => {
    await addDependentAction(fd({ associateId: '42', name: 'Maria Silva', relationship: 'conjuge' }));

    expect(createDependentMock).toHaveBeenCalledWith({
      associateId: 42,
      name: 'Maria Silva',
      relationship: 'conjuge',
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados/42');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('addDependentAction: throws on Zod failure when name is empty', async () => {
    await expect(
      addDependentAction(fd({ associateId: '42', name: '', relationship: 'filho' })),
    ).rejects.toThrow();
    expect(createDependentMock).not.toHaveBeenCalled();
  });

  // ─── editDependentAction ────────────────────────────────────────────────

  it('editDependentAction: updates dependent and revalidates', async () => {
    await editDependentAction(fd({ id: '7', associateId: '42', name: 'João', relationship: 'filho' }));

    expect(updateDependentByIdMock).toHaveBeenCalledWith(
      7,
      { name: 'João', relationship: 'filho' },
      42,
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('editDependentAction: secretaria role is accepted', async () => {
    requireAuthMock.mockResolvedValue({ userId: 9, role: 'secretaria' });
    await editDependentAction(fd({ id: '7', associateId: '42', name: 'Ana', relationship: 'mae' }));
    expect(updateDependentByIdMock).toHaveBeenCalled();
  });

  it('editDependentAction: throws on Zod failure when id is missing', async () => {
    await expect(
      editDependentAction(fd({ associateId: '42', name: 'João' })),
    ).rejects.toThrow();
    expect(updateDependentByIdMock).not.toHaveBeenCalled();
  });

  // ─── removeDependentAction ──────────────────────────────────────────────

  it('removeDependentAction: deletes dependent and revalidates', async () => {
    await removeDependentAction(fd({ id: '3', associateId: '42' }));

    expect(deleteDependentByIdMock).toHaveBeenCalledWith(3, 42);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('removeDependentAction: throws on Zod failure when id is not a number', async () => {
    await expect(
      removeDependentAction(fd({ id: 'abc', associateId: '42' })),
    ).rejects.toThrow();
    expect(deleteDependentByIdMock).not.toHaveBeenCalled();
  });

  // ─── addHealthAgreementAction ───────────────────────────────────────────

  it('addHealthAgreementAction: creates health agreement and revalidates', async () => {
    await addHealthAgreementAction(
      fd({ associateId: '42', provider: 'Unimed', startDate: '2026-01-01', endDate: '' }),
    );

    expect(createHealthAgreementMock).toHaveBeenCalledWith({
      associateId: 42,
      provider: 'Unimed',
      startDate: '2026-01-01',
      endDate: null,
    });
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('addHealthAgreementAction: throws on Zod failure when provider is empty', async () => {
    await expect(
      addHealthAgreementAction(fd({ associateId: '42', provider: '' })),
    ).rejects.toThrow();
    expect(createHealthAgreementMock).not.toHaveBeenCalled();
  });

  // ─── editHealthAgreementAction ──────────────────────────────────────────

  it('editHealthAgreementAction: updates health agreement and revalidates', async () => {
    await editHealthAgreementAction(fd({ id: '10', associateId: '42', provider: 'SulAmérica' }));

    expect(updateHealthAgreementByIdMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ provider: 'SulAmérica' }),
      42,
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('editHealthAgreementAction: diretoria role is accepted', async () => {
    requireAuthMock.mockResolvedValue({ userId: 8, role: 'diretoria' });
    await editHealthAgreementAction(fd({ id: '10', associateId: '42', provider: 'Bradesco' }));
    expect(updateHealthAgreementByIdMock).toHaveBeenCalled();
  });

  it('editHealthAgreementAction: throws on Zod failure when id is missing', async () => {
    await expect(
      editHealthAgreementAction(fd({ associateId: '42', provider: 'Unimed' })),
    ).rejects.toThrow();
    expect(updateHealthAgreementByIdMock).not.toHaveBeenCalled();
  });

  // ─── removeHealthAgreementAction ────────────────────────────────────────

  it('removeHealthAgreementAction: deletes health agreement and revalidates', async () => {
    await removeHealthAgreementAction(fd({ id: '5', associateId: '42' }));

    expect(deleteHealthAgreementByIdMock).toHaveBeenCalledWith(5, 42);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('removeHealthAgreementAction: throws on Zod failure when associateId is invalid', async () => {
    await expect(
      removeHealthAgreementAction(fd({ id: '5', associateId: '-1' })),
    ).rejects.toThrow();
    expect(deleteHealthAgreementByIdMock).not.toHaveBeenCalled();
  });
});
