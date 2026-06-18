import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatAssociateDate,
  getAssociateProfile,
  initialsFromName,
  yearsSinceDate,
} from '@/lib/associates/profile';
import { getAssociateStatusLabel } from '@/lib/associates/service';

const mockFindAssociateById = vi.fn();
const mockFindLinkedActivities = vi.fn();
const mockFindDependentsByAssociateId = vi.fn();
const mockFindHealthAgreementsByAssociateId = vi.fn();
const mockGetAssociateAuditHistory = vi.fn();
const mockGetPaymentHistoryForAssociate = vi.fn();
const mockGetConsultationsByAssociate = vi.fn();

vi.mock('./repository', () => ({
  findAssociateById: (...args: unknown[]) => mockFindAssociateById(...args),
  findLinkedActivities: (...args: unknown[]) => mockFindLinkedActivities(...args),
  findDependentsByAssociateId: (...args: unknown[]) => mockFindDependentsByAssociateId(...args),
  findHealthAgreementsByAssociateId: (...args: unknown[]) =>
    mockFindHealthAgreementsByAssociateId(...args),
}));

vi.mock('@/lib/audit/queries', () => ({
  getAssociateAuditHistory: (...args: unknown[]) => mockGetAssociateAuditHistory(...args),
}));

vi.mock('@/lib/finance/repository', () => ({
  getPaymentHistoryForAssociate: (...args: unknown[]) => mockGetPaymentHistoryForAssociate(...args),
}));

vi.mock('@/lib/juridico/repository', () => ({
  getConsultationsByAssociate: (...args: unknown[]) => mockGetConsultationsByAssociate(...args),
}));

vi.mock('./lgpd', () => ({
  toAssociateProfileDTO: (a: unknown) => a,
  toActivityDTO: (a: unknown) => a,
  canViewSensitiveFields: () => true,
}));

describe('associates/profile helpers', () => {
  it('formats date values for pt-BR display', () => {
    expect(formatAssociateDate('2026-05-11')).toBe('11 de maio de 2026');
  });

  it('builds initials from up to two name parts', () => {
    expect(initialsFromName('João da Silva')).toBe('JD');
  });

  it('maps known statuses to labels', () => {
    expect(getAssociateStatusLabel('nao_associado')).toBe('Não associado');
    expect(getAssociateStatusLabel(null)).toBeNull();
  });

  it('computes elapsed years for valid dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));

    try {
      expect(yearsSinceDate('2020-01-01')).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getAssociateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindLinkedActivities.mockResolvedValue([]);
    mockGetAssociateAuditHistory.mockResolvedValue([]);
    mockGetPaymentHistoryForAssociate.mockResolvedValue([]);
    mockGetConsultationsByAssociate.mockResolvedValue([]);
    mockFindDependentsByAssociateId.mockResolvedValue([]);
    mockFindHealthAgreementsByAssociateId.mockResolvedValue([]);
  });

  it('returns null when associate not found', async () => {
    mockFindAssociateById.mockResolvedValue(null);

    const result = await getAssociateProfile(999, 'admin');

    expect(result).toBeNull();
    expect(mockFindLinkedActivities).not.toHaveBeenCalled();
  });

  it('returns view model with timeline and linked activities', async () => {
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      assignment: 'SERE',
      locationCity: 'Brasília',
      locationCountry: 'Brasil',
      associationStatus: 'associado',
      functionalStatus: 'ativo',
      associationCategory: 'A1',
      joinedAt: '2015-06-01',
      assignmentStartDate: '2018-01-01',
      updatedAt: '2024-01-01',
    });
    mockFindLinkedActivities.mockResolvedValue([
      { id: 1, title: 'Task', status: 'a_fazer', dueDate: '2024-12-01' },
    ]);

    const result = await getAssociateProfile(1, 'admin');

    expect(result).not.toBeNull();
    expect(result!.isAssociationActive).toBe(true);
    expect(result!.isFunctionalActive).toBe(true);
    expect(result!.timeline).toHaveLength(3);
    expect(result!.linkedActivities).toHaveLength(1);
    expect(result!.location).toBe('Brasília / Brasil');
    expect(result!.showSensitive).toBe(true);
  });

  it('adds audit, payment, and juridico events to the profile timeline', async () => {
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      assignment: null,
      locationCity: null,
      locationCountry: null,
      associationStatus: 'associado',
      functionalStatus: 'ativo',
      associationCategory: null,
      joinedAt: null,
      assignmentStartDate: null,
      updatedAt: '2024-01-01',
    });
    mockGetAssociateAuditHistory.mockResolvedValue([
      {
        action: 'associate_updated',
        changes: { new: { assignment: 'SERE' } },
        createdAt: '2024-02-01',
      },
    ]);
    mockGetPaymentHistoryForAssociate.mockResolvedValue([
      {
        month: 3,
        year: 2024,
        status: 'atrasado',
        paidAt: null,
        updatedAt: '2024-03-01',
      },
    ]);
    mockGetConsultationsByAssociate.mockResolvedValue([
      {
        internalNumber: 'JUR-1',
        title: 'Consulta teste',
        status: 'respondida',
        createdAt: '2024-04-01',
        lastInteractionAt: null,
      },
    ]);

    const result = await getAssociateProfile(1, 'secretaria');

    expect(result).not.toBeNull();
    expect(result!.timeline.map((item) => item.event)).toEqual([
      'Consulta JUR-1',
      'Mensalidade 03/2024',
      'Cadastro atualizado',
      'Última atualização cadastral',
    ]);
    expect(result!.timeline[0]).toMatchObject({
      detail: 'Consulta teste — Respondida',
      tone: 'pos',
    });
    expect(result!.timeline[1]).toMatchObject({
      detail: 'Atrasado',
      tone: 'neg',
    });
    expect(result!.showSensitive).toBe(true);
    expect(result!.consultationCount).toBe(1);
  });
});
