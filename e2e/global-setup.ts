import { execSync, spawn } from 'child_process';
import path from 'path';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/asof_test';

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
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: 'e2e-session-secret-at-least-32-characters-long',
      PORT: '3001',
    },
    stdio: 'pipe',
    shell: true,
  });

  // Wait for server ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dev server failed to start')), 30000);
    const onData = (data: Buffer) => {
      const text = data.toString();
      if (text.includes('Ready in') || text.includes('localhost:3001')) {
        clearTimeout(timeout);
        devServer.stdout?.off('data', onData);
        resolve();
      }
    };
    devServer.stdout?.on('data', onData);
    devServer.stderr?.on('data', (data) => {
      if (data.toString().includes('error')) {
        console.error(data.toString());
      }
    });
  });

  // Store server ref for teardown
  (globalThis as unknown as Record<string, unknown>).__DEV_SERVER__ = devServer;
}
