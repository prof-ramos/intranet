import { execFileSync, execSync, spawn } from 'child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import { AssinafyMockServer } from './mocks/assinafy-server';
import {
  E2E_BASE_URL,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_SESSION_SECRET,
  E2E_ENCRYPTION_MASTER_KEY,
  E2E_CRON_SECRET,
  ASSINAFY_MOCK_PORT,
  ASSINAFY_MOCK_KEY,
  ASSINAFY_MOCK_ACCOUNT,
} from './constants';

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
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function getRecentServerLog() {
  if (!existsSync(DEV_SERVER_LOG_FILE)) return '';
  return readFileSync(DEV_SERVER_LOG_FILE, 'utf8').split('\n').slice(-80).join('\n');
}

async function waitForServerReady(pid: number) {
  const deadline = Date.now() + 120_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      throw new Error(`E2E dev server exited before becoming ready.\n${getRecentServerLog()}`);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${E2E_BASE_URL}/login`, {
        redirect: 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.status < 500) return;
      lastError = new Error(`Server returned status ${response.status}`);
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

async function warmupJitRoutes() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${E2E_BASE_URL}/login`);
    await page.fill('input[name="email"]', E2E_ADMIN_EMAIL);
    await page.fill('input[name="password"]', E2E_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${E2E_BASE_URL}/app`, { timeout: 30_000 });

    // Compile the filtered associados list so subsequent list navigations are
    // instant. The list links to the profile first; the edit route is exposed
    // from that profile (the listing no longer renders direct edit links).
    await page.goto(`${E2E_BASE_URL}/app/associados?q=${encodeURIComponent('João')}`, {
      timeout: 30_000,
    });

    const profileHref = await page
      .locator('li:has-text("João da Silva") a[href^="/app/associados/"]')
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (profileHref) {
      await page.goto(`${E2E_BASE_URL}${profileHref}`, { timeout: 60_000 });
      const editHref = await page
        .locator('a[href*="/editar"]')
        .first()
        .getAttribute('href')
        .catch(() => null);
      if (editHref) {
        // Direct goto compiles the [id]/editar route without needing a hover.
        await page.goto(`${E2E_BASE_URL}${editHref}`, { timeout: 60_000 });
      } else {
        console.warn('[warmupJitRoutes] Profile found but no edit link was rendered');
      }
    } else {
      console.warn('[warmupJitRoutes] João profile not found; /editar route not warmed');
    }

    // Compile the financeiro route used in other specs.
    await page.goto(`${E2E_BASE_URL}/app/financeiro/mensalidades`, { timeout: 60_000 });

    // Compile the oficios route to prevent JIT timeout in assinafy tests.
    await page.goto(`${E2E_BASE_URL}/app/secretaria/oficios`, { timeout: 60_000 });

    // Compile the oficios edit route to prevent JIT timeout in secretaria tests.
    await page.goto(`${E2E_BASE_URL}/app/secretaria/oficios/1/editar`, { timeout: 60_000 });
  } finally {
    await browser.close();
  }
}

export default async function globalSetup() {
  mkdirSync(path.dirname(DEV_SERVER_PID_FILE), { recursive: true });

  // Start Assinafy mock server before dev server so Next.js can connect
  const assinafyMock = new AssinafyMockServer({
    port: ASSINAFY_MOCK_PORT,
    apiKey: ASSINAFY_MOCK_KEY,
    accountId: ASSINAFY_MOCK_ACCOUNT,
  });
  await assinafyMock.start();
  globalThis.__ASSINAFY_MOCK__ = assinafyMock;

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

  // Seed E2E data. Load .env.development.local for optional local-only service
  // credentials used by tests; production and CI do not rely on legacy auth providers.
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
        CRON_SECRET: E2E_CRON_SECRET,
        ASOF_INTRANET_URL: E2E_BASE_URL,
        ASSINAFY_BASE_URL: `http://127.0.0.1:${ASSINAFY_MOCK_PORT}/v1`,
        ASSINAFY_API_KEY: ASSINAFY_MOCK_KEY,
        ASSINAFY_ACCOUNT_ID: ASSINAFY_MOCK_ACCOUNT,
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

  await warmupJitRoutes().catch((err) => {
    console.warn('[globalSetup] JIT warmup failed, continuing without warmup:', err);
  });

  // Store server ref for teardown
  globalThis.__DEV_SERVER__ = devServer;
}
