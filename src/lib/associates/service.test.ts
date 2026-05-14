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
  maskCpf: (cpf: string | null) => cpf ? `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**` : null,
  maskSiape: (siape: string | null) => siape ? `${siape.slice(0, 2)}****${siape.slice(-2)}` : null,
}));

vi.mock('@/lib/utils/date', () => ({
  formatLongDate: (v: string | null) => v,
  yearsSinceDate: () => 5,
}));

vi.mock('@/lib/utils/initials', () => ({
  initialsFromName: (name: string) => name.split(' ').map((n: string) => n[0]).join(''),
}));

const mockEncryptPii = vi.fn((plaintext: string) => `enc:v2:k1.${plaintext}`);
const mockPiiBlindIndex = vi.fn((plaintext: string) => `hash-${plaintext}`);
const mockDecryptPiiField = vi.fn(
  (ciphertext: string | null, plaintext: string | null) =>
    ciphertext ? ciphertext.replace('enc:v2:k1.', '') : plaintext,
);

vi.mock('@/lib/crypto/pii', () => ({
  encryptPii: (plaintext: string) => mockEncryptPii(plaintext),
  piiBlindIndex: (plaintext: string) => mockPiiBlindIndex(plaintext),
  decryptPiiField: (ciphertext: string | null, plaintext: string | null) => mockDecryptPiiField(ciphertext, plaintext),
}));

const baseRow = {
  id: 1,
  fullName: 'Alice',
  cpf: '123.456.789-00',
  cpfCiphertext: 'enc:v2:k1.123.456.789-00',
  cpfHash: 'hash-123.456.789-00',
  siape: '1234567',
  siapeCiphertext: 'enc:v2:k1.1234567',
  siapeHash: 'hash-1234567',
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
  sourcePayload: null,
  sourceRowNumber: null,
  joinedAt: null,
  paymentMethod: 'folha',
  createdAt: new Date(),
  updatedAt: new Date(),
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

  it('returns DTO with decrypted CPF/SIAPE for admin', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseRow });

    const result = await getAssociateForEdit(1, 'admin');
    expect(result).not.toBeNull();
    expect(result!.canEditInternalNotes).toBe(true);
    expect(mockDecryptPiiField).toHaveBeenCalledWith('enc:v2:k1.123.456.789-00', '123.456.789-00');
    expect(mockDecryptPiiField).toHaveBeenCalledWith('enc:v2:k1.1234567', '1234567');
  });

  it('returns masked CPF/SIAPE for secretaria', async () => {
    mockFindAssociateById.mockResolvedValue({ ...baseRow });

    const result = await getAssociateForEdit(1, 'secretaria');
    expect(result).not.toBeNull();
    // decryptPiiField is called to get the real value, then maskCpf/maskSiape mask it
    expect(mockDecryptPiiField).toHaveBeenCalledWith('enc:v2:k1.123.456.789-00', '123.456.789-00');
    expect(mockDecryptPiiField).toHaveBeenCalledWith('enc:v2:k1.1234567', '1234567');
    // Result is masked (mock maskCpf returns "***.456.789-**" pattern)
    expect(result!.cpf).toMatch(/\*/);
    expect(result!.siape).toMatch(/\*/);
  });

  it('falls back to plaintext when ciphertext is null', async () => {
    mockFindAssociateById.mockResolvedValue({
      ...baseRow,
      cpfCiphertext: null,
      siapeCiphertext: null,
    });

    const result = await getAssociateForEdit(1, 'admin');
    expect(result).not.toBeNull();
    expect(mockDecryptPiiField).toHaveBeenCalledWith(null, '123.456.789-00');
    expect(mockDecryptPiiField).toHaveBeenCalledWith(null, '1234567');
  });
});

describe('updateAssociateData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback: (tx: unknown) => unknown) => callback({ tx: true }));
    mockFindAssociateById.mockResolvedValue({ ...baseRow });
  });

  it('encrypts CPF and SIAPE and computes blind indexes on update', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      cpf: '999.888.777-66',
      siape: '7654321',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    expect(mockEncryptPii).toHaveBeenCalledWith('999.888.777-66');
    expect(mockEncryptPii).toHaveBeenCalledWith('7654321');
    expect(mockPiiBlindIndex).toHaveBeenCalledWith('999.888.777-66');
    expect(mockPiiBlindIndex).toHaveBeenCalledWith('7654321');

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        cpf: '999.888.777-66',
        cpfCiphertext: 'enc:v2:k1.999.888.777-66',
        cpfHash: 'hash-999.888.777-66',
        siape: '7654321',
        siapeCiphertext: 'enc:v2:k1.7654321',
        siapeHash: 'hash-7654321',
      }),
      { tx: true },
    );
  });

  it('sets ciphertext/hash to null when CPF/SIAPE are null', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      cpf: null,
      siape: null,
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

  it('does not call encrypt when CPF/SIAPE are undefined', async () => {
    await updateAssociateData({
      id: 1,
      fullName: 'Alice',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    });

    // encryptPii and piiBlindIndex are not called when cpf/siape are undefined
    // (the service uses input.cpf != null checks)
    expect(mockEncryptPii).not.toHaveBeenCalled();
    expect(mockPiiBlindIndex).not.toHaveBeenCalled();

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        cpf: undefined,
        cpfCiphertext: null,
        cpfHash: null,
        siape: undefined,
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