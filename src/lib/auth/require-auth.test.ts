import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth/require-auth';

let mockSession: import('@/lib/auth/config').SessionData | null = null;
let mockDbError: Error | null = null;
const mockHeaders = new Map<string, string>();
const authConfigMock = vi.hoisted(() => ({
  isSkipAuthEnabled: vi.fn(() => false),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve(mockHeaders)),
}));

let mockDbAdmin: {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  isActive: boolean;
  mustChangePassword: boolean;
} | null = null;

vi.mock('react', () => ({ cache: (fn: unknown) => fn }));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`);
    (err as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${path};307`;
    throw err;
  }),
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock('@/lib/auth/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/config')>()),
  isSkipAuthEnabled: authConfigMock.isSkipAuthEnabled,
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() =>
            mockDbError
              ? Promise.reject(mockDbError)
              : Promise.resolve(mockDbAdmin ? [mockDbAdmin] : []),
          ),
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mockSession = null;
  mockDbError = null;
  mockDbAdmin = null;
  mockHeaders.clear();
  authConfigMock.isSkipAuthEnabled.mockReturnValue(false);
});

describe('requireAuth', () => {
  it('redirects to login when there is no session', async () => {
    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when the session is not logged in', async () => {
    mockSession = {
      userId: 1,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: false,
    };

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when the admin is not found in the database', async () => {
    mockSession = {
      userId: 999,
      name: 'Ghost',
      email: 'ghost@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = null;

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('redirects to login when the admin is inactive', async () => {
    mockSession = {
      userId: 2,
      name: 'Inactive',
      email: 'inactive@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 2,
      name: 'Inactive',
      email: 'inactive@asof.local',
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    };

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('does not bypass active-admin revalidation in production when SKIP_AUTH is set', async () => {
    const { isSkipAuthEnabled: realIsSkipAuthEnabled } =
      await vi.importActual<typeof import('@/lib/auth/config')>('@/lib/auth/config');
    authConfigMock.isSkipAuthEnabled.mockImplementation(() => realIsSkipAuthEnabled());
    vi.stubEnv('SKIP_AUTH', 'true');
    vi.stubEnv('NODE_ENV', 'production');
    mockSession = {
      userId: 2,
      name: 'Inactive',
      email: 'inactive@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 2,
      name: 'Inactive',
      email: 'inactive@asof.local',
      role: 'admin',
      isActive: false,
      mustChangePassword: false,
    };

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(authConfigMock.isSkipAuthEnabled).toHaveBeenCalled();
    expect(authConfigMock.isSkipAuthEnabled.mock.results.at(-1)?.value).toBe(false);
  });

  it('fails with an actionable error when the configured development admin is missing', async () => {
    authConfigMock.isSkipAuthEnabled.mockReturnValue(true);
    mockSession = {
      userId: 42,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = null;

    await expect(requireAuth()).rejects.toThrow(
      'Development admin 42 is unavailable. Run npm run db:seed:dev before starting the app.',
    );
  });

  it('returns the database-backed development admin when skip-auth is enabled', async () => {
    authConfigMock.isSkipAuthEnabled.mockReturnValue(true);
    mockSession = {
      userId: 42,
      name: 'Stale Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 42,
      name: 'ASOF Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    };

    await expect(requireAuth()).resolves.toEqual({
      userId: 42,
      name: 'ASOF Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
    });
  });

  it('rejects a development admin whose persisted email differs from the configured actor', async () => {
    authConfigMock.isSkipAuthEnabled.mockReturnValue(true);
    mockSession = {
      userId: 42,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 42,
      name: 'Unrelated Admin',
      email: 'other@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    };

    await expect(requireAuth()).rejects.toThrow(
      'Development admin 42 does not match DEV_USER_EMAIL. Run npm run db:seed:dev before starting the app.',
    );
  });

  it('rejects a development admin whose persisted role exceeds the configured role', async () => {
    authConfigMock.isSkipAuthEnabled.mockReturnValue(true);
    mockSession = {
      userId: 42,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'secretaria',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 42,
      name: 'Dev User',
      email: 'dev@asof.local',
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    };

    await expect(requireAuth()).rejects.toThrow(
      'Development admin 42 does not match DEV_USER_ROLE. Run npm run db:seed:dev before starting the app.',
    );
  });

  it('returns the authenticated user from the database (not stale session data)', async () => {
    mockSession = {
      userId: 7,
      name: 'Stale Name',
      email: 'stale@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: false,
    };

    await expect(requireAuth()).resolves.toEqual({
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
    });
  });

  it('redirects to /change-password when user must change password and not on change page', async () => {
    mockSession = {
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
    };
    mockHeaders.set('x-pathname', '/app/dashboard');

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/change-password');
  });

  it('allows access to /change-password when user must change password', async () => {
    mockSession = {
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
    };
    mockHeaders.set('next-url', 'http://localhost/change-password');

    await expect(requireAuth()).resolves.toEqual({
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
    });
  });

  it('redirects to /change-password when user must change password and is elsewhere', async () => {
    mockSession = {
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
    };
    mockHeaders.set('x-pathname', '/app/dashboard');

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/change-password');
  });

  it('allows access when next-url is an absolute /change-password URL', async () => {
    mockSession = {
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbAdmin = {
      id: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      isActive: true,
      mustChangePassword: true,
    };
    mockHeaders.set('next-url', 'https://intranet.asof.com.br/change-password?from=reset');

    await expect(requireAuth()).resolves.toMatchObject({
      userId: 7,
      mustChangePassword: true,
    });
  });

  it('logs a safe error and redirects when the DB query fails', async () => {
    const consoleErrorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    mockSession = {
      userId: 3,
      name: 'Admin',
      email: 'admin@asof.local',
      role: 'admin',
      mustChangePassword: false,
      isLoggedIn: true,
    };
    mockDbError = Object.assign(new Error('email=user@example.com'), { code: 'E_DB' });

    await expect(requireAuth()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'requireAuth DB query failed',
      {
        error: {
          kind: 'error',
          name: 'Error',
          code: 'E_DB',
          digest: undefined,
        },
      },
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
