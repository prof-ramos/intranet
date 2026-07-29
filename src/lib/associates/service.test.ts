import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAssociatesListPage,
  getAssociateForEdit,
  updateAssociateData,
  createAssociateData,
  createAssociateDependent,
  updateAssociateDependent,
  deleteAssociateDependent,
  createAssociateHealthAgreement,
  updateAssociateHealthAgreement,
  deleteAssociateHealthAgreement,
  getAssociateStatusLabel,
} from './service';

const mockFindAssociatesPaginated = vi.fn();
const mockFindAssociateById = vi.fn();
const mockUpdateAssociateById = vi.fn();
const mockEmitDomainEvent = vi.fn();
const mockTransaction = vi.fn();
const mockLogDataAccess = vi.fn();
const mockLogAuditBestEffort = vi.fn();
const mockLoggerWarn = vi.fn();
const mockCreateDependent = vi.fn();
const mockUpdateDependentById = vi.fn();
const mockDeleteDependentById = vi.fn();
const mockCreateHealthAgreement = vi.fn();
const mockUpdateHealthAgreementById = vi.fn();
const mockDeleteHealthAgreementById = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    transaction: (callback: (tx: unknown) => unknown) => mockTransaction(callback),
  },
}));

vi.mock('./repository', () => ({
  findAssociatesPaginated: (...args: unknown[]) => mockFindAssociatesPaginated(...args),
  findAssociateById: (...args: unknown[]) => mockFindAssociateById(...args),
  updateAssociateById: (...args: unknown[]) => mockUpdateAssociateById(...args),
  insertAssociate: vi.fn(),
  createDependentsBatch: vi.fn().mockResolvedValue(undefined),
  findAssociateByCpfHash: vi.fn(),
  findAssociateBySiapeHash: vi.fn(),
  findAssociateByPrimaryEmailHash: vi.fn(),
  createDependent: (...args: unknown[]) => mockCreateDependent(...args),
  updateDependentById: (...args: unknown[]) => mockUpdateDependentById(...args),
  deleteDependentById: (...args: unknown[]) => mockDeleteDependentById(...args),
  createHealthAgreement: (...args: unknown[]) => mockCreateHealthAgreement(...args),
  updateHealthAgreementById: (...args: unknown[]) => mockUpdateHealthAgreementById(...args),
  deleteHealthAgreementById: (...args: unknown[]) => mockDeleteHealthAgreementById(...args),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: (...args: unknown[]) => mockEmitDomainEvent(...args),
}));

vi.mock('@/lib/audit/service', () => ({
  logDataAccess: (...args: unknown[]) => mockLogDataAccess(...args),
  logAuditBestEffort: (...args: unknown[]) => mockLogAuditBestEffort(...args),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ warn: (...args: unknown[]) => mockLoggerWarn(...args) }),
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
  associationStatus: 'associado',
  contributionStatus: 'em_dia',
  internalNotes: 'notes',
};

const adminActor = { userId: 7, role: 'admin' as const };

describe('getAssociatesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to repository', async () => {
    const expected = { rows: [{ id: 1, fullName: 'Alice' }], total: 1 };
    mockFindAssociatesPaginated.mockResolvedValue(expected);

    const result = await getAssociatesListPage(1, 20, 'Alice');
    expect(result).toEqual(expected);
    expect(mockFindAssociatesPaginated).toHaveBeenCalledWith(1, 20, 'Alice', undefined, undefined);
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
    mockLogAuditBestEffort.mockResolvedValue(undefined);
    mockTransaction.mockImplementation((callback) => callback({ tx: true }));
    mockFindAssociateById.mockResolvedValue({
      ...baseAssociate,
      primaryEmail: 'alice@example.com',
      internalNotes: null,
    });
  });

  it('calls repository with PII encryption fields when cpf/siape provided', async () => {
    await updateAssociateData(
      {
        id: 1,
        fullName: 'Alice',
        cpf: '999',
        siape: '123',
        functionalStatus: 'ativo',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      },
      adminActor,
    );

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
    await updateAssociateData(
      {
        id: 1,
        fullName: 'Alice',
        cpf: null,
        siape: null,
        functionalStatus: 'ativo',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      },
      adminActor,
    );

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
    await updateAssociateData(
      {
        id: 1,
        fullName: 'Alice Silva',
        cpf: '999',
        primaryEmail: 'new@example.com',
        assignment: 'Embaixada em Paris',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      },
      adminActor,
    );

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
    await updateAssociateData(
      {
        id: 1,
        fullName: 'Alice',
        cpf: '999',
        primaryEmail: 'new@example.com',
        associationStatus: 'associado',
        contributionStatus: 'em_dia',
      },
      adminActor,
    );

    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
  });

  it('audits a committed common-field change using only canonical field names', async () => {
    await updateAssociateData({ id: 1, fullName: 'Alice Silva' }, adminActor);

    expect(mockLogAuditBestEffort).toHaveBeenCalledWith(
      {
        adminId: 7,
        action: 'associate_updated',
        entityType: 'associate',
        entityId: 1,
        metadata: { changedFields: ['fullName'] },
      },
      expect.anything(),
    );
  });

  it('does not decrypt stored PII for an update containing only common fields', async () => {
    mockFindAssociateById.mockResolvedValue({
      ...baseAssociate,
      cpf: null,
      cpfCiphertext: 'invalid-ciphertext',
    });

    await expect(
      updateAssociateData({ id: 1, fullName: 'Alice Silva' }, adminActor),
    ).resolves.toBeUndefined();
    expect(mockUpdateAssociateById).toHaveBeenCalled();
    expect(mockLogAuditBestEffort).toHaveBeenCalledWith(
      {
        adminId: 7,
        action: 'associate_updated',
        entityType: 'associate',
        entityId: 1,
        metadata: { changedFields: ['fullName'] },
      },
      expect.anything(),
    );
  });

  it('audits PII changes by canonical names without values or storage-field names', async () => {
    await updateAssociateData(
      {
        id: 1,
        fullName: 'Alice',
        cpf: '999',
        primaryEmail: 'new@example.com',
      },
      adminActor,
    );

    const auditArgs = mockLogAuditBestEffort.mock.calls[0]![0];
    expect(auditArgs).toEqual({
      adminId: 7,
      action: 'associate_updated',
      entityType: 'associate',
      entityId: 1,
      metadata: { changedFields: ['cpf', 'primaryEmail'] },
    });
    const serialized = JSON.stringify(auditArgs);
    expect(serialized).not.toContain('cpfCiphertext');
    expect(serialized).not.toContain('cpfHash');
    expect(serialized).not.toContain('siapeCiphertext');
    expect(serialized).not.toContain('primaryEmailCiphertext');
    expect(serialized).not.toContain('enc:v2');
    expect(serialized).not.toContain('hash-');
    expect(serialized).not.toContain('new@example.com');
  });

  it('conservatively audits supplied PII when stored PII cannot be decrypted', async () => {
    mockFindAssociateById.mockResolvedValue({
      ...baseAssociate,
      cpf: null,
      cpfCiphertext: 'invalid-ciphertext',
    });

    await expect(
      updateAssociateData(
        { id: 1, fullName: 'Alice', primaryEmail: 'new@example.com' },
        adminActor,
      ),
    ).resolves.toBeUndefined();
    expect(mockUpdateAssociateById).toHaveBeenCalled();
    expect(mockLogAuditBestEffort).toHaveBeenCalledWith(
      {
        adminId: 7,
        action: 'associate_updated',
        entityType: 'associate',
        entityId: 1,
        metadata: { changedFields: ['primaryEmail'] },
      },
      expect.anything(),
    );
  });

  it('does not audit or emit an event for a proven no-op update', async () => {
    await updateAssociateData({ id: 1, fullName: 'Alice' }, adminActor);

    expect(mockLogAuditBestEffort).not.toHaveBeenCalled();
    expect(mockEmitDomainEvent).not.toHaveBeenCalled();
  });

  it('waits for the transaction commit before attempting audit', async () => {
    let releaseCommit!: () => void;
    const commitGate = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    let transactionCallbackFinished = false;
    mockTransaction.mockImplementation(async (callback) => {
      const result = await callback({ tx: true });
      transactionCallbackFinished = true;
      await commitGate;
      return result;
    });

    const updatePromise = updateAssociateData({ id: 1, fullName: 'Alice Silva' }, adminActor);
    await vi.waitFor(() => expect(transactionCallbackFinished).toBe(true));
    expect(mockLogAuditBestEffort).not.toHaveBeenCalled();

    releaseCommit();
    await updatePromise;
    expect(mockLogAuditBestEffort).toHaveBeenCalledOnce();
  });

  it('does not audit when the transactional outbox write fails', async () => {
    mockEmitDomainEvent.mockRejectedValueOnce(new Error('outbox failed'));

    await expect(
      updateAssociateData({ id: 1, fullName: 'Alice Silva' }, adminActor),
    ).rejects.toThrow('outbox failed');
    expect(mockLogAuditBestEffort).not.toHaveBeenCalled();
  });

  it('enforces internal-notes authorization inside the domain module', async () => {
    await updateAssociateData(
      { id: 1, fullName: 'Alice', internalNotes: 'tentativa sem permissão' },
      { userId: 9, role: 'secretaria' },
    );

    const values = mockUpdateAssociateById.mock.calls[0]![1];
    expect(values).not.toHaveProperty('internalNotes');
  });

  it('accepts internal-notes updates from admins', async () => {
    await updateAssociateData(
      { id: 1, fullName: 'Alice', internalNotes: 'nota administrativa' },
      adminActor,
    );

    expect(mockUpdateAssociateById).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ internalNotes: 'nota administrativa' }),
      { tx: true },
    );
  });
});

describe('associate child mutation services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAuditBestEffort.mockResolvedValue(undefined);
    mockCreateDependent.mockResolvedValue({ id: 11, name: 'Não auditar', relationship: 'filho' });
    mockCreateHealthAgreement.mockResolvedValue({
      id: 21,
      provider: 'Não auditar',
      startDate: null,
      endDate: null,
    });
  });

  it('audits dependent create/update/delete against the parent using only dependentId', async () => {
    await createAssociateDependent(
      { associateId: 42, name: 'Nome não auditável', relationship: 'filho' },
      5,
    );
    await updateAssociateDependent(11, { name: 'Outro nome' }, 42, 5);
    await deleteAssociateDependent(11, 42, 5);

    expect(mockLogAuditBestEffort.mock.calls.map(([args]) => args)).toEqual([
      {
        adminId: 5,
        action: 'associate_dependent_created',
        entityType: 'associate',
        entityId: 42,
        metadata: { dependentId: 11 },
      },
      {
        adminId: 5,
        action: 'associate_dependent_updated',
        entityType: 'associate',
        entityId: 42,
        metadata: { dependentId: 11 },
      },
      {
        adminId: 5,
        action: 'associate_dependent_deleted',
        entityType: 'associate',
        entityId: 42,
        metadata: { dependentId: 11 },
      },
    ]);
    const serialized = JSON.stringify(mockLogAuditBestEffort.mock.calls);
    expect(serialized).not.toContain('Nome não auditável');
    expect(serialized).not.toContain('Outro nome');
    expect(serialized).not.toContain('dependentName');
  });

  it('audits health agreement create/update/delete using only healthAgreementId', async () => {
    await createAssociateHealthAgreement({ associateId: 42, provider: 'Plano secreto' }, 5);
    await updateAssociateHealthAgreement(21, { provider: 'Outro plano' }, 42, 5);
    await deleteAssociateHealthAgreement(21, 42, 5);

    expect(mockLogAuditBestEffort.mock.calls.map(([args]) => args)).toEqual([
      {
        adminId: 5,
        action: 'associate_health_agreement_created',
        entityType: 'associate',
        entityId: 42,
        metadata: { healthAgreementId: 21 },
      },
      {
        adminId: 5,
        action: 'associate_health_agreement_updated',
        entityType: 'associate',
        entityId: 42,
        metadata: { healthAgreementId: 21 },
      },
      {
        adminId: 5,
        action: 'associate_health_agreement_deleted',
        entityType: 'associate',
        entityId: 42,
        metadata: { healthAgreementId: 21 },
      },
    ]);
    const serialized = JSON.stringify(mockLogAuditBestEffort.mock.calls);
    expect(serialized).not.toContain('Plano secreto');
    expect(serialized).not.toContain('Outro plano');
    expect(serialized).not.toContain('provider');
  });

  it('does not audit a dependent mutation when the repository fails', async () => {
    mockUpdateDependentById.mockRejectedValueOnce(new Error('repository failed'));

    await expect(updateAssociateDependent(11, { name: 'Nome' }, 42, 5)).rejects.toThrow(
      'repository failed',
    );
    expect(mockLogAuditBestEffort).not.toHaveBeenCalled();
  });

  it('does not audit a health agreement mutation when the repository fails', async () => {
    mockDeleteHealthAgreementById.mockRejectedValueOnce(new Error('repository failed'));

    await expect(deleteAssociateHealthAgreement(21, 42, 5)).rejects.toThrow('repository failed');
    expect(mockLogAuditBestEffort).not.toHaveBeenCalled();
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

describe('createAssociateData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation((callback) => callback({ tx: true }));
  });

  it('logs audit without executor (best-effort, outside tx)', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.insertAssociate).mockResolvedValue(42);
    vi.mocked(repository.findAssociateByCpfHash).mockResolvedValue(null as never);
    vi.mocked(repository.findAssociateBySiapeHash).mockResolvedValue(null as never);
    vi.mocked(repository.findAssociateByPrimaryEmailHash).mockResolvedValue(null as never);

    const result = await createAssociateData({ fullName: 'Novo Oficial' }, adminActor);

    expect(result).toEqual({ id: 42 });
    expect(mockLogAuditBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 7,
        action: 'create',
        entityType: 'associate',
        entityId: 42,
      }),
      expect.anything(),
    );
    const auditCall = mockLogAuditBestEffort.mock.calls.at(-1)![0];
    expect(auditCall.executor).toBeUndefined();
  });

  it('does not uniqueness-check blank CPF/SIAPE (empty form fields)', async () => {
    const repository = await import('./repository');
    const { buildPiiPatch } = await import('./pii-mapping');
    vi.mocked(repository.insertAssociate).mockResolvedValue(99);
    vi.mocked(repository.findAssociateByCpfHash).mockResolvedValue(null as never);
    vi.mocked(repository.findAssociateBySiapeHash).mockResolvedValue(null as never);
    vi.mocked(repository.findAssociateByPrimaryEmailHash).mockResolvedValue(null as never);

    await createAssociateData(
      {
        fullName: 'Oficial Sem PII',
        cpf: '',
        siape: '  ',
        primaryEmail: '',
      },
      adminActor,
    );

    // Blank PII must not produce blind indexes (would collide across creates)
    const blankPatch = buildPiiPatch({ cpf: '', siape: '  ', primaryEmail: '' });
    expect(blankPatch.cpfHash).toBeNull();
    expect(blankPatch.siapeHash).toBeNull();
    expect(blankPatch.primaryEmailHash).toBeNull();

    expect(repository.findAssociateByCpfHash).not.toHaveBeenCalled();
    expect(repository.findAssociateBySiapeHash).not.toHaveBeenCalled();
    expect(repository.findAssociateByPrimaryEmailHash).not.toHaveBeenCalled();
    expect(repository.insertAssociate).toHaveBeenCalled();
  });

  it('drops internal notes from non-admin create callers', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.insertAssociate).mockResolvedValue(100);

    await createAssociateData(
      { fullName: 'Novo Oficial', internalNotes: 'tentativa sem permissão' },
      { userId: 8, role: 'secretaria' },
    );

    expect(repository.insertAssociate).toHaveBeenCalledWith(
      expect.objectContaining({ internalNotes: null }),
      { tx: true },
    );
  });

  it('rejects an invalid actor before opening a transaction', async () => {
    await expect(
      createAssociateData({ fullName: 'Novo Oficial' }, { userId: 0, role: 'admin' }),
    ).rejects.toThrow('Ator inválido.');

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
