import { describe, expect, it } from 'vitest';
import {
  collectSupabaseStatus,
  createSupabaseStatusClient,
  formatSupabaseStatus,
  resolveSupabaseStatusEnv,
} from './supabase-status';

describe('supabase status script', () => {
  it('requires the Supabase URL and service-role key', () => {
    expect(() => resolveSupabaseStatusEnv({})).toThrow(
      'Supabase URL must be set for db:supabase:status.',
    );

    expect(() =>
      resolveSupabaseStatusEnv({
        DATABASE_SUPABASE_URL: 'https://project.supabase.co',
      }),
    ).toThrow('Supabase service-role key must be set for db:supabase:status.');
  });

  it('creates a server-only admin client without persisted sessions', () => {
    const calls: unknown[][] = [];
    const expectedClient = {
      from() {
        throw new Error('not used in this test');
      },
    };

    const client = createSupabaseStatusClient(
      {
        supabaseUrl: 'https://project.supabase.co',
        serviceRoleKey: 'service-role-secret',
      },
      (...args: unknown[]) => {
        calls.push(args);
        return expectedClient;
      },
    );

    expect(client).toBe(expectedClient);
    expect(calls).toEqual([
      [
        'https://project.supabase.co',
        'service-role-secret',
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            persistSession: false,
          },
        },
      ],
    ]);
  });

  it('collects exact table counts with head-only Data API requests', async () => {
    const calls: unknown[] = [];
    const client = {
      from(table: string) {
        return {
          select(columns: string, options: { count: string; head: boolean }) {
            calls.push({ table, columns, options });
            return Promise.resolve({
              count: table === 'admins' ? 2 : 763,
              error: null,
            });
          },
        };
      },
    };

    await expect(collectSupabaseStatus(client, ['admins', 'associates'])).resolves.toEqual([
      { table: 'admins', count: 2, ok: true },
      { table: 'associates', count: 763, ok: true },
    ]);
    expect(calls).toEqual([
      { table: 'admins', columns: '*', options: { count: 'exact', head: true } },
      { table: 'associates', columns: '*', options: { count: 'exact', head: true } },
    ]);
  });

  it('reports an error when the Data API does not return a count', async () => {
    const client = {
      from() {
        return {
          select() {
            return Promise.resolve({ count: null, error: null });
          },
        };
      },
    };

    await expect(collectSupabaseStatus(client, ['oficios'])).resolves.toEqual([
      {
        table: 'oficios',
        count: null,
        ok: false,
        error: 'count unavailable',
      },
    ]);
  });

  it('formats a status report without printing secrets', () => {
    const report = formatSupabaseStatus({
      supabaseUrl: 'https://project.supabase.co',
      serviceRoleKey: 'service-role-secret',
      tables: [
        { table: 'admins', count: 2, ok: true },
        { table: 'associates', count: null, ok: false, error: 'permission denied' },
      ],
    });

    expect(report).toContain('Supabase project: project.supabase.co');
    expect(report).toContain('admins: 2');
    expect(report).toContain('associates: ERROR permission denied');
    expect(report).not.toContain('service-role-secret');
  });
});
