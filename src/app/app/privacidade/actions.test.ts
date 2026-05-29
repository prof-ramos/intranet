import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateNotification = vi.fn().mockResolvedValue({ id: 1 });
const mockRevalidatePath = vi.fn();
const mockSession = vi.fn<() => { userId: number; role: string; name: string; email: string } | null>();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: () => mockSession(),
}));

vi.mock('@/lib/notifications/repository', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { requestDataDownload, requestAccountDeletion } from './actions';

function setupSelectResult(rows: { id: number }[]) {
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue(rows);
}

function setupInsertResult(rows: { id: number }[]) {
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockResolvedValue(rows);
}

describe('privacidade actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupInsertResult([{ id: 42 }]);
    setupSelectResult([{ id: 1 }, { id: 2 }]);
    mockSession.mockReturnValue({
      userId: 7,
      role: 'admin',
      name: 'Admin',
      email: 'admin@asof.local',
    });
  });

  describe('requestDataDownload', () => {
    it('creates activity with LGPD/Acesso tags and alta priority', async () => {
      await requestDataDownload();

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Requisição LGPD: Baixar Dados',
          priority: 'alta',
          tags: ['LGPD', 'Acesso'],
          createdBy: 7,
        }),
      );
      expect(mockReturning).toHaveBeenCalledWith({ id: expect.anything() });
    });

    it('notifies all admin/secretaria recipients except the actor', async () => {
      await requestDataDownload();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 1,
          actorId: 7,
          entityId: 42,
        }),
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 2,
          actorId: 7,
          entityId: 42,
        }),
      );
    });

    it('revalidates the privacidade path', async () => {
      await requestDataDownload();

      expect(mockRevalidatePath).toHaveBeenCalledWith('/app/privacidade');
    });
  });

  describe('requestAccountDeletion', () => {
    it('creates activity with LGPD/Exclusão tags and urgente priority', async () => {
      await requestAccountDeletion();

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Solicitação de Exclusão - Direito ao Esquecimento',
          priority: 'urgente',
          tags: ['LGPD', 'Exclusão'],
          createdBy: 7,
        }),
      );
    });

    it('notifies admin/secretaria recipients except the actor', async () => {
      await requestAccountDeletion();

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 1,
          actorId: 7,
          entityId: 42,
        }),
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 2,
          actorId: 7,
          entityId: 42,
        }),
      );
    });

    it('revalidates the privacidade path', async () => {
      await requestAccountDeletion();

      expect(mockRevalidatePath).toHaveBeenCalledWith('/app/privacidade');
    });
  });

  describe('auth', () => {
    it('throws Unauthorized when session is null for requestDataDownload', async () => {
      mockSession.mockReturnValue(null);

      await expect(requestDataDownload()).rejects.toThrow('Unauthorized');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when session is null for requestAccountDeletion', async () => {
      mockSession.mockReturnValue(null);

      await expect(requestAccountDeletion()).rejects.toThrow('Unauthorized');
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});
