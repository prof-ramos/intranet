import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { emitDomainEvent } from '@/lib/integrations/outbox';

const insertChain = vi.hoisted(() => ({
  returning: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: insertChain.insert,
  },
}));

describe('emitDomainEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertChain.returning.mockResolvedValue([{ id: 1 }]);
    insertChain.values.mockReturnValue({ returning: insertChain.returning });
    insertChain.insert.mockReturnValue({ values: insertChain.values });
  });

  it('sanitizes supported values before persisting a valid payload', async () => {
    await emitDomainEvent({
      type: 'legal_consultation.created',
      entityType: 'legal_consultation',
      entityId: 10,
      actorAdminId: 1,
      payload: {
        internalNumber: 'JUR-2026-010',
        status: 'aberta',
        associateId: null,
        slaDueDate: new Date('2026-05-20T12:00:00.000Z').toISOString(),
        title: 'Consulta',
        links: {
          app: '/app/juridico/consultas/10',
        },
      },
    });

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          internalNumber: 'JUR-2026-010',
          status: 'aberta',
          associateId: null,
          slaDueDate: '2026-05-20T12:00:00.000Z',
          title: 'Consulta',
          links: {
            app: '/app/juridico/consultas/10',
          },
        },
      }),
    );
  });

  it('rejects payloads with fields outside the event contract', async () => {
    await expect(
      emitDomainEvent({
        type: 'official_letter.created',
        entityType: 'official_letter',
        entityId: 12,
        actorAdminId: 1,
        payload: {
          number: 'Ofício nº 001/2026-ASOF',
          status: 'gerado',
          year: 2026,
          sequence: 1,
          links: {
            app: '/app/secretaria/oficios/12',
          },
          extra: 'should-fail',
        } as never,
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
