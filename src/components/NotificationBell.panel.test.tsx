/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from './NotificationBell';
import {
  listNotificationsAction,
  markNotificationReadAction,
} from '@/app/app/notifications/actions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/app/notifications/actions', () => ({
  listNotificationsAction: vi.fn(),
  markAllNotificationsReadAction: vi.fn(),
  markNotificationReadAction: vi.fn(),
}));

const sampleNotification = {
  id: 12,
  title: 'Atividade atribuída',
  message: 'Você recebeu uma atividade',
  createdAt: '2026-05-17T10:00:00.000Z',
  href: '/app/atividades?open=12',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('NotificationBell panel', () => {
  it('keeps the list and shows a banner when markAsRead fails', async () => {
    vi.mocked(listNotificationsAction).mockResolvedValue({
      notifications: [sampleNotification],
    } as unknown as Awaited<ReturnType<typeof listNotificationsAction>>);
    vi.mocked(markNotificationReadAction).mockRejectedValue(new Error('boom'));

    render(<NotificationBell userId={1} />);

    fireEvent.click(screen.getByTestId('notification-bell'));

    await waitFor(() => {
      expect(screen.getByText('Atividade atribuída')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Atividade atribuída/ }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Não foi possível marcar a notificação como lida.',
      );
    });

    expect(screen.getByRole('dialog', { name: 'Painel de notificações' })).toBeDefined();
    expect(screen.getByText('Atividade atribuída')).toBeDefined();
  });

  it('focuses the trigger when the panel opens from the lazy wrapper', async () => {
    vi.mocked(listNotificationsAction).mockResolvedValue({
      notifications: [],
    } as unknown as Awaited<ReturnType<typeof listNotificationsAction>>);

    render(<NotificationBell userId={1} defaultOpen />);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Painel de notificações' })).toBeDefined();
    });

    expect(document.activeElement).toBe(screen.getByTestId('notification-bell'));
  });

  it('shows a full error only when the list is empty', async () => {
    vi.mocked(listNotificationsAction).mockRejectedValue(new Error('offline'));

    render(<NotificationBell userId={1} />);
    fireEvent.click(screen.getByTestId('notification-bell'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Não foi possível carregar as notificações.',
      );
    });

    expect(screen.queryByText('Nenhuma notificação encontrada.')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
  });
});
