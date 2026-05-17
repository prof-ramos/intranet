import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAssociate } from './actions';

const requireRoleMock = vi.fn();
const updateAssociateDataMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/associates/service', () => ({
  updateAssociateData: (...args: unknown[]) => updateAssociateDataMock(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe('associados actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7 });
    updateAssociateDataMock.mockResolvedValue(undefined);
  });

  it('updates an associate, revalidates views, and redirects to detail', async () => {
    const formData = new FormData();
    formData.set('id', '15');
    formData.set('fullName', 'Maria Silva');
    formData.set('cpf', '529.982.247-25');
    formData.set('primaryEmail', 'maria@asof.local');
    formData.set('functionalStatus', 'ativo');
    formData.set('associationStatus', 'ativo');
    formData.set('contributionStatus', 'em_dia');

    await expect(updateAssociate(formData)).rejects.toThrow('NEXT_REDIRECT:/app/associados/15');

    expect(updateAssociateDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 15,
        fullName: 'Maria Silva',
        cpf: '529.982.247-25',
        primaryEmail: 'maria@asof.local',
        functionalStatus: 'ativo',
        associationStatus: 'ativo',
        contributionStatus: 'em_dia',
        updatedBy: 7,
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados/15');
  });

  it('rejects invalid associate payloads before calling the service', async () => {
    const formData = new FormData();
    formData.set('id', '15');
    formData.set('fullName', '');

    await expect(updateAssociate(formData)).rejects.toThrow('O nome completo é obrigatório.');
    expect(updateAssociateDataMock).not.toHaveBeenCalled();
  });
});
