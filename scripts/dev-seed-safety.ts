type EnvMap = Record<string, string | undefined>;

export const REMOTE_DEV_SEED_CONFIRMATION = 'SEED_SYNTHETIC_DATA';

export function isLocalDatabaseHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export function assertDevSeedDatabaseAllowed(env: EnvMap): URL {
  const rawUrl = env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL must be set before running db:seed:dev.');
  }

  const url = new URL(rawUrl);
  const isLocal = isLocalDatabaseHost(url.hostname);
  const hasRemoteOverride = env.ALLOW_REMOTE_DEV_SEED === REMOTE_DEV_SEED_CONFIRMATION;

  if ((env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') && !isLocal) {
    throw new Error('Refusing to run db:seed:dev against a remote database in a production environment.');
  }

  if (!isLocal && !hasRemoteOverride) {
    throw new Error(
      [
        `Refusing to run db:seed:dev against remote database host ${url.hostname}.`,
        'Point DATABASE_URL to local Postgres, or set',
        `ALLOW_REMOTE_DEV_SEED=${REMOTE_DEV_SEED_CONFIRMATION}`,
        'only after confirming this remote branch may receive synthetic development data.',
      ].join(' '),
    );
  }

  return url;
}
