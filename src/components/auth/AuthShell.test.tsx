// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AuthShell } from './AuthShell';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));

afterEach(cleanup);

describe('AuthShell', () => {
  it('renders logo, intranet eyebrow, title and main-content landmark', () => {
    render(
      <AuthShell title="Acesso restrito">
        <p>Form content</p>
      </AuthShell>,
    );

    expect(screen.getByRole('main').id).toBe('main-content');
    expect(screen.getByRole('heading', { level: 1, name: 'ASOF' })).toBeDefined();
    expect(screen.getByLabelText(/ASOF/)).toBeDefined();
    expect(screen.getByText('Intranet')).toBeDefined();
    expect(screen.getByText('Acesso restrito')).toBeDefined();
    expect(screen.getByText('Form content')).toBeDefined();
  });
});
