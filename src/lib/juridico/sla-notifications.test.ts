import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  rows: [] as Array<{
    id: number;
    internalNumber: string;
    title: string;
    slaDueDate: Date | null;
    createdBy: number | null;
  }>,
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  emitSlaWarning: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: queryMocks.select,
  },
}));

vi.mock('@/lib/db/schema', () => ({
  legalConsultations: {
    id: 'legal_consultations.id',
    internalNumber: 'legal_consultations.internal_number',
    title: 'legal_consultations.title',
    slaDueDate: 'legal_consultations.sla_due_date',
    createdBy: 'legal_consultations.created_by',
    status: 'legal_consultations.status',
  },
}));

vi.mock('@/lib/events', () => ({
  emitSlaWarning: (...args: unknown[]) => queryMocks.emitSlaWarning(...args),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: queryMocks.loggerError,
    info: queryMocks.loggerInfo,
  }),
}));

import { checkAndEmitSlaWarnings } from './sla-notifications';

describe('juridico sla notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMocks.rows = [];
    queryMocks.limit.mockImplementation(async () => queryMocks.rows);
    queryMocks.orderBy.mockReturnValue({ limit: queryMocks.limit });
    queryMocks.where.mockReturnValue({ orderBy: queryMocks.orderBy });
    queryMocks.from.mockReturnValue({ where: queryMocks.where });
    queryMocks.select.mockReturnValue({ from: queryMocks.from });
    queryMocks.emitSlaWarning.mockResolvedValue({ id: 99 });
  });

  it('bounds the due-soon scan and emits only rows with an SLA date and recipient', async () => {
    const dueDate = new Date('2026-05-22T12:00:00.000Z');
    queryMocks.rows = [
      {
        id: 1,
        internalNumber: 'JUR-2026-001',
        title: 'Consulta com SLA',
        slaDueDate: dueDate,
        createdBy: 7,
      },
      {
        id: 2,
        internalNumber: 'JUR-2026-002',
        title: 'Consulta sem data',
        slaDueDate: null,
        createdBy: 8,
      },
      {
        id: 3,
        internalNumber: 'JUR-2026-003',
        title: 'Consulta sem destinatario',
        slaDueDate: dueDate,
        createdBy: null,
      },
    ];

    const result = await checkAndEmitSlaWarnings({ limit: 2 });

    expect(queryMocks.limit).toHaveBeenCalledWith(2);
    expect(queryMocks.emitSlaWarning).toHaveBeenCalledTimes(1);
    expect(queryMocks.emitSlaWarning).toHaveBeenCalledWith({
      consultationId: 1,
      internalNumber: 'JUR-2026-001',
      title: 'Consulta com SLA',
      slaDueDate: '2026-05-22T12:00:00.000Z',
      recipientId: 7,
    });
    expect(result).toEqual({
      scanned: 3,
      eligible: 1,
      emitted: 1,
      skipped: 2,
      failed: 0,
      limit: 2,
      failures: [],
    });
  });

  it('reports and logs failed emissions without hiding successful ones', async () => {
    const dueDate = new Date('2026-05-22T12:00:00.000Z');
    queryMocks.rows = [
      {
        id: 10,
        internalNumber: 'JUR-2026-010',
        title: 'Primeira consulta',
        slaDueDate: dueDate,
        createdBy: 7,
      },
      {
        id: 11,
        internalNumber: 'JUR-2026-011',
        title: 'Segunda consulta',
        slaDueDate: dueDate,
        createdBy: 8,
      },
    ];
    queryMocks.emitSlaWarning
      .mockResolvedValueOnce({ id: 100 })
      .mockRejectedValueOnce(new Error('database unavailable'));

    const result = await checkAndEmitSlaWarnings();

    expect(queryMocks.limit).toHaveBeenCalledWith(50);
    expect(result).toMatchObject({
      scanned: 2,
      eligible: 2,
      emitted: 1,
      skipped: 0,
      failed: 1,
      limit: 50,
      failures: [{ consultationId: 11, reason: 'database unavailable' }],
    });
    expect(queryMocks.loggerError).toHaveBeenCalledWith(
      '[checkAndEmitSlaWarnings] failed to emit SLA warnings',
      expect.objectContaining({
        failed: 1,
        failures: [{ consultationId: 11, reason: 'database unavailable' }],
      }),
    );
  });
});
