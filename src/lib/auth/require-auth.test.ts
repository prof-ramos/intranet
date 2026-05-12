import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '@/lib/auth/require-auth';

let mockSession: import('@/lib/auth/config').SessionData | null = null;
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

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(mockDbAdmin ? [mockDbAdmin] : [])),
        })),
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSession = null;
  mockDbAdmin = null;
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
      mustChangePassword: true,
    };

    await expect(requireAuth()).resolves.toEqual({
      userId: 7,
      name: 'Updated Name',
      email: 'updated@asof.local',
      role: 'diretoria',
      mustChangePassword: true,
    });
  });
});
