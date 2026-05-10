import { execSync, spawn } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://gabrielramos@localhost:5432/asof_test';
const DEV_SERVER_PID_FILE = path.resolve(process.cwd(), '.next/e2e-dev-server.pid');
const NEXT_BIN = path.resolve(process.cwd(), 'node_modules/next/dist/bin/next');
const E2E_SESSION_SECRET = 'e2e-session-secret-at-least-32-characters-long';

export default async function globalSetup() {
  // Ensure test DB exists
  try {
    execSync(`createdb asof_test`, { stdio: 'ignore' });
  } catch {
    // DB may already exist
  }

  // Run migrations
  execSync(`DATABASE_URL="${TEST_DATABASE_URL}" npx drizzle-kit migrate`, {
    cwd: path.resolve(process.cwd()),
    stdio: 'inherit',
  });

  // Seed E2E data
  execSync(`TEST_DATABASE_URL="${TEST_DATABASE_URL}" npx tsx scripts/seed-e2e.ts`, {
    stdio: 'inherit',
  });

  // Start dev server
  const devServer = spawn(
    process.execPath,
    [NEXT_BIN, 'dev', '--webpack', '-p', '3001', '-H', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        // Fixed only for ephemeral E2E runs; tests do not persist signed sessions.
        SESSION_SECRET: E2E_SESSION_SECRET,
      },
      stdio: 'pipe',
    },
  );
  if (!devServer.pid) {
    throw new Error('E2E dev server process did not expose a PID.');
  }
  mkdirSync(path.dirname(DEV_SERVER_PID_FILE), { recursive: true });
  writeFileSync(DEV_SERVER_PID_FILE, String(devServer.pid));

  // Wait for server ready
  await new Promise<void>((resolve, reject) => {
    let ready = false;
    let sawExpectedUrl = false;
    const cleanup = () => {
      clearTimeout(timeout);
      devServer.stdout?.off('data', onData);
      devServer.off('exit', exitHandler);
    };
    const rejectWithCleanup = (error: Error) => {
      cleanup();
      reject(error);
    };
    const timeout = setTimeout(
      () => rejectWithCleanup(new Error('Dev server failed to start')),
      30000,
    );
    const onData = (data: Buffer) => {
      const text = data.toString();
      sawExpectedUrl ||= text.includes('127.0.0.1:3001') || text.includes('localhost:3001');
      if (sawExpectedUrl && text.includes('Ready in')) {
        ready = true;
        cleanup();
        resolve();
      }
    };
    const exitHandler = (code: number | null) => {
      if (!ready) {
        rejectWithCleanup(
          new Error(`Dev server exited before ready with code ${code ?? 'unknown'}`),
        );
      }
    };
    devServer.stdout?.on('data', onData);
    devServer.stderr?.on('data', (data) => {
      if (data.toString().includes('error')) {
        console.error(data.toString());
      }
    });
    devServer.on('exit', exitHandler);
  });

  // Store server ref for teardown
  (globalThis as unknown as Record<string, unknown>).__DEV_SERVER__ = devServer;
}
