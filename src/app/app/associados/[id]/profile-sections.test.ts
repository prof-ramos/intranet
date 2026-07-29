import { describe, expect, it } from 'vitest';
import { buildAssociateProfileSections } from './profile-sections';
import type { AssociateProfile } from './ProfileUi';

function makeProfile(overrides: Partial<AssociateProfile['associate']> = {}): AssociateProfile {
  return {
    associate: {
      id: 1,
      fullName: 'João Silva',
      cpf: '12345678901',
      rg: null,
      rgIssuer: null,
      rgState: null,
      rgExpeditionDate: null,
      siape: '1234567',
      sex: 'M',
      maritalStatus: 'casado',
      birthDate: '1990-05-15',
      birthCity: null,
      birthState: null,
      primaryEmail: 'joao@example.com',
      secondaryEmail: null,
      phone: null,
      whatsapp: null,
      address: 'SQN 123',
      neighborhood: 'Asa Norte',
      addressState: 'DF',
      zipCode: '70000000',
      functionalStatus: 'ativo',
      missionType: null,
      careerOrigin: null,
      classPattern: 'B',
      assignment: 'SERE',
      assignmentStartDate: '2015-03-01',
      admissionDate: null,
      inaugurationDate: null,
      retirementDate: null,
      leaveDate: null,
      cancellationDate: null,
      associationCategory: 'efetivo',
      joinedAt: '2015-04-01',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      paymentMethod: null,
      ceocMember: true,
      caocMember: null,
      internalNotes: null,
      updatedAt: '2024-01-01',
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    linkedActivities: [],
    dependents: [],
    healthAgreements: [],
    isAssociationActive: true,
    isFunctionalActive: true,
    joinedYears: 9,
    careerYears: 9,
    location: 'Brasília / Brasil',
    showSensitive: true,
    timeline: [],
    paymentHistory: [],
    consultationCount: 0,
  };
}

describe('buildAssociateProfileSections', () => {
  it('returns the four static field sections in order', () => {
    const sections = buildAssociateProfileSections(makeProfile());
    expect(sections.map((s) => s.id)).toEqual([
      'identificacao',
      'endereco',
      'dados-profissionais',
      'administrativo',
    ]);
  });

  it('omits RG detail rows when rg is not set', () => {
    const sections = buildAssociateProfileSections(makeProfile());
    const identificacao = sections.find((s) => s.id === 'identificacao')!;
    expect(identificacao.rows.some((r) => r.label === 'Órgão Expedidor')).toBe(false);
  });

  it('includes RG detail rows when rg is set', () => {
    const sections = buildAssociateProfileSections(
      makeProfile({ rg: '1234567', rgIssuer: 'SSP', rgState: 'DF' }),
    );
    const identificacao = sections.find((s) => s.id === 'identificacao')!;
    expect(identificacao.rows.some((r) => r.label === 'Órgão Expedidor')).toBe(true);
  });

  it('represents boolean fields with kind: boolean, not a formatted string', () => {
    const sections = buildAssociateProfileSections(makeProfile());
    const administrativo = sections.find((s) => s.id === 'administrativo')!;
    const ceoc = administrativo.rows.find((r) => r.label === 'Membro CEOC');
    expect(ceoc).toEqual({ kind: 'boolean', label: 'Membro CEOC', value: true });
  });

  it('formats enum labels for screen and print alike', () => {
    const sections = buildAssociateProfileSections(makeProfile());
    const administrativo = sections.find((s) => s.id === 'administrativo')!;
    expect(administrativo.rows.find((r) => r.label === 'Vínculo ASOF')).toEqual({
      kind: 'text',
      label: 'Vínculo ASOF',
      value: 'Associado',
      mono: undefined,
    });
  });
});
