import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export type TestMetricRunner = 'vitest' | 'playwright';

export type TestMetricStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'todo'
  | 'timed_out'
  | 'interrupted'
  | 'unknown';

export type TestMetricEnvironment = 'ci' | 'local';

export interface TestMetricEntryInput {
  runner: TestMetricRunner;
  suite: string;
  file: string;
  name: string;
  fullName: string;
  status: TestMetricStatus;
  durationMs: number;
  retry?: number | null;
  projectName?: string | null;
  errorCount?: number;
}

export interface TestMetricEntry extends TestMetricEntryInput {
  schemaVersion: 1;
  runId: string;
  recordedAt: string;
  environment: TestMetricEnvironment;
}

export interface TestMetricsRecorderOptions {
  runner: TestMetricRunner;
  suite: string;
  metricsDir?: string;
  enabled?: boolean;
}

export interface TestMetricsSummary {
  schemaVersion: 1;
  runId: string;
  runner: TestMetricRunner;
  suite: string;
  environment: TestMetricEnvironment;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  totals: Record<TestMetricStatus, number> & { total: number };
  slowestTests: TestMetricEntry[];
  files: {
    jsonl: string;
    summary: string;
  };
}

const DEFAULT_METRICS_DIR = '.test-metrics';
const MAX_SLOWEST_TESTS = 20;

export function shouldRecordTestMetrics(): boolean {
  const value = process.env.TEST_METRICS_DISABLED?.trim().toLowerCase();

  return value !== '1' && value !== 'true' && value !== 'yes';
}

export function resolveMetricsDir(metricsDir = process.env.TEST_METRICS_DIR): string {
  return path.resolve(process.cwd(), metricsDir?.trim() || DEFAULT_METRICS_DIR);
}

export function normalizeDurationMs(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}

export function normalizeSuiteName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default'
  );
}

export function getTestMetricEnvironment(): TestMetricEnvironment {
  return process.env.CI ? 'ci' : 'local';
}

export function createTestMetricsRecorder(options: TestMetricsRecorderOptions) {
  const enabled = options.enabled ?? shouldRecordTestMetrics();
  const suite = normalizeSuiteName(options.suite);
  const runId = createRunId(options.runner, suite);
  const metricsRoot = resolveMetricsDir(options.metricsDir);
  const runsDir = path.join(metricsRoot, 'runs');
  const jsonlPath = path.join(runsDir, `${runId}.jsonl`);
  const summaryPath = path.join(runsDir, `${runId}.summary.json`);
  const latestPath = path.join(metricsRoot, `${options.runner}-${suite}-latest.json`);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const entries: TestMetricEntry[] = [];

  if (enabled) {
    fs.mkdirSync(runsDir, { recursive: true });
  }

  function record(input: TestMetricEntryInput): void {
    if (!enabled) {
      return;
    }

    const entry: TestMetricEntry = {
      ...input,
      suite,
      schemaVersion: 1,
      runId,
      recordedAt: new Date().toISOString(),
      environment: getTestMetricEnvironment(),
      durationMs: normalizeDurationMs(input.durationMs),
      retry: input.retry ?? null,
      projectName: input.projectName ?? null,
      errorCount: input.errorCount ?? 0,
    };

    entries.push(entry);
    fs.appendFileSync(jsonlPath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  function finish(): TestMetricsSummary | null {
    if (!enabled) {
      return null;
    }

    const finishedAtMs = Date.now();
    const summary = buildSummary({
      entries,
      environment: getTestMetricEnvironment(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      jsonlPath,
      runner: options.runner,
      runId,
      startedAt,
      startedAtMs,
      summaryPath,
      suite,
      totalDurationMs: finishedAtMs - startedAtMs,
    });

    fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    fs.writeFileSync(latestPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    return summary;
  }

  return {
    enabled,
    runId,
    paths: {
      jsonl: jsonlPath,
      latest: latestPath,
      summary: summaryPath,
    },
    record,
    finish,
  };
}

function createRunId(runner: TestMetricRunner, suite: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortUuid = randomUUID().slice(0, 8);

  return `${timestamp}_${runner}_${suite}_${process.pid}_${shortUuid}`;
}

function buildSummary(input: {
  entries: TestMetricEntry[];
  environment: TestMetricEnvironment;
  finishedAt: string;
  jsonlPath: string;
  runner: TestMetricRunner;
  runId: string;
  startedAt: string;
  startedAtMs: number;
  summaryPath: string;
  suite: string;
  totalDurationMs: number;
}): TestMetricsSummary {
  const totals = createEmptyTotals();

  for (const entry of input.entries) {
    totals.total += 1;
    totals[entry.status] += 1;
  }

  const slowestTests = [...input.entries]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, MAX_SLOWEST_TESTS);

  return {
    schemaVersion: 1,
    runId: input.runId,
    runner: input.runner,
    suite: input.suite,
    environment: input.environment,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    totalDurationMs: normalizeDurationMs(input.totalDurationMs),
    totals,
    slowestTests,
    files: {
      jsonl: path.relative(process.cwd(), input.jsonlPath),
      summary: path.relative(process.cwd(), input.summaryPath),
    },
  };
}

function createEmptyTotals(): Record<TestMetricStatus, number> & { total: number } {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    timed_out: 0,
    interrupted: 0,
    unknown: 0,
  };
}
