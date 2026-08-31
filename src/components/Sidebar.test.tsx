// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

const usePathnameMock = vi.hoisted(() => vi.fn(() => '/app'));

vi.mock('next/navigation', () => ({ usePathname: () => usePathnameMock() }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));
vi.mock('@/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Sair</button>,
}));

beforeEach(() => {
  usePathnameMock.mockReturnValue('/app');
});

afterEach(cleanup);

describe('Sidebar', () => {
  it('groups navigation by operational purpose without changing role-based links', () => {
    render(<Sidebar user={{ name: 'Ana Silva', role: 'admin' }} />);

    expect(screen.getByText('Operação')).toBeDefined();
    expect(screen.getByText('Cadastro')).toBeDefined();
    expect(screen.getByText('Gestão')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Triagem de E-mails' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Financeiro' })).toBeDefined();
  });

  it('marks Relatórios as current on the export route without marking Oficiais', () => {
    usePathnameMock.mockReturnValue('/app/associados/relatorio');
    render(<Sidebar user={{ name: 'Ana Silva', role: 'admin' }} />);

    expect(screen.getByRole('link', { name: 'Oficiais' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: 'Relatórios' }).getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('marks Oficiais as current on cadastro routes', () => {
    usePathnameMock.mockReturnValue('/app/associados/novo');
    render(<Sidebar user={{ name: 'Ana Silva', role: 'admin' }} />);

    expect(screen.getByRole('link', { name: 'Oficiais' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Relatórios' }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('keeps management-only entries hidden from secretaria', () => {
    render(<Sidebar user={{ name: 'Bia Costa', role: 'secretaria' }} />);

    expect(screen.queryByRole('button', { name: 'Financeiro' })).toBeNull();
    expect(screen.queryByText('Relatórios')).toBeNull();
    expect(screen.getByText('Privacidade')).toBeDefined();
  });
});
