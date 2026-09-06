import { describe, expect, it, vi } from 'vitest';
import { processNotificationClick } from './NotificationBell';

describe('processNotificationClick', () => {
  it('marks as read, navigates to safe internal href, and closes the panel', async () => {
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    const close = vi.fn();

    const navigated = await processNotificationClick({
      notificationId: 12,
      href: '/app/atividades?open=12',
      markAsRead,
      navigate,
      close,
    });

    expect(navigated).toBe(true);
    expect(markAsRead).toHaveBeenCalledWith(12);
    expect(navigate).toHaveBeenCalledWith('/app/atividades?open=12');
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not navigate to unsafe hrefs but still closes after successful read', async () => {
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    const close = vi.fn();

    const navigated = await processNotificationClick({
      notificationId: 12,
      href: 'https://example.com',
      markAsRead,
      navigate,
      close,
    });

    expect(navigated).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not navigate to slash-backslash hosts', async () => {
    const markAsRead = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();
    const close = vi.fn();

    const navigated = await processNotificationClick({
      notificationId: 12,
      href: '/\\evil.example',
      markAsRead,
      navigate,
      close,
    });

    expect(navigated).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('does not navigate or close when markAsRead fails', async () => {
    const markAsRead = vi.fn().mockRejectedValue(new Error('boom'));
    const navigate = vi.fn();
    const close = vi.fn();

    await expect(
      processNotificationClick({
        notificationId: 12,
        href: '/app/atividades?open=12',
        markAsRead,
        navigate,
        close,
      }),
    ).rejects.toThrow('boom');

    expect(navigate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
