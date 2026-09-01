/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { isNavLinkActive, NavLink } from './NavLink';

const usePathnameMock = vi.hoisted(() => vi.fn(() => '/app'));

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

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

afterEach(() => {
  cleanup();
  usePathnameMock.mockReturnValue('/app');
});

describe('isNavLinkActive', () => {
  it('marks Dashboard only on /app', () => {
    expect(isNavLinkActive('/app', '/app')).toBe(true);
    expect(isNavLinkActive('/app/associados', '/app')).toBe(false);
    expect(isNavLinkActive('/app/atividades', '/app')).toBe(false);
  });

  it('marks Oficiais on cadastro routes but not on Relatórios', () => {
    const exclude = ['/app/associados/relatorio'];
    expect(isNavLinkActive('/app/associados', '/app/associados', exclude)).toBe(true);
    expect(isNavLinkActive('/app/associados/novo', '/app/associados', exclude)).toBe(true);
    expect(isNavLinkActive('/app/associados/42', '/app/associados', exclude)).toBe(true);
    expect(isNavLinkActive('/app/associados/relatorio', '/app/associados', exclude)).toBe(false);
  });

  it('marks Relatórios only on its own route', () => {
    expect(isNavLinkActive('/app/associados/relatorio', '/app/associados/relatorio')).toBe(true);
    expect(isNavLinkActive('/app/associados', '/app/associados/relatorio')).toBe(false);
    expect(isNavLinkActive('/app/associados/42', '/app/associados/relatorio')).toBe(false);
  });
});

describe('NavLink', () => {
  it('sets aria-current only on the matching item', () => {
    usePathnameMock.mockReturnValue('/app/associados/relatorio');
    const { getByRole } = render(
      <nav>
        <NavLink href="/app/associados" exclude={['/app/associados/relatorio']} icon={<span />}>
          Oficiais
        </NavLink>
        <NavLink href="/app/associados/relatorio" icon={<span />}>
          Relatórios
        </NavLink>
      </nav>,
    );

    expect(getByRole('link', { name: 'Oficiais' }).getAttribute('aria-current')).toBeNull();
    expect(getByRole('link', { name: 'Relatórios' }).getAttribute('aria-current')).toBe('page');
  });
});
