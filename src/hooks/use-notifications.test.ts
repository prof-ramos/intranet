/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useNotifications } from './use-notifications';
import {
  listNotificationsAction,
} from '@/app/app/notifications/actions';

// Mock the actions
vi.mock('@/app/app/notifications/actions', () => ({
  listNotificationsAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('refresh()', () => {
    it('handles successful notification loading', async () => {
      // Setup mock to return some dummy data
      vi.mocked(listNotificationsAction).mockResolvedValueOnce({
        notifications: [
          { id: '1', title: 'Test 1', createdAt: '2026-05-17T10:00:00.000Z' },
        ],
      } as unknown as Awaited<ReturnType<typeof listNotificationsAction>>);

      const { result } = renderHook(() => useNotifications({ userId: 1 }));

      // Initial load in useEffect will trigger, we await it
      await act(async () => {
        // give useEffect time to resolve
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Now test the actual refresh method
      vi.mocked(listNotificationsAction).mockResolvedValueOnce({
        notifications: [
          { id: '1', title: 'Test 1', createdAt: '2026-05-17T10:00:00.000Z' },
          { id: '2', title: 'Test 2', createdAt: '2026-05-17T11:00:00.000Z' },
        ],
      } as unknown as Awaited<ReturnType<typeof listNotificationsAction>>);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.notifications).toHaveLength(2);
    });

    it('sets error state when loadNotifications throws in refresh', async () => {
      // First, let the initial load succeed or fail so we can test just refresh
      vi.mocked(listNotificationsAction).mockResolvedValueOnce({ notifications: [] } as unknown as Awaited<ReturnType<typeof listNotificationsAction>>);

      const { result } = renderHook(() => useNotifications({ userId: 1 }));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Now mock it to reject for the refresh call
      vi.mocked(listNotificationsAction).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Não foi possível carregar as notificações.');
      expect(result.current.loading).toBe(false);
    });
  });
});
