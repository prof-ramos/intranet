import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  createTestMetricsRecorder,
  normalizeDurationMs,
  type TestMetricStatus,
} from './metrics';

interface PlaywrightMetricsReporterOptions {
  suite?: string;
}

class PlaywrightMetricsReporter implements Reporter {
  private readonly recorder;

  constructor(options: PlaywrightMetricsReporterOptions = {}) {
    this.recorder = createTestMetricsRecorder({
      runner: 'playwright',
      suite: options.suite ?? 'e2e',
    });
  }

  onBegin(_config: FullConfig): void {
    // Recorder creation already captures run start time.
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.recorder.record({
      runner: 'playwright',
      suite: '',
      file: normalizeFilePath(test.location.file),
      name: test.title,
      fullName: test.titlePath().join(' > '),
      status: mapPlaywrightStatus(result.status),
      durationMs: normalizeDurationMs(result.duration),
      retry: result.retry,
      projectName: test.parent.project()?.name ?? null,
      errorCount: result.errors.length,
    });
  }

  onEnd(_result: FullResult): void {
    this.recorder.finish();
  }
}

export default PlaywrightMetricsReporter;

function normalizeFilePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

function mapPlaywrightStatus(status: TestResult['status']): TestMetricStatus {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'timedOut':
      return 'timed_out';
    case 'interrupted':
      return 'interrupted';
    default:
      return 'unknown';
  }
}
