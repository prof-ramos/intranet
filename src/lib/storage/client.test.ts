import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAdminStorageClient, getSupabaseAnonStorageClient } from './client';

const createClientMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

vi.mock('@/lib/supabase/config', () => ({
  getSupabaseUrl: () => 'https://supabase.local',
  getSupabaseServiceRoleKey: () => 'service-role-key',
  getSupabasePublishableKey: () => 'publishable-key',
}));

describe('storage client helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockImplementation((url: string, key: string, options: unknown) => ({
      url,
      key,
      options,
    }));
  });

  it('caches the admin client with server-safe auth options', () => {
    const first = getSupabaseAdminStorageClient();
    const second = getSupabaseAdminStorageClient();

    expect(first).toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://supabase.local',
      'service-role-key',
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    );
  });

  it('caches the anon client only for tokenless usage', () => {
    const first = getSupabaseAnonStorageClient();
    const second = getSupabaseAnonStorageClient();

    expect(first).toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      'https://supabase.local',
      'publishable-key',
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: undefined,
      }),
    );
  });

  it('creates isolated anon clients for token-based calls', () => {
    const first = getSupabaseAnonStorageClient('token-a');
    const second = getSupabaseAnonStorageClient('token-b');

    expect(first).not.toBe(second);
    expect(createClientMock).toHaveBeenNthCalledWith(
      1,
      'https://supabase.local',
      'publishable-key',
      expect.objectContaining({
        global: {
          headers: {
            Authorization: 'Bearer token-a',
          },
        },
      }),
    );
    expect(createClientMock).toHaveBeenNthCalledWith(
      2,
      'https://supabase.local',
      'publishable-key',
      expect.objectContaining({
        global: {
          headers: {
            Authorization: 'Bearer token-b',
          },
        },
      }),
    );
  });
});
