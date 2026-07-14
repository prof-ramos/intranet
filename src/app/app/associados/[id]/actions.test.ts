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
  createAssociateDependentMock,
  updateAssociateDependentMock,
  deleteAssociateDependentMock,
  createAssociateHealthAgreementMock,
  updateAssociateHealthAgreementMock,
  deleteAssociateHealthAgreementMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
  createAssociateDependentMock: vi.fn(),
  updateAssociateDependentMock: vi.fn(),
  deleteAssociateDependentMock: vi.fn(),
  createAssociateHealthAgreementMock: vi.fn(),
  updateAssociateHealthAgreementMock: vi.fn(),
  deleteAssociateHealthAgreementMock: vi.fn(),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => requireAuthMock(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

vi.mock('@/lib/associates/service', () => ({
  createAssociateDependent: (...args: unknown[]) => createAssociateDependentMock(...args),
  updateAssociateDependent: (...args: unknown[]) => updateAssociateDependentMock(...args),
  deleteAssociateDependent: (...args: unknown[]) => deleteAssociateDependentMock(...args),
  createAssociateHealthAgreement: (...args: unknown[]) =>
    createAssociateHealthAgreementMock(...args),
  updateAssociateHealthAgreement: (...args: unknown[]) =>
    updateAssociateHealthAgreementMock(...args),
  deleteAssociateHealthAgreement: (...args: unknown[]) =>
    deleteAssociateHealthAgreementMock(...args),
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
    ).rejects.toThrow('NEXT_REDIRECT');
  });

  // ─── addDependentAction ─────────────────────────────────────────────────

  it('addDependentAction: creates dependent and revalidates', async () => {
    await addDependentAction(
      fd({ associateId: '42', name: 'Maria Silva', relationship: 'conjuge' }),
    );

    expect(createAssociateDependentMock).toHaveBeenCalledWith(
      { associateId: 42, name: 'Maria Silva', relationship: 'conjuge' },
      5,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados/42');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('addDependentAction: throws on Zod failure when name is empty', async () => {
    await expect(
      addDependentAction(fd({ associateId: '42', name: '', relationship: 'filho' })),
    ).rejects.toThrow();
    expect(createAssociateDependentMock).not.toHaveBeenCalled();
  });

  // ─── editDependentAction ────────────────────────────────────────────────

  it('editDependentAction: updates dependent and revalidates', async () => {
    await editDependentAction(
      fd({ id: '7', associateId: '42', name: 'João', relationship: 'filho' }),
    );

    expect(updateAssociateDependentMock).toHaveBeenCalledWith(
      7,
      { name: 'João', relationship: 'filho' },
      42,
      5,
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('editDependentAction: secretaria role is accepted', async () => {
    requireAuthMock.mockResolvedValue({ userId: 9, role: 'secretaria' });
    await editDependentAction(fd({ id: '7', associateId: '42', name: 'Ana', relationship: 'mae' }));
    expect(updateAssociateDependentMock).toHaveBeenCalledWith(
      7,
      { name: 'Ana', relationship: 'mae' },
      42,
      9,
    );
  });

  it('editDependentAction: throws on Zod failure when id is missing', async () => {
    await expect(editDependentAction(fd({ associateId: '42', name: 'João' }))).rejects.toThrow();
    expect(updateAssociateDependentMock).not.toHaveBeenCalled();
  });

  // ─── removeDependentAction ──────────────────────────────────────────────

  it('removeDependentAction: deletes dependent and revalidates', async () => {
    await removeDependentAction(fd({ id: '3', associateId: '42' }));

    expect(deleteAssociateDependentMock).toHaveBeenCalledWith(3, 42, 5);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('removeDependentAction: throws on Zod failure when id is not a number', async () => {
    await expect(removeDependentAction(fd({ id: 'abc', associateId: '42' }))).rejects.toThrow();
    expect(deleteAssociateDependentMock).not.toHaveBeenCalled();
  });

  // ─── addHealthAgreementAction ───────────────────────────────────────────

  it('addHealthAgreementAction: creates health agreement and revalidates', async () => {
    await addHealthAgreementAction(
      fd({ associateId: '42', provider: 'Unimed', startDate: '2026-01-01', endDate: '' }),
    );

    expect(createAssociateHealthAgreementMock).toHaveBeenCalledWith(
      { associateId: 42, provider: 'Unimed', startDate: '2026-01-01', endDate: null },
      5,
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('addHealthAgreementAction: throws on Zod failure when provider is empty', async () => {
    await expect(
      addHealthAgreementAction(fd({ associateId: '42', provider: '' })),
    ).rejects.toThrow();
    expect(createAssociateHealthAgreementMock).not.toHaveBeenCalled();
  });

  // ─── editHealthAgreementAction ──────────────────────────────────────────

  it('editHealthAgreementAction: updates health agreement and revalidates', async () => {
    await editHealthAgreementAction(fd({ id: '10', associateId: '42', provider: 'SulAmérica' }));

    expect(updateAssociateHealthAgreementMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ provider: 'SulAmérica' }),
      42,
      5,
    );
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('editHealthAgreementAction: diretoria role is accepted', async () => {
    requireAuthMock.mockResolvedValue({ userId: 8, role: 'diretoria' });
    await editHealthAgreementAction(fd({ id: '10', associateId: '42', provider: 'Bradesco' }));
    expect(updateAssociateHealthAgreementMock).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ provider: 'Bradesco' }),
      42,
      8,
    );
  });

  it('editHealthAgreementAction: throws on Zod failure when id is missing', async () => {
    await expect(
      editHealthAgreementAction(fd({ associateId: '42', provider: 'Unimed' })),
    ).rejects.toThrow();
    expect(updateAssociateHealthAgreementMock).not.toHaveBeenCalled();
  });

  // ─── removeHealthAgreementAction ────────────────────────────────────────

  it('removeHealthAgreementAction: deletes health agreement and revalidates', async () => {
    await removeHealthAgreementAction(fd({ id: '5', associateId: '42' }));

    expect(deleteAssociateHealthAgreementMock).toHaveBeenCalledWith(5, 42, 5);
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('removeHealthAgreementAction: throws on Zod failure when associateId is invalid', async () => {
    await expect(removeHealthAgreementAction(fd({ id: '5', associateId: '-1' }))).rejects.toThrow();
    expect(deleteAssociateHealthAgreementMock).not.toHaveBeenCalled();
  });
});
