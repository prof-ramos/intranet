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

  it('blocks production-looking database URLs without explicit opt-in', () => {
    expect(() =>
      assertMigrationAllowed({
        DATABASE_MIGRATION_URL: 'postgres://user:secret@ep-cool-butterfly.sa-east-1.aws.neon.tech:5432/asof',
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
      DATABASE_MIGRATION_URL: 'postgres://user:secret@ep-cool-butterfly.sa-east-1.aws.neon.tech:5432/asof',
      ALLOW_PRODUCTION_MIGRATIONS: 'true',
    };
    const resolved = assertMigrationAllowed(env);

    expect(isKnownProductionDatabaseUrl(resolved.url)).toBe(true);
    expect(shouldBlockMigration(env, resolved)).toBe(false);
  });
});
