import { vi } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    userId: 1,
    name: 'Admin',
    email: 'admin@asof.local',
    role: 'admin',
    mustChangePassword: false,
  }),
}));

vi.mock('@/lib/auth/authorization', () => ({
  requireRole: vi.fn().mockResolvedValue({
    userId: 1,
    name: 'Admin',
    email: 'admin@asof.local',
    role: 'admin',
    mustChangePassword: false,
  }),
}));
