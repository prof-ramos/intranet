/* eslint-disable @typescript-eslint/no-explicit-any -- mocked repository rows use focused fixtures */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addLabelToActivityService,
  createLabelService,
  deactivateLabelService,
  listLabelsService,
  removeLabelFromActivityService,
} from './labels-service';

const {
  dbMock,
  txMock,
  repositoryMocks,
  labelRepositoryMocks,
  auditMock,
  outboxMock,
  dispatchMock,
  MOCK_LABEL,
  MOCK_ASSIGNMENT,
} = vi.hoisted(() => {
  const MOCK_LABEL = {
    id: 7,
    name: 'Financeiro',
    slug: 'financeiro',
    colorToken: '#123456',
    active: true,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  };
  const MOCK_ASSIGNMENT = {
    activityId: 42,
    labelId: 7,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    createdBy: 3,
  };

  const txMock = Symbol('tx');
  const repositoryMocks = {
    findActivityById: vi.fn(),
  };
  const labelRepositoryMocks = {
    findActiveLabels: vi.fn(),
    findLabelBySlug: vi.fn(),
    insertLabel: vi.fn(),
    deactivateLabel: vi.fn(),
    assignLabelToActivity: vi.fn(),
    removeLabelFromActivity: vi.fn(),
  };
  const auditMock = {
    logAuditAction: vi.fn(),
  };
  const outboxMock = {
    emitDomainEvent: vi.fn(),
  };
  const dispatchMock = vi.fn();
  const dbMock = {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(txMock)),
  };

  return {
    dbMock,
    txMock,
    repositoryMocks,
    labelRepositoryMocks,
    auditMock,
    outboxMock,
    dispatchMock,
    MOCK_LABEL,
    MOCK_ASSIGNMENT,
  };
});

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('./repository', () => repositoryMocks);
vi.mock('./labels-repository', () => labelRepositoryMocks);
vi.mock('@/lib/audit/service', () => auditMock);
vi.mock('@/lib/integrations/outbox', () => outboxMock);
vi.mock('@/lib/integrations/webhooks/service', () => ({
  dispatchDomainEventById: (...args: unknown[]) => dispatchMock(...args),
}));

describe('activity labels service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(labelRepositoryMocks.findLabelBySlug).mockResolvedValue(null);
    vi.mocked(labelRepositoryMocks.insertLabel).mockResolvedValue(MOCK_LABEL as any);
    vi.mocked(labelRepositoryMocks.deactivateLabel).mockResolvedValue({
      ...MOCK_LABEL,
      active: false,
    } as any);
    vi.mocked(repositoryMocks.findActivityById).mockResolvedValue({ id: 42 } as any);
    vi.mocked(labelRepositoryMocks.findActiveLabels).mockResolvedValue([MOCK_LABEL] as any);
    vi.mocked(labelRepositoryMocks.assignLabelToActivity).mockResolvedValue(MOCK_ASSIGNMENT as any);
    vi.mocked(labelRepositoryMocks.removeLabelFromActivity).mockResolvedValue(
      MOCK_ASSIGNMENT as any,
    );
    vi.mocked(auditMock.logAuditAction).mockResolvedValue(undefined);
    vi.mocked(outboxMock.emitDomainEvent).mockResolvedValue({ id: 123 } as never);
    dispatchMock.mockResolvedValue(undefined);
  });

  it('creates a label with a normalized slug and strict in-transaction audit', async () => {
    const result = await createLabelService({
      name: '  Revisão Jurídica  ',
      colorToken: '#1A2b3C',
      createdBy: 7,
    });

    expect(result).toEqual(MOCK_LABEL);
    expect(labelRepositoryMocks.findLabelBySlug).toHaveBeenCalledWith('revisao-juridica', txMock);
    expect(labelRepositoryMocks.insertLabel).toHaveBeenCalledWith(
      {
        name: 'Revisão Jurídica',
        slug: 'revisao-juridica',
        colorToken: '#1A2b3C',
      },
      txMock,
    );
    expect(auditMock.logAuditAction).toHaveBeenCalledWith({
      adminId: 7,
      action: 'activity_label_created',
      entityType: 'activity',
      entityId: null,
      changes: {
        new: { name: 'Revisão Jurídica', slug: 'revisao-juridica', colorToken: '#1A2b3C' },
      },
      executor: txMock,
    });
  });

  it('rejects a duplicate slug before inserting', async () => {
    vi.mocked(labelRepositoryMocks.findLabelBySlug).mockResolvedValue(MOCK_LABEL as any);

    await expect(
      createLabelService({ name: 'Financeiro', colorToken: '#123456', createdBy: 7 }),
    ).rejects.toThrow('Já existe um rótulo com esse slug.');
    expect(labelRepositoryMocks.insertLabel).not.toHaveBeenCalled();
    expect(auditMock.logAuditAction).not.toHaveBeenCalled();
  });

  it.each([
    ['', 'O nome do rótulo deve ter entre 1 e 64 caracteres.'],
    ['a'.repeat(65), 'O nome do rótulo deve ter entre 1 e 64 caracteres.'],
  ])('rejects invalid name %j', async (name, message) => {
    await expect(createLabelService({ name, colorToken: '#123456', createdBy: 7 })).rejects.toThrow(
      message,
    );
  });

  it('rejects an invalid color token', async () => {
    await expect(
      createLabelService({ name: 'Financeiro', colorToken: 'blue', createdBy: 7 }),
    ).rejects.toThrow('A cor do rótulo deve estar no formato hexadecimal #RRGGBB.');
  });

  it('aborts the create when strict audit fails', async () => {
    vi.mocked(auditMock.logAuditAction).mockRejectedValueOnce(new Error('audit unavailable'));

    await expect(
      createLabelService({ name: 'Financeiro', colorToken: '#123456', createdBy: 7 }),
    ).rejects.toThrow('audit unavailable');
    expect(dbMock.transaction).toHaveBeenCalled();
  });

  it('deactivates a label and audits inside the transaction', async () => {
    const result = await deactivateLabelService({ id: 7, actorId: 9 });

    expect(result).toMatchObject({ id: 7, active: false });
    expect(labelRepositoryMocks.deactivateLabel).toHaveBeenCalledWith(7, txMock);
    expect(auditMock.logAuditAction).toHaveBeenCalledWith({
      adminId: 9,
      action: 'activity_label_deactivated',
      entityType: 'activity',
      entityId: 7,
      changes: { new: { active: false } },
      executor: txMock,
    });
  });

  it('rejects assigning a label when the activity does not exist', async () => {
    vi.mocked(repositoryMocks.findActivityById).mockResolvedValue(null);

    await expect(
      addLabelToActivityService({ activityId: 999, labelId: 7, actorId: 9 }),
    ).rejects.toThrow('Atividade não encontrado.');
    expect(labelRepositoryMocks.assignLabelToActivity).not.toHaveBeenCalled();
    expect(auditMock.logAuditAction).not.toHaveBeenCalled();
  });

  it('rejects assigning an inactive label', async () => {
    vi.mocked(labelRepositoryMocks.findActiveLabels).mockResolvedValue([]);

    await expect(
      addLabelToActivityService({ activityId: 42, labelId: 7, actorId: 9 }),
    ).rejects.toThrow('O rótulo não está ativo.');
    expect(labelRepositoryMocks.assignLabelToActivity).not.toHaveBeenCalled();
  });

  it('assigns an active label and audits with the transaction executor', async () => {
    const result = await addLabelToActivityService({ activityId: 42, labelId: 7, actorId: 9 });

    expect(result).toEqual(MOCK_ASSIGNMENT);
    expect(repositoryMocks.findActivityById).toHaveBeenCalledWith(42, txMock);
    expect(labelRepositoryMocks.findActiveLabels).toHaveBeenCalledWith(txMock);
    expect(labelRepositoryMocks.assignLabelToActivity).toHaveBeenCalledWith(42, 7, 9, txMock);
    expect(auditMock.logAuditAction).toHaveBeenCalledWith({
      adminId: 9,
      action: 'activity_label_added',
      entityType: 'activity',
      entityId: 42,
      changes: { new: { labelId: 7 } },
      executor: txMock,
    });
    expect(outboxMock.emitDomainEvent).toHaveBeenCalledWith(
      {
        type: 'activity.label_added',
        entityType: 'activity',
        entityId: 42,
        actorAdminId: 9,
        payload: { activityId: 42, labelId: 7 },
      },
      txMock,
    );
  });

  it('removes a label assignment and audits the removal in the transaction', async () => {
    const result = await removeLabelFromActivityService({ activityId: 42, labelId: 7, actorId: 9 });

    expect(result).toEqual(MOCK_ASSIGNMENT);
    expect(labelRepositoryMocks.removeLabelFromActivity).toHaveBeenCalledWith(42, 7, txMock);
    expect(auditMock.logAuditAction).toHaveBeenCalledWith({
      adminId: 9,
      action: 'activity_label_removed',
      entityType: 'activity',
      entityId: 42,
      changes: { new: { labelId: 7 } },
      executor: txMock,
    });
    expect(outboxMock.emitDomainEvent).toHaveBeenCalledWith(
      {
        type: 'activity.label_removed',
        entityType: 'activity',
        entityId: 42,
        actorAdminId: 9,
        payload: { activityId: 42, labelId: 7 },
      },
      txMock,
    );
  });

  it('lists active labels', async () => {
    await expect(listLabelsService()).resolves.toEqual([MOCK_LABEL]);
    expect(labelRepositoryMocks.findActiveLabels).toHaveBeenCalledWith();
  });
});
