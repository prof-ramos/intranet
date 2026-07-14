import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const runnerPath = path.resolve('scripts/run-integration-tests.mjs');
const tempDirectories: string[] = [];

function createTempDirectory(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'asof-integration-runner-'));
  tempDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('run-integration-tests', () => {
  it('skips successfully when .env.test.local is absent', () => {
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: createTempDirectory(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('.env.test.local not found');
  });

  it('propagates the database guard failure for an unsafe host', () => {
    const directory = createTempDirectory();
    const env = { ...process.env };
    const databaseUrlKey = ['DATABASE', 'URL'].join('_');
    const unsafeUrl = new URL('postgres://localhost/asof');
    unsafeUrl.hostname = 'db.example.com';
    unsafeUrl.username = 'integration_test';
    delete env.DATABASE_URL;
    writeFileSync(
      path.join(directory, '.env.test.local'),
      `${databaseUrlKey}=${unsafeUrl.toString()}\n`,
      { mode: 0o600 },
    );

    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: directory,
      encoding: 'utf8',
      env,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL host is not localhost');
    expect(result.stdout).not.toContain('RUN  v');
  });
});
