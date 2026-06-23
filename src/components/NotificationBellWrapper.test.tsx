/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationBellWrapper } from './NotificationBellWrapper';

vi.mock('./NotificationBell', () => ({
  NotificationBell: ({ userId }: { userId: number }) => (
    <div data-testid="notification-bell-stub" data-userid={String(userId)} />
  ),
}));

describe('NotificationBellWrapper', () => {
  it('renders the bell wrapper and forwards userId to NotificationBell', () => {
    render(<NotificationBellWrapper userId={42} />);
    const wrapper = screen.getByTestId('notification-bell-wrapper');
    const bell = screen.getByTestId('notification-bell-stub');
    expect(wrapper).not.toBeNull();
    expect(bell.getAttribute('data-userid')).toBe('42');
  });
});
