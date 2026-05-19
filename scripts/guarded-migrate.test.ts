import { describe, expect, it } from 'vitest';

import {
  assertMigrationAllowed,
  isKnownProductionDatabaseUrl,
  shouldBlockMigration,
} from './guarded-migrate';

describe('guarded migrate', () => {
  it('allows local migration URLs by default', () => {
    const resolved = assertMigrationAllowed({
      DATABASE_MIGRATION_URL: 'postgres://gabrielramos@localhost:5432/asof_intranet',
    });

    expect(resolved.envName).toBe('DATABASE_MIGRATION_URL');
    expect(resolved.url.hostname).toBe('localhost');
  });

  it('blocks the known production Supabase project without explicit opt-in', () => {
    expect(() =>
      assertMigrationAllowed({
        DATABASE_MIGRATION_URL: 'postgres://postgres.uftzjmmfkoqhjjwsiynk:secret@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
      }),
    ).toThrow(/Refusing to run db:migrate/);
  });

  it('blocks non-local targets when NODE_ENV is production', () => {
    const resolved = assertMigrationAllowed({
      DATABASE_MIGRATION_URL: 'postgres://gabrielramos@localhost:5432/asof_intranet',
      NODE_ENV: 'production',
    });

    expect(resolved.url.hostname).toBe('localhost');

    expect(() =>
      assertMigrationAllowed({
        DATABASE_MIGRATION_URL: 'postgres://user:secret@db.example.com:5432/asof',
        NODE_ENV: 'production',
      }),
    ).toThrow(/ALLOW_PRODUCTION_MIGRATIONS=true/);
  });

  it('allows production migrations only with explicit opt-in', () => {
    const env = {
      DATABASE_MIGRATION_URL: 'postgres://user:secret@db.uftzjmmfkoqhjjwsiynk.supabase.co:5432/postgres',
      ALLOW_PRODUCTION_MIGRATIONS: 'true',
    };
    const resolved = assertMigrationAllowed(env);

    expect(isKnownProductionDatabaseUrl(resolved.url)).toBe(true);
    expect(shouldBlockMigration(env, resolved)).toBe(false);
  });
});
