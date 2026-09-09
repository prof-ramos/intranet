// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WebMcpRegistry } from './WebMcpRegistry';

const usePathnameMock = vi.hoisted(() => vi.fn(() => '/app'));
const registerToolsMock = vi.hoisted(() => vi.fn().mockResolvedValue(0));
const buildSecretariaToolsMock = vi.hoisted(() =>
  vi.fn((_router?: unknown, _context?: unknown) => [
    { name: 'global-search', description: 'x', execute: async () => ({}) },
    { name: 'add-dependent', description: 'y', execute: async () => ({}) },
    { name: 'generate-institutional-email', description: 'z', execute: async () => ({}) },
    { name: 'open-activities', description: 'a', execute: async () => ({}) },
    { name: 'complete-activity', description: 'b', execute: async () => ({}) },
  ]),
);

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/webmcp/build-tools', () => ({
  buildSecretariaTools: (router: unknown, context?: unknown) =>
    buildSecretariaToolsMock(router, context),
}));

vi.mock('@/lib/webmcp/register', () => ({
  registerTools: (...args: unknown[]) => registerToolsMock(...args),
}));

describe('WebMcpRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/app');
  });

  afterEach(cleanup);

  it('registers only tools allowed for the current role and path', async () => {
    render(<WebMcpRegistry role="diretoria" />);

    await vi.waitFor(() => {
      expect(registerToolsMock).toHaveBeenCalled();
    });

    const [tools] = registerToolsMock.mock.calls[0] as [{ name: string }[]];
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('global-search');
    expect(names).toContain('open-activities');
    expect(names).toContain('complete-activity');
    expect(names).not.toContain('generate-institutional-email');
    expect(names).not.toContain('add-dependent');
  });

  it('registers activity tools for secretaria on the atividades board', async () => {
    usePathnameMock.mockReturnValue('/app/atividades');
    render(<WebMcpRegistry role="secretaria" />);

    await vi.waitFor(() => {
      expect(registerToolsMock).toHaveBeenCalled();
    });

    const [tools] = registerToolsMock.mock.calls[0] as [{ name: string }[]];
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('open-activities');
    expect(names).toContain('complete-activity');
  });

  it('passes the open official id into the tool builder on the ficha', async () => {
    usePathnameMock.mockReturnValue('/app/associados/15');
    render(<WebMcpRegistry role="secretaria" />);

    await vi.waitFor(() => {
      expect(buildSecretariaToolsMock).toHaveBeenCalled();
    });

    expect(buildSecretariaToolsMock.mock.calls[0]?.[1]).toEqual({ officialId: 15 });
  });
});
