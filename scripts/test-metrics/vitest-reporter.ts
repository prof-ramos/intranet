import path from 'node:path';
import type { Reporter, TestModule } from 'vitest/node';
import {
  createTestMetricsRecorder,
  normalizeDurationMs,
  type TestMetricStatus,
} from './metrics';

interface VitestMetricsReporterOptions {
  suite: string;
}

interface VitestTaskResultLike {
  state?: string;
  duration?: number;
  errors?: unknown[];
}

interface VitestTestLike {
  name?: string;
  fullName?: string;
  type?: string;
  result?: () => VitestTaskResultLike | undefined;
}

export class VitestMetricsReporter implements Reporter {
  private readonly recorder;

  constructor(options: VitestMetricsReporterOptions) {
    this.recorder = createTestMetricsRecorder({
      runner: 'vitest',
      suite: options.suite,
    });
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>): void {
    for (const testModule of testModules) {
      for (const test of testModule.children.allTests()) {
        this.recordTest(testModule, test as VitestTestLike);
      }
    }

    this.recorder.finish();
  }

  private recordTest(testModule: TestModule, test: VitestTestLike): void {
    const result = test.result?.();
    const file = normalizeFilePath(testModule.moduleId);
    const name = test.name ?? test.fullName ?? 'unknown test';
    const fullName = test.fullName ?? name;

    this.recorder.record({
      runner: 'vitest',
      suite: '',
      file,
      name,
      fullName,
      status: mapVitestStatus(result?.state),
      durationMs: normalizeDurationMs(result?.duration),
      errorCount: result?.errors?.length ?? 0,
    });
  }
}

export default VitestMetricsReporter;

function normalizeFilePath(moduleId: string): string {
  return path.relative(process.cwd(), moduleId);
}

function mapVitestStatus(state: string | undefined): TestMetricStatus {
  switch (state) {
    case 'pass':
      return 'passed';
    case 'fail':
      return 'failed';
    case 'skip':
      return 'skipped';
    case 'todo':
      return 'todo';
    default:
      return 'unknown';
  }
}
