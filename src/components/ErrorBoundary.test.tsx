/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AlertTriangle } from 'lucide-react';
import { createErrorBoundary } from '@/components/ErrorBoundary';

// Stub the logger so tests don't write structured logs to stdout and so
// logger.error is observable for assertions.
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

// toSafeErrorLog is a pure helper; keep the real implementation so the
// boundary exercises the same code path as production.
// No mock for @/lib/error-log needed.

function makeBoundary(overrides?: Parameters<typeof createErrorBoundary>[0]) {
  return createErrorBoundary({
    icon: AlertTriangle,
    title: 'Algo deu errado',
    message: 'Ocorreu um erro inesperado.',
    logMessage: 'Test error boundary caught',
    loggerName: 'test:error',
    ...overrides,
  });
}

describe('createErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering the fallback UI', () => {
    it('renders the configured title, message and "Tentar novamente" button', () => {
      const Boundary = makeBoundary();
      const reset = vi.fn();
      const error = new Error('boom') as Error & { digest?: string };

      render(<Boundary error={error} reset={reset} />);

      expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeDefined();
      expect(screen.getByText('Ocorreu um erro inesperado.')).toBeDefined();
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeDefined();
    });

    it('renders the digest code when the error carries one', () => {
      const Boundary = makeBoundary();
      const reset = vi.fn();
      const error = new Error('boom') as Error & { digest?: string };
      error.digest = 'abc-123';

      render(<Boundary error={error} reset={reset} />);

      expect(screen.getByText('Código: abc-123')).toBeDefined();
    });

    it('omits the digest block when the error has no digest', () => {
      const Boundary = makeBoundary();
      const reset = vi.fn();
      const error = new Error('boom') as Error & { digest?: string };

      render(<Boundary error={error} reset={reset} />);

      expect(screen.queryByText(/^Código:/)).toBeNull();
    });
  });

  describe('recovery', () => {
    it('calls reset when the "Tentar novamente" button is clicked', () => {
      const Boundary = makeBoundary();
      const reset = vi.fn();
      const error = new Error('boom') as Error & { digest?: string };

      render(<Boundary error={error} reset={reset} />);

      fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('re-renders with fresh props when reset replaces the error (remount via key)', () => {
      const Boundary = makeBoundary();
      const firstError = new Error('first') as Error & { digest?: string };
      firstError.digest = 'digest-1';
      const reset = vi.fn();

      const { rerender } = render(<Boundary error={firstError} reset={reset} />);
      expect(screen.getByText('Código: digest-1')).toBeDefined();

      // Simulate Next.js recovering the route: a new error replaces the old one
      // and the boundary is remounted with a new key.
      const secondError = new Error('second') as Error & { digest?: string };
      secondError.digest = 'digest-2';

      rerender(<Boundary key="recovered" error={secondError} reset={reset} />);

      expect(screen.queryByText('Código: digest-1')).toBeNull();
      expect(screen.getByText('Código: digest-2')).toBeDefined();
    });
  });
});