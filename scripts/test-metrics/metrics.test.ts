import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestMetricsRecorder } from './metrics';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('createTestMetricsRecorder', () => {
  it('records per-test jsonl entries and a run summary', async () => {
    const metricsDir = createTempDir();
    const recorder = createTestMetricsRecorder({
      runner: 'vitest',
      suite: 'Unit Tests',
      metricsDir,
    });

    recorder.record({
      runner: 'vitest',
      suite: '',
      file: 'src/example.test.ts',
      name: 'fast test',
      fullName: 'example > fast test',
      status: 'passed',
      durationMs: 12.6,
    });

    recorder.record({
      runner: 'vitest',
      suite: '',
      file: 'src/example.test.ts',
      name: 'slow test',
      fullName: 'example > slow test',
      status: 'failed',
      durationMs: 1500,
      errorCount: 1,
    });

    const summary = await recorder.finish();

    expect(summary).not.toBeNull();
    expect(summary?.suite).toBe('unit-tests');
    expect(summary?.totals.total).toBe(2);
    expect(summary?.totals.passed).toBe(1);
    expect(summary?.totals.failed).toBe(1);
    expect(summary?.slowestTests[0]?.fullName).toBe('example > slow test');

    const jsonl = fs.readFileSync(recorder.paths.jsonl, 'utf8').trim().split('\n');
    expect(jsonl).toHaveLength(2);
    expect(JSON.parse(jsonl[0] ?? '{}')).toMatchObject({
      suite: 'unit-tests',
      durationMs: 13,
      status: 'passed',
    });

    expect(fs.existsSync(recorder.paths.summary)).toBe(true);
    expect(fs.existsSync(recorder.paths.latest)).toBe(true);
  });

  it('does not create files when disabled', async () => {
    const metricsDir = createTempDir();
    const recorder = createTestMetricsRecorder({
      runner: 'vitest',
      suite: 'unit',
      metricsDir,
      enabled: false,
    });

    recorder.record({
      runner: 'vitest',
      suite: '',
      file: 'src/example.test.ts',
      name: 'test',
      fullName: 'test',
      status: 'passed',
      durationMs: 1,
    });

    expect(await recorder.finish()).toBeNull();
    expect(fs.existsSync(path.join(metricsDir, 'runs'))).toBe(false);
  });
});

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asof-test-metrics-'));
  tempDirs.push(dir);

  return dir;
}
