// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

vi.mock('next/navigation', () => ({ usePathname: () => '/app' }));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span aria-label={alt} />,
}));
vi.mock('@/components/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Sair</button>,
}));

afterEach(cleanup);

describe('Sidebar', () => {
  it('hides financeiro and email triage from the operator navigation', () => {
    render(<Sidebar user={{ name: 'Ana Silva', role: 'admin' }} />);

    expect(screen.getByText('Operação')).toBeDefined();
    expect(screen.getByText('Cadastro')).toBeDefined();
    expect(screen.getByText('Gestão')).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Triagem de E-mails' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Financeiro' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Jurídico' })).toBeDefined();
  });

  it('keeps management-only entries hidden from secretaria', () => {
    render(<Sidebar user={{ name: 'Bia Costa', role: 'secretaria' }} />);

    expect(screen.queryByRole('button', { name: 'Financeiro' })).toBeNull();
    expect(screen.queryByText('Relatórios')).toBeNull();
    expect(screen.getByText('Privacidade')).toBeDefined();
  });
});
