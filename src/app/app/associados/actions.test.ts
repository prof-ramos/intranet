import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateAssociate } from './actions';

const requireRoleMock = vi.fn();
const updateAssociateDataMock = vi.fn();
const revalidatePathMock = vi.fn();
const revalidateTagMock = vi.fn();

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: (...args: unknown[]) => requireRoleMock(...args),
}));

vi.mock('@/lib/associates/service', () => ({
  updateAssociateData: (...args: unknown[]) => updateAssociateDataMock(...args),
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

describe('associados actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({ userId: 7, role: 'admin' });
    updateAssociateDataMock.mockResolvedValue(undefined);
  });

  it('updates an associate, revalidates views, and redirects to detail', async () => {
    const formData = new FormData();
    formData.set('id', '15');
    formData.set('fullName', 'Maria Silva');
    formData.set('cpf', '529.982.247-25');
    formData.set('primaryEmail', 'maria@asof.local');
    formData.set('functionalStatus', 'ativo');
    formData.set('associationStatus', 'associado');
    formData.set('contributionStatus', 'em_dia');
    formData.set('updatedBy', '999');

    await expect(updateAssociate(formData)).rejects.toThrow('NEXT_REDIRECT:/app/associados/15');

    expect(updateAssociateDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 15,
        fullName: 'Maria Silva',
        cpf: '529.982.247-25',
        primaryEmail: 'maria@asof.local',
        functionalStatus: 'ativo',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      }),
      { userId: 7, role: 'admin' },
    );
    const [serviceInput, auditActor] = updateAssociateDataMock.mock.calls[0]!;
    expect(serviceInput).not.toHaveProperty('updatedBy');
    expect(auditActor).toEqual({ userId: 7, role: 'admin' });
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados');
    expect(revalidatePathMock).toHaveBeenCalledWith('/app/associados/15');
    expect(revalidateTagMock).toHaveBeenCalledWith('associates', 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith('dashboard', 'max');
  });

  it('rejects invalid associate payloads before calling the service', async () => {
    const formData = new FormData();
    formData.set('id', '15');
    formData.set('fullName', '');

    await expect(updateAssociate(formData)).rejects.toThrow('O nome completo é obrigatório.');
    expect(updateAssociateDataMock).not.toHaveBeenCalled();
  });
});
