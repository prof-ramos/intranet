import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/notifications/repository', () => ({
  createNotification: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { requestDataDownload, requestAccountDeletion } from './actions';
import { getSession } from '@/lib/auth/session';
import { createNotification } from '@/lib/notifications/repository';

const mockGetSession = vi.mocked(getSession);
const mockCreateNotification = vi.mocked(createNotification);

function setupDbMocks(activityId: number, adminIds: number[] = [10, 20]) {
  mockReturning.mockResolvedValue([{ id: activityId }]);
  mockWhere.mockResolvedValue(adminIds.map((id) => ({ id })));
}

describe('requestDataDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria atividade com tags ["LGPD", "Acesso"] e prioridade "alta"', async () => {
    mockGetSession.mockResolvedValue({ userId: 5 } as Awaited<ReturnType<typeof getSession>>);
    setupDbMocks(42);

    await requestDataDownload();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['LGPD', 'Acesso'],
        priority: 'alta',
        status: 'a_fazer',
      }),
    );
  });

  it('dispara notificação para admins', async () => {
    mockGetSession.mockResolvedValue({ userId: 5 } as Awaited<ReturnType<typeof getSession>>);
    setupDbMocks(42);

    await requestDataDownload();

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lgpd_request',
        entityType: 'activity',
        entityId: 42,
      }),
    );
  });

  it('não notifica o próprio ator', async () => {
    mockGetSession.mockResolvedValue({ userId: 10 } as Awaited<ReturnType<typeof getSession>>);
    setupDbMocks(42);

    await requestDataDownload();

    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 20 }),
    );
  });

  it('lança erro com sessão inválida', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requestDataDownload()).rejects.toThrow('Unauthorized');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});

describe('requestAccountDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria atividade com tags ["LGPD", "Exclusão"] e prioridade "urgente"', async () => {
    mockGetSession.mockResolvedValue({ userId: 5 } as Awaited<ReturnType<typeof getSession>>);
    setupDbMocks(99);

    await requestAccountDeletion();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['LGPD', 'Exclusão'],
        priority: 'urgente',
        status: 'a_fazer',
      }),
    );
  });

  it('dispara notificação para admins', async () => {
    mockGetSession.mockResolvedValue({ userId: 5 } as Awaited<ReturnType<typeof getSession>>);
    setupDbMocks(99);

    await requestAccountDeletion();

    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'lgpd_request',
        entityType: 'activity',
        entityId: 99,
      }),
    );
  });

  it('lança erro com sessão inválida', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(requestAccountDeletion()).rejects.toThrow('Unauthorized');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
