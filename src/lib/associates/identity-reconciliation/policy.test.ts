import { describe, expect, it } from 'vitest';
import {
  buildCanonicalPatch,
  buildReconciliationPlan,
  type AssociateIdentitySnapshot,
  type RelationshipSnapshot,
} from './policy';

const EMPTY_RELATIONSHIPS: RelationshipSnapshot = {
  activities: [],
  monthlyPayments: [],
  legalConsultations: [],
  legalProcesses: [],
  dependents: [],
  healthAgreements: [],
};

function official(
  id: number,
  overrides: Partial<AssociateIdentitySnapshot> = {},
): AssociateIdentitySnapshot {
  return {
    id,
    fullName: 'Maria da Silva',
    cpf: null,
    cpfCiphertext: null,
    cpfHash: null,
    primaryEmail: null,
    primaryEmailCiphertext: null,
    primaryEmailHash: null,
    phone: null,
    phoneCiphertext: null,
    phoneHash: null,
    address: null,
    addressCiphertext: null,
    addressHash: null,
    whatsapp: null,
    whatsappCiphertext: null,
    whatsappHash: null,
    siape: null,
    siapeCiphertext: null,
    siapeHash: null,
    rg: null,
    rgCiphertext: null,
    rgHash: null,
    functionalStatus: 'ativo',
    assignment: null,
    assignmentStartDate: null,
    locationCity: null,
    locationCountry: null,
    associationStatus: 'associado',
    joinedAt: null,
    associationCategory: null,
    contributionStatus: 'em_dia',
    paymentMethod: 'folha',
    secondaryEmail: null,
    internalNotes: null,
    sex: null,
    maritalStatus: null,
    birthCity: null,
    birthState: null,
    rgIssuer: null,
    rgState: null,
    rgExpeditionDate: null,
    addressState: null,
    neighborhood: null,
    zipCode: null,
    missionType: null,
    careerOrigin: null,
    admissionDate: null,
    inaugurationDate: null,
    retirementDate: null,
    cancellationDate: null,
    leaveDate: null,
    ceocMember: null,
    caocMember: null,
    birthDate: null,
    classPattern: null,
    createdAt: new Date(`2020-01-0${id}T00:00:00Z`),
    ...overrides,
  };
}

describe('associate identity reconciliation policy', () => {
  it('connects a CPF to SIAPE to email chain into one deterministic component', () => {
    const plan = buildReconciliationPlan({
      associates: [
        official(3, { siapeHash: 'siape-shared', primaryEmailHash: 'email-shared' }),
        official(1, { cpfHash: 'cpf-shared' }),
        official(2, { cpfHash: 'cpf-shared', siapeHash: 'siape-shared' }),
        official(4, { primaryEmailHash: 'email-shared' }),
      ],
      relationships: new Map([1, 2, 3, 4].map((id) => [id, EMPTY_RELATIONSHIPS])),
      unknownForeignKeys: [],
    });

    expect(plan.report.components).toEqual([
      {
        associateIds: [1, 2, 3, 4],
        canonicalId: 2,
        absorbedIds: [1, 3, 4],
        eligible: true,
        relationCounts: {
          activities: 0,
          monthlyPayments: 0,
          legalConsultations: 0,
          legalProcesses: 0,
          dependents: 0,
          healthAgreements: 0,
        },
        conflictCodes: [],
      },
    ]);
  });

  it('serializes only technical IDs, counts, conflict codes, and the evidence hash', () => {
    const secretCpf = '12345678901';
    const secretCiphertext = 'ciphertext-never-output';
    const secretBlindIndex = 'blind-index-never-output';
    const plan = buildReconciliationPlan({
      associates: [
        official(1, {
          cpf: secretCpf,
          cpfHash: secretBlindIndex,
          phoneCiphertext: secretCiphertext,
          phoneHash: 'phone-index-never-output',
        }),
        official(2, { cpfHash: secretBlindIndex }),
      ],
      relationships: new Map([
        [1, EMPTY_RELATIONSHIPS],
        [2, EMPTY_RELATIONSHIPS],
      ]),
      unknownForeignKeys: [],
    });

    const serialized = JSON.stringify(plan.report);
    expect(serialized).not.toContain(secretCpf);
    expect(serialized).not.toContain(secretCiphertext);
    expect(serialized).not.toContain(secretBlindIndex);
    expect(serialized).not.toMatch(/cpfHash|siapeHash|primaryEmailHash|Ciphertext|sourcePayload/);
    expect(plan.report.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same evidence for the same snapshot in a different input order', () => {
    const first = official(1, { cpfHash: 'shared-order' });
    const second = official(2, { cpfHash: 'shared-order' });
    const relationships = new Map<number, RelationshipSnapshot>([
      [1, { ...EMPTY_RELATIONSHIPS, activities: [{ id: 12 }, { id: 11 }] }],
      [2, EMPTY_RELATIONSHIPS],
    ]);
    const forward = buildReconciliationPlan({
      associates: [first, second],
      relationships,
      unknownForeignKeys: [],
    });
    const reversed = buildReconciliationPlan({
      associates: [second, first],
      relationships,
      unknownForeignKeys: [],
    });
    expect(reversed.report).toEqual(forward.report);
  });

  it('fails closed on normalized-name, identifier, cadastral, and monthly-period conflicts', () => {
    const plan = buildReconciliationPlan({
      associates: [
        official(1, { cpfHash: 'shared', fullName: 'Maria Ávila', assignment: 'SERE' }),
        official(2, {
          cpfHash: 'shared',
          siapeHash: 'siape-a',
          fullName: 'Outra Pessoa',
          assignment: 'Paris',
        }),
        official(3, { cpfHash: 'shared', siapeHash: 'siape-b', fullName: 'Maria Avila' }),
      ],
      relationships: new Map([
        [1, { ...EMPTY_RELATIONSHIPS, monthlyPayments: [{ id: 11, year: 2026, month: 7 }] }],
        [2, { ...EMPTY_RELATIONSHIPS, monthlyPayments: [{ id: 12, year: 2026, month: 7 }] }],
        [3, EMPTY_RELATIONSHIPS],
      ]),
      unknownForeignKeys: [],
    });

    expect(plan.report.components[0]).toMatchObject({
      eligible: false,
      conflictCodes: [
        'CADASTRAL_FIELD_CONFLICT',
        'IDENTIFIER_CONFLICT',
        'MONTHLY_PAYMENT_PERIOD_CONFLICT',
        'NORMALIZED_NAME_CONFLICT',
      ],
    });
  });

  it('selects the most complete and most connected canonical, then uses age and ID ties', () => {
    const relationships = new Map<number, RelationshipSnapshot>([
      [1, EMPTY_RELATIONSHIPS],
      [2, { ...EMPTY_RELATIONSHIPS, activities: [{ id: 20 }, { id: 21 }] }],
      [3, EMPTY_RELATIONSHIPS],
    ]);
    const plan = buildReconciliationPlan({
      associates: [
        official(3, { cpfHash: 'shared', assignment: 'SERE', createdAt: new Date('2019-01-01') }),
        official(1, { cpfHash: 'shared', createdAt: new Date('2018-01-01') }),
        official(2, { cpfHash: 'shared', createdAt: new Date('2021-01-01') }),
      ],
      relationships,
      unknownForeignKeys: [],
    });

    expect(plan.report.components[0].canonicalId).toBe(2);

    const tied = buildReconciliationPlan({
      associates: [
        official(8, { cpfHash: 'other', createdAt: new Date('2018-01-01') }),
        official(7, { cpfHash: 'other', createdAt: new Date('2018-01-01') }),
      ],
      relationships: new Map([
        [7, EMPTY_RELATIONSHIPS],
        [8, EMPTY_RELATIONSHIPS],
      ]),
      unknownForeignKeys: [],
    });
    expect(tied.report.components[0].canonicalId).toBe(7);
  });

  it('preserves the available encrypted representation when another absorbed row has only its index', () => {
    const canonical = official(1, { cpfHash: 'shared-index' });
    const hashOnly = official(2, { cpfHash: 'shared-index' });
    const encrypted = official(3, {
      cpfCiphertext: 'encrypted-value',
      cpfHash: 'shared-index',
    });

    expect(buildCanonicalPatch(canonical, [hashOnly, encrypted])).toEqual({
      cpfCiphertext: 'encrypted-value',
    });
  });

  it('makes any unknown associate foreign key a global stop condition', () => {
    const plan = buildReconciliationPlan({
      associates: [official(1, { cpfHash: 'shared' }), official(2, { cpfHash: 'shared' })],
      relationships: new Map([
        [1, EMPTY_RELATIONSHIPS],
        [2, EMPTY_RELATIONSHIPS],
      ]),
      unknownForeignKeys: ['future_table.associate_id'],
    });

    expect(plan.report.globalConflictCodes).toEqual(['UNKNOWN_ASSOCIATE_FOREIGN_KEY']);
    expect(plan.canApply).toBe(false);
    expect(JSON.stringify(plan.report)).not.toContain('future_table');
  });
});
