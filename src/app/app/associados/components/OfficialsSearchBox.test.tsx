/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficialsSearchBox } from './OfficialsSearchBox';

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/app/associados',
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.searchParams,
}));

vi.mock('lucide-react', () => ({
  Search: () => null,
  X: () => null,
}));

afterEach(cleanup);

beforeEach(() => {
  navigation.replace.mockReset();
  navigation.searchParams = new URLSearchParams('associationStatus=associado');
});

describe('OfficialsSearchBox', () => {
  it('keeps name search as the default and does not put searchBy in the URL', async () => {
    render(<OfficialsSearchBox initialQuery="" initialSearchBy="name" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar oficial' }), {
      target: { value: 'Ana' },
    });

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        '/app/associados?associationStatus=associado&q=Ana',
        {
          scroll: false,
        },
      );
    });
  });

  it('preserves searchBy=siape and existing filters instead of deleting the mode', async () => {
    navigation.searchParams = new URLSearchParams('associationStatus=associado&searchBy=siape');
    render(<OfficialsSearchBox initialQuery="" initialSearchBy="siape" />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar oficial' }), {
      target: { value: '1234567' },
    });

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        '/app/associados?associationStatus=associado&searchBy=siape&q=1234567',
        { scroll: false },
      );
    });
  });

  it('switches to CPF, clears the previous name query, and keeps filters', async () => {
    navigation.searchParams = new URLSearchParams('q=Ana&associationStatus=associado');
    render(<OfficialsSearchBox initialQuery="Ana" initialSearchBy="name" />);

    fireEvent.click(screen.getByRole('radio', { name: 'CPF' }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        '/app/associados?associationStatus=associado&searchBy=cpf',
        { scroll: false },
      );
    });
    expect(
      (screen.getByRole('searchbox', { name: 'Pesquisar oficial' }) as HTMLInputElement).value,
    ).toBe('');
    expect(screen.getByText(/CPF completo/)).toBeTruthy();
  });
});
