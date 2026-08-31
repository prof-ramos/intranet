// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DashboardDispatchStrip } from './DashboardDispatchStrip';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('DashboardDispatchStrip', () => {
  it('opens an overdue activity and identifies an unassigned item', () => {
    render(
      <DashboardDispatchStrip
        urgentActivities={[
          {
            id: 7,
            title: 'Cobrar retorno',
            priority: 'urgente',
            dueDate: '2026-05-20',
            assigneeName: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Responsável: Sem responsável')).toBeDefined();
    expect(screen.getByText('Cobrar retorno').closest('a')?.getAttribute('href')).toBe(
      '/app/atividades?dueLate=1&open=7',
    );
  });

  it('renders an explicit empty state', () => {
    render(<DashboardDispatchStrip urgentActivities={[]} />);

    expect(screen.getByText('Nenhuma atividade vencida no momento.')).toBeDefined();
  });
});
