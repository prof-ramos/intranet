/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './error';

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(),
  })),
}));

describe('src/app/app/juridico/error.tsx', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('renders the configured title, message and recovery button', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };
    render(<ErrorBoundary error={error} reset={reset} />);
    expect(screen.getByRole('heading', { name: 'Erro no módulo jurídico' })).toBeDefined();
    expect(screen.getByText('Não foi possível carregar esta seção. Verifique sua conexão e tente novamente.')).toBeDefined();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeDefined();
  });

  it('invokes reset when "Tentar novamente" is clicked', () => {
    const reset = vi.fn();
    const error = new Error('route blew up') as Error & { digest?: string };
    render(<ErrorBoundary error={error} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
