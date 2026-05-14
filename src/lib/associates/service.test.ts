import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAssociatesListPage,
  getAssociateForEdit,
  updateAssociateData,
  getAssociateProfile,
  getAssociateStatusLabel,
} from './service';

const mockFindAssociatesPaginated = vi.fn();
const mockFindAssociateById = vi.fn();
const mockFindLinkedActivities = vi.fn();
const mockUpdateAssociateById = vi.fn();
const mockEmitDomainEvent = vi.fn();
const mockTransaction = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => unknown) => mockTransaction(callback),
  },
}));

vi.mock('./repository', () => ({
  findAssociatesPaginated: (...args: unknown[]) => mockFindAssociatesPaginated(...args),
  findAssociateById: (...args: unknown[]) => mockFindAssociateById(...args),
  findLinkedActivities: (...args: unknown[]) => mockFindLinkedActivities(...args),
  updateAssociateById: (...args: unknown[]) => mockUpdateAssociateById(...args),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: (...args: unknown[]) => mockEmitDomainEvent(...args),
}));

vi.mock('./lgpd', () => ({
  toAssociateProfileDTO: (a: unknown) => a,
  toActivityDTO: (a: unknown) => a,
  canViewSensitiveFields: (role: string) => role === 'admin' || role === 'diretoria',
}));

vi.mock('@/lib/utils/date', () => ({
  formatLongDate: (v: string | null) => v,
  yearsSinceDate: () => 5,
}));

vi.mock('@/lib/utils/initials', () => ({
  initialsFromName: (name: string) => name.split(' ').map((n) => n[0]).join(''),
}));

describe('getAssociatesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository', async () => {
    const expected = { rows: [{ id: 1, fullName: 'Alice' }], total: 1 };
    mockFindAssociatesPaginated.mockResolvedValue(expected);

    const result = await getAssociatesListPage(1, 20, 'Alice');
    expect(result).toEqual(expected);
    expect(mockFindAssociatesPaginated).toHaveBeenCalledWith(1, 20, 'Alice');
  });
});

describe('getAssociateForEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when associate not found', async () => {
    mockFindAssociateById.mockResolvedValue(null);
    const result = await getAssociateForEdit(999, 'admin');
    expect(result).toBeNull();
  });

  it('returns DTO with canEditInternalNotes true for admin', async () => {
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      cpf: '123',
      siape: '456',
      primaryEmail: 'a@b.com',
      secondaryEmail: null,
      phone: null,
      whatsapp: null,
      birthDate: '1990-01-01',
      address: null,
      locationCity: null,
      locationCountry: null,
      assignment: null,
      assignmentStartDate: null,
      classPattern: null,
      associationCategory: null,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
      internalNotes: 'notes',
    });

    const result = await getAssociateForEdit(1, 'admin');
    expect(result).not.toBeNull();
    expect(result!.canEditInternalNotes).toBe(true);
    expect(result!.internalNotes).toBe('notes');
  });

  it('returns DTO with canEditInternalNotes false for secretaria', async () => {
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      cpf: '123',
      siape: '456',
      primaryEmail: 'a@b.com',
      secondaryEmail: null,
      phone: null,
      whatsapp: null,
      birthDate: '1990-01-01',
      address: null,
      locationCity: null,
      locationCountry: null,
      assignment: null,
      assignmentStartDate: null,
      classPattern: null,
      associationCategory: null,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
      internalNotes: 'notes',
    });

    const result = await getAssociateForEdit(1, 'secretaria');
    expect(result).not.toBeNull();
    expect(result!.canEditInternalNotes).toBe(false);
  });
});

describe('updateAssociateData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback) => callback({ tx: true }));
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      cpf: '123',
      siape: '456',
      primaryEmail: 'alice@example.com',
      secondaryEmail: null,
      phone: null,
      whatsapp: null,
      birthDate: null,
      address: null,
      locationCity: null,
      locationCountry: null,
      assignment: null,
      assignmentStartDate: null,
      classPattern: null,
      associationCategory: null,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
      internalNotes: null,
    });
  });

  it('calls repository with trimmed values', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(1, {
      fullName: 'Alice',
      cpf: undefined,
      siape: undefined,
      primaryEmail: undefined,
      secondaryEmail: undefined,
      phone: undefined,
      whatsapp: undefined,
      birthDate: undefined,
      address: undefined,
      locationCity: undefined,
      locationCountry: undefined,
      assignment: undefined,
      assignmentStartDate: undefined,
      classPattern: undefined,
      associationCategory: undefined,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    }, { tx: true });
  });

  it('emits associate.updated with only safe changed field names', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice Silva',
      cpf: '999',
      primaryEmail: 'new@example.com',
      assignment: 'Embaixada em Paris',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
      updatedBy: 7,
    });

    expect(mockEmitDomainEvent).toHaveBeenCalledWith(
      {
        type: 'associate.updated',
        entityType: 'associate',
        entityId: 1,
        actorAdminId: 7,
        payload: {
          associateId: 1,
          changedFields: ['fullName', 'assignment'],
          links: {
            app: '/app/associados/1',
          },
        },
      },
      { tx: true },
    );
  });

  it('does not emit associate.updated when only sensitive fields changed', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      cpf: '999',
      primaryEmail: 'new@example.com',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
  });
});

describe('getAssociateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when associate not found', async () => {
    mockFindAssociateById.mockResolvedValue(null);
    const result = await getAssociateProfile(999, 'admin');
    expect(result).toBeNull();
  });

  it('returns view model with timeline and activities', async () => {
    mockFindAssociateById.mockResolvedValue({
      id: 1,
      fullName: 'Alice',
      assignment: 'SERE',
      locationCity: 'Brasília',
      locationCountry: 'Brasil',
      associationStatus: 'ativo',
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
  });
});

describe('getAssociateStatusLabel', () => {
  it('maps known status values', () => {
    expect(getAssociateStatusLabel('ativo')).toBe('Ativo');
    expect(getAssociateStatusLabel('aposentado')).toBe('Aposentado');
    expect(getAssociateStatusLabel('em_dia')).toBe('Em dia');
  });

  it('returns null for null input', () => {
    expect(getAssociateStatusLabel(null)).toBeNull();
  });

  it('returns raw value for unknown status', () => {
    expect(getAssociateStatusLabel('unknown')).toBe('unknown');
  });
});
