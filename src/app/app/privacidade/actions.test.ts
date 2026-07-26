import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateNotification = vi.fn().mockResolvedValue({ id: 1 });
const mockRevalidatePath = vi.fn();
const mockSession =
  vi.fn<() => { userId: number; role: string; name: string; email: string } | null>();
const mockFindAdminRecipientIds = vi.fn();
const mockCreateActivityService = vi.fn();

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: () => {
    const session = mockSession();
    if (!session) throw new Error('Unauthorized');
    return session;
  },
}));

vi.mock('@/lib/auth/service', () => ({
  findAdminRecipientIds: (...args: unknown[]) => mockFindAdminRecipientIds(...args),
}));

vi.mock('@/lib/notifications/repository', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

vi.mock('@/lib/activities/service', () => ({
  createActivityService: (...args: unknown[]) => mockCreateActivityService(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { requestDataDownload, requestAccountDeletion } from './actions';

describe('privacidade actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateActivityService.mockResolvedValue({ id: 42 });
    mockFindAdminRecipientIds.mockResolvedValue([1, 2]);
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

      expect(mockCreateActivityService).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Requisição LGPD: Baixar Dados',
          priority: 'alta',
          tags: ['LGPD', 'Acesso'],
          createdBy: 7,
        }),
      );
    });

    it('notifies all admin/secretaria recipients except the actor', async () => {
      await requestDataDownload();

      expect(mockFindAdminRecipientIds).toHaveBeenCalledWith(['admin', 'secretaria']);
      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 1,
          actorId: 7,
          entityId: 42,
        }),
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        2,
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
    it('creates activity with LGPD/Exclusao tags (ASCII-safe) and urgente priority', async () => {
      await requestAccountDeletion();

      expect(mockCreateActivityService).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Solicitação de Exclusão - Direito ao Esquecimento',
          priority: 'urgente',
          tags: ['LGPD', 'Exclusao'],
          createdBy: 7,
        }),
      );
    });

    it('notifies admin/secretaria recipients except the actor', async () => {
      await requestAccountDeletion();

      expect(mockCreateNotification).toHaveBeenCalledTimes(2);
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'lgpd_request',
          href: '/app/atividades',
          entityType: 'activity',
          userId: 1,
          actorId: 7,
          entityId: 42,
        }),
      );
      expect(mockCreateNotification).toHaveBeenNthCalledWith(
        2,
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
      expect(mockCreateActivityService).not.toHaveBeenCalled();
    });

    it('throws Unauthorized when session is null for requestAccountDeletion', async () => {
      mockSession.mockReturnValue(null);

      await expect(requestAccountDeletion()).rejects.toThrow('Unauthorized');
      expect(mockCreateActivityService).not.toHaveBeenCalled();
    });
  });
});
