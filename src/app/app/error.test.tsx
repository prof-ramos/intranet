/**
 * @vitest-environment jsdom
 *
 * Template test for Next.js route-level `error.tsx` boundaries.
 * Each route's error.tsx is built via `createErrorBoundary` from
 * `@/components/ErrorBoundary` and receives `error` + `reset` props
 * from the Next.js App Router. This test asserts that the route's
 * boundary renders its configured copy and wires the reset callback
 * to the "Tentar novamente" button. Copy this file for other routes
 * and adjust the expected title/message.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './error';

// Stub the logger so the boundary's useEffect doesn't write structured
// logs to stdout during the test run.
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('src/app/app/error.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the configured title, message and recovery button', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };

    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeDefined();
    expect(
      screen.getByText(
        'Ocorreu um erro inesperado ao carregar esta página. Tente novamente ou entre em contato com o suporte se o problema persistir.',
      ),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeDefined();
  });

  it('renders the digest when present', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };
    error.digest = 'route-digest-9';

    render(<ErrorBoundary error={error} reset={reset} />);

    expect(screen.getByText('Código: route-digest-9')).toBeDefined();
  });

  it('invokes reset when "Tentar novamente" is clicked', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };

    render(<ErrorBoundary error={error} reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });
});