import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve('.');
const vitestPath = path.join(projectRoot, 'node_modules/vitest/vitest.mjs');
const configPath = path.join(projectRoot, 'vitest.integration.config.ts');
const contractPath = path.join(projectRoot, 'src/lib/db/schema.integration.test.ts');

describe('database contract runner', () => {
  it('fails when DATABASE_URL is absent instead of choosing an implicit database', () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;

    const result = spawnSync(
      process.execPath,
      [vitestPath, 'run', '--config', configPath, contractPath],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env,
        timeout: 10_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'DATABASE_URL must be set for database schema integration tests.',
    );
  });

  it('fails closed without leaking credentials when PostgreSQL is unavailable', () => {
    const syntheticPassword = ['contract', 'password'].join('_');
    const unavailableUrl = new URL('postgres://127.0.0.1:1/asof_contract_unavailable');
    unavailableUrl.username = 'contract_user';
    unavailableUrl.password = syntheticPassword;
    const unavailableUrlString = unavailableUrl.toString();
    const result = spawnSync(
      process.execPath,
      [vitestPath, 'run', '--config', configPath, contractPath],
      {
        cwd: projectRoot,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: unavailableUrlString },
        timeout: 10_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);

    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('Database schema contract setup failed: database unavailable.');
    expect(output).not.toContain(unavailableUrlString);
    expect(output).not.toContain(syntheticPassword);
  });
});
