import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MIGRATION_URL_ENV_NAMES = [
  'DATABASE_MIGRATION_URL',
  'DATABASE_URL_UNPOOLED',
  'DATABASE_POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_POSTGRES_URL',
  'DATABASE_URL',
] as const;

type MigrationUrlEnvName = (typeof MIGRATION_URL_ENV_NAMES)[number];
type EnvMap = Record<string, string | undefined>;

interface ResolvedMigrationUrl {
  envName: MigrationUrlEnvName;
  url: URL;
}

export function resolveMigrationUrl(env: EnvMap): ResolvedMigrationUrl | null {
  for (const envName of MIGRATION_URL_ENV_NAMES) {
    const value = env[envName];
    if (!value) continue;

    return {
      envName,
      url: new URL(value),
    };
  }

  return null;
}

export function isLocalDatabaseHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

const KNOWN_PRODUCTION_DOMAINS = ['supabase.co', 'supabase.com', 'aws.neon.tech'];

export function isKnownProductionDatabaseUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return KNOWN_PRODUCTION_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function shouldBlockMigration(env: EnvMap, resolved: ResolvedMigrationUrl): boolean {
  if (env.ALLOW_PRODUCTION_MIGRATIONS === 'true') return false;

  if (env.DATABASE_MIGRATION_ENV === 'production') return true;
  if (env.VERCEL_ENV === 'production') return true;
  if (env.NODE_ENV === 'production' && !isLocalDatabaseHost(resolved.url.hostname)) return true;

  return isKnownProductionDatabaseUrl(resolved.url);
}

export function assertMigrationAllowed(env: EnvMap): ResolvedMigrationUrl {
  const resolved = resolveMigrationUrl(env);
  if (!resolved) {
    throw new Error(
      'DATABASE_MIGRATION_URL, DATABASE_URL_UNPOOLED, DATABASE_POSTGRES_URL_NON_POOLING, POSTGRES_URL_NON_POOLING, DATABASE_POSTGRES_URL, or DATABASE_URL must be set.',
    );
  }

  if (shouldBlockMigration(env, resolved)) {
    throw new Error(
      [
        `Refusing to run db:migrate against ${resolved.envName} (${resolved.url.hostname}).`,
        'Set ALLOW_PRODUCTION_MIGRATIONS=true only after backup/snapshot, deployment window approval, and a documented rollback plan.',
      ].join(' '),
    );
  }

  return resolved;
}

function run() {
  assertMigrationAllowed(process.env);

  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(executable, ['drizzle-kit', 'migrate', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}
