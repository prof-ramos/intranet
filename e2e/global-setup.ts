import { execFileSync, execSync, spawn } from 'child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const ENV_FILE = path.resolve(process.cwd(), '.env.development.local');
const ENV_FILE_FLAG = existsSync(ENV_FILE) ? `--env-file="${ENV_FILE}" ` : '';

const localDbUser = process.env.USER;
if (!process.env.TEST_DATABASE_URL && !localDbUser) {
  throw new Error('TEST_DATABASE_URL is required when USER is not available.');
}

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgres://${localDbUser}@localhost:5432/asof_test`;
const E2E_DIST_DIR = '.next-e2e';
const DEV_SERVER_PID_FILE = path.resolve(process.cwd(), `${E2E_DIST_DIR}/e2e-dev-server.pid`);
const DEV_SERVER_LOG_FILE = path.resolve(process.cwd(), `${E2E_DIST_DIR}/e2e-dev-server.log`);
const NEXT_BIN = path.resolve(process.cwd(), 'node_modules/next/dist/bin/next');
const E2E_SESSION_SECRET = 'e2e-session-secret-at-least-32-characters-long';
const E2E_ENCRYPTION_MASTER_KEY = 'e2e-encryption-master-key-at-least-32-chars';
const E2E_BASE_URL = 'http://127.0.0.1:3001';
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function getRecentServerLog() {
  if (!existsSync(DEV_SERVER_LOG_FILE)) return '';
  return readFileSync(DEV_SERVER_LOG_FILE, 'utf8').split('\n').slice(-80).join('\n');
}

async function waitForServerReady(pid: number) {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      throw new Error(`E2E dev server exited before becoming ready.\n${getRecentServerLog()}`);
    }

    try {
      const response = await fetch(`${E2E_BASE_URL}/login`, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `E2E dev server failed to become ready at ${E2E_BASE_URL}.\n` +
      `Last error: ${String(lastError)}\n${getRecentServerLog()}`,
  );
}

function getTestDatabaseCommandConfig() {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName || ['postgres', 'template0', 'template1'].includes(databaseName)) {
    throw new Error(`Refusing to recreate unsafe E2E database name: ${databaseName || '<empty>'}`);
  }

  if (!LOCAL_DB_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to recreate non-local E2E database host: ${url.hostname}`);
  }

  const args: string[] = [];
  if (url.hostname) args.push('-h', url.hostname);
  if (url.port) args.push('-p', url.port);
  if (url.username) args.push('-U', decodeURIComponent(url.username));

  const env = {
    ...process.env,
    ...(url.password ? { PGPASSWORD: decodeURIComponent(url.password) } : {}),
  };

  return { args, databaseName, env };
}

export default async function globalSetup() {
  mkdirSync(path.dirname(DEV_SERVER_PID_FILE), { recursive: true });

  // Recreate the local E2E DB so migration replay starts from a clean history.
  const testDb = getTestDatabaseCommandConfig();
  execFileSync('dropdb', [...testDb.args, '--if-exists', testDb.databaseName], {
    stdio: 'ignore',
    env: testDb.env,
  });
  execFileSync('createdb', [...testDb.args, testDb.databaseName], {
    stdio: 'ignore',
    env: testDb.env,
  });

  // Run migrations
  execSync(`DATABASE_URL="${TEST_DATABASE_URL}" npx drizzle-kit migrate`, {
    cwd: path.resolve(process.cwd()),
    stdio: 'inherit',
  });

  // Seed E2E data. Load .env.development.local so the seed script can access
  // Supabase service-role keys when creating auth users.
  const tsxCli = path.resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  execSync(
    `TEST_DATABASE_URL="${TEST_DATABASE_URL}" node ${ENV_FILE_FLAG}"${tsxCli}" scripts/seed-e2e.ts`,
    {
      cwd: path.resolve(process.cwd()),
      stdio: 'inherit',
    },
  );

  // Start dev server. Next.js 16 prevents two dev servers from sharing the same
  // distDir; NEXT_E2E makes next.config.ts use .next-e2e for this process.
  const logFd = openSync(DEV_SERVER_LOG_FILE, 'a');
  const devServer = spawn(
    process.execPath,
    [NEXT_BIN, 'dev', '--webpack', '-p', '3001', '-H', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        NEXT_E2E: '1',
        SKIP_AUTH: 'false',
        // Fixed only for ephemeral E2E runs; tests do not persist signed sessions.
        SESSION_SECRET: E2E_SESSION_SECRET,
        ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY ?? E2E_ENCRYPTION_MASTER_KEY,
        CRON_SECRET: 'dummy_cron_secret_for_e2e_tests',
        ASOF_INTRANET_URL: 'http://127.0.0.1:3001',
      },
      detached: true,
      stdio: ['ignore', logFd, logFd],
    },
  );
  closeSync(logFd);
  if (!devServer.pid) {
    throw new Error('E2E dev server process did not expose a PID.');
  }
  writeFileSync(DEV_SERVER_PID_FILE, String(devServer.pid));
  devServer.unref();

  await waitForServerReady(devServer.pid);

  // Store server ref for teardown
  (globalThis as unknown as Record<string, unknown>).__DEV_SERVER__ = devServer;
}
