import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAssociatesListPage,
  getAssociateForEdit,
  updateAssociateData,
  getAssociateStatusLabel,
} from './service';

const mockFindAssociatesPaginated = vi.fn();
const mockFindAssociateById = vi.fn();
const mockUpdateAssociateById = vi.fn();
const mockEmitDomainEvent = vi.fn();
const mockTransaction = vi.fn();
const mockLogDataAccess = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => unknown) => mockTransaction(callback),
  },
}));

vi.mock('./repository', () => ({
  findAssociatesPaginated: (...args: unknown[]) => mockFindAssociatesPaginated(...args),
  findAssociateById: (...args: unknown[]) => mockFindAssociateById(...args),
  updateAssociateById: (...args: unknown[]) => mockUpdateAssociateById(...args),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: (...args: unknown[]) => mockEmitDomainEvent(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => mockLogDataAccess(...args),
}));

vi.mock('./lgpd', () => ({
  canViewSensitiveFields: (role: string) => role === 'admin' || role === 'diretoria',
  maskCpf: (cpf: string | null) => (cpf ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null),
  maskSiape: (siape: string | null) =>
    siape ? `${siape.slice(0, 2)}****${siape.slice(-2)}` : null,
}));

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: (v: string) => `enc:v2:k1.iv.tag.${btoa(v)}`,
  decryptPii: (v: string) => {
    if (v.startsWith('enc:v2:')) return atob(v.split('.')[3]);
    return v;
  },
  piiBlindIndex: (v: string) => `hash-${v}`,
  decryptPiiField: (ciphertext: string | null, plaintext: string | null) => {
    if (ciphertext) return atob(ciphertext.split('.')[3]);
    return plaintext ?? null;
  },
}));

const baseAssociate = {
  id: 1,
  fullName: 'Alice',
  cpf: '123',
  cpfCiphertext: null,
  cpfHash: null,
  siape: '456',
  siapeCiphertext: null,
  siapeHash: null,
  primaryEmail: 'a@b.com',
  primaryEmailCiphertext: null,
  primaryEmailHash: null,
  secondaryEmail: null,
  phone: null,
  phoneCiphertext: null,
  phoneHash: null,
  whatsapp: null,
  whatsappCiphertext: null,
  whatsappHash: null,
  birthDate: '1990-01-01',
  address: null,
  addressCiphertext: null,
  addressHash: null,
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
};

describe('getAssociatesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository', async () => {
    const expected = { rows: [{ id: 1, fullName: 'Alice' }], total: 1 };
    mockFindAssociatesPaginated.mockResolvedValue(expected);

    const result = await getAssociatesListPage(1, 20, 'Alice');
    expect(result).toEqual(expected);
    expect(mockFindAssociatesPaginated).toHaveBeenCalledWith(1, 20, 'Alice', undefined, false);
  });
});

describe('getAssociateForEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when associate not found', async () => {
    mockFindAssociateById.mockResolvedValue(null);
    const result = await getAssociateForEdit(999, 'admin', 1);
    expect(result).toBeNull();
    expect(mockLogDataAccess).not.toHaveBeenCalled();
  });

  it('returns DTO with canEditInternalNotes true for admin', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseAssociate });

    const result = await getAssociateForEdit(1, 'admin', 42);
    expect(result).not.toBeNull();
    expect(result!.canEditInternalNotes).toBe(true);
    expect(result!.internalNotes).toBe('notes');
  });

  it('returns DTO with canEditInternalNotes false for secretaria', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseAssociate });

    const result = await getAssociateForEdit(1, 'secretaria', 99);
    expect(result).not.toBeNull();
    expect(result!.canEditInternalNotes).toBe(false);
  });

  it('logs data access with view action', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseAssociate });

    await getAssociateForEdit(1, 'admin', 42);
    expect(mockLogDataAccess).toHaveBeenCalledWith({
      adminId: 42,
      action: 'view',
      entityType: 'associate',
      entityId: 1,
      metadata: { accessType: 'edit_form', sensitiveFields: true },
    });
  });

  it('logs data access indicating masked fields for secretaria', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseAssociate });

    await getAssociateForEdit(1, 'secretaria', 99);
    expect(mockLogDataAccess).toHaveBeenCalledWith({
      adminId: 99,
      action: 'view',
      entityType: 'associate',
      entityId: 1,
      metadata: { accessType: 'edit_form', sensitiveFields: false },
    });
  });
});

describe('updateAssociateData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback) => callback({ tx: true }));
    mockFindAssociateById.mockResolvedValue({
      ...baseAssociate,
      primaryEmail: 'alice@example.com',
      internalNotes: null,
    });
  });

  it('calls repository with PII encryption fields when cpf/siape provided', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      cpf: '999',
      siape: '123',
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        cpfCiphertext: expect.any(String),
        cpfHash: 'hash-999',
        siapeCiphertext: expect.any(String),
        siapeHash: 'hash-123',
      }),
      { tx: true },
    );
  });

  it('sets PII encryption fields to null when cpf/siape are null', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      cpf: null,
      siape: null,
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        cpf: null,
        cpfCiphertext: null,
        cpfHash: null,
        siape: null,
        siapeCiphertext: null,
        siapeHash: null,
      }),
      { tx: true },
    );
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
