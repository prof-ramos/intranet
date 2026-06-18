import { describe, expect, it } from 'vitest';

import {
  assertDevSeedDatabaseAllowed,
  REMOTE_DEV_SEED_CONFIRMATION,
} from './dev-seed-safety';

describe('dev seed safety guard', () => {
  it('allows local database URLs by default', () => {
    const resolved = assertDevSeedDatabaseAllowed({
      DATABASE_URL: 'postgres://gabrielramos@localhost:5432/asof_intranet',
    });

    expect(resolved.hostname).toBe('localhost');
  });

  it('blocks remote database URLs by default', () => {
    expect(() =>
      assertDevSeedDatabaseAllowed({
        DATABASE_URL: 'postgres://user:secret@ep-main.sa-east-1.aws.neon.tech:5432/asof',
      }),
    ).toThrow(/Refusing to run db:seed:dev/);
  });

  it('allows a remote non-production branch only with the explicit synthetic-data confirmation', () => {
    const resolved = assertDevSeedDatabaseAllowed({
      DATABASE_URL: 'postgres://user:secret@ep-dev.sa-east-1.aws.neon.tech:5432/asof',
      ALLOW_REMOTE_DEV_SEED: REMOTE_DEV_SEED_CONFIRMATION,
    });

    expect(resolved.hostname).toBe('ep-dev.sa-east-1.aws.neon.tech');
  });

  it('blocks remote database URLs in production even with the remote override', () => {
    expect(() =>
      assertDevSeedDatabaseAllowed({
        DATABASE_URL: 'postgres://user:secret@ep-main.sa-east-1.aws.neon.tech:5432/asof',
        ALLOW_REMOTE_DEV_SEED: REMOTE_DEV_SEED_CONFIRMATION,
        VERCEL_ENV: 'production',
      }),
    ).toThrow(/production environment/);
  });
});
