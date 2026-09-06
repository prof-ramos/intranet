import { describe, expect, it, vi } from 'vitest';
import type { AssociateProfileViewModel } from '@/lib/associates/profile';
import { serializeOfficialProfile } from './serialize';

vi.mock('@/lib/associates/pii-mapping', () => ({
  decryptAssociatePii: () => ({
    cpf: '52998224725',
    rg: '123',
    siape: '1234567',
    primaryEmail: 'ana@asof.local',
    phone: '61999990000',
    whatsapp: '61999990000',
    address: 'SQS 100',
  }),
}));

describe('serializeOfficialProfile', () => {
  it('returns operational ficha fields without ciphertext columns', () => {
    const profile = {
      associate: {
        id: 7,
        fullName: 'Ana Silva',
        cpfCiphertext: 'cipher',
        assignment: 'SERE',
        associationStatus: 'associado',
        functionalStatus: 'ativo',
        internalNotes: 'nota interna',
      },
      location: 'Brasília / Brasil',
      isAssociationActive: true,
      isFunctionalActive: true,
      joinedYears: 4,
      careerYears: 2,
      dependents: [{ id: 1, name: 'Pedro', relationship: 'filho' }],
      healthAgreements: [],
      linkedActivities: [{ id: 3, title: 'Ligação', status: 'a_fazer', dueDate: null }],
    } as unknown as AssociateProfileViewModel;

    const serialized = serializeOfficialProfile(profile);

    expect(serialized).toMatchObject({
      id: 7,
      fullName: 'Ana Silva',
      cpf: '52998224725',
      primaryEmail: 'ana@asof.local',
      assignment: 'SERE',
      href: '/app/associados/7',
    });
    expect(serialized).not.toHaveProperty('cpfCiphertext');
    expect(serialized.dependents).toHaveLength(1);
  });
});
