import path from 'node:path';
import type { Reporter } from 'vitest/node';
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
  result?: () => VitestTaskResultLike | undefined;
}

interface VitestModuleLike {
  filepath?: string;
  moduleId?: string;
  file?: {
    filepath?: string;
    name?: string;
  };
  children?: {
    allTests?: () => unknown[];
  };
}

export class VitestMetricsReporter implements Reporter {
  private readonly recorder;

  constructor(options: VitestMetricsReporterOptions) {
    this.recorder = createTestMetricsRecorder({
      runner: 'vitest',
      suite: options.suite,
    });
  }

  onTestRunEnd(testModules: readonly unknown[]): void {
    for (const testModule of testModules) {
      for (const test of getModuleTests(testModule)) {
        this.recordTest(testModule as VitestModuleLike, test as VitestTestLike);
      }
    }

    this.recorder.finish();
  }

  private recordTest(testModule: VitestModuleLike, test: VitestTestLike): void {
    const result = test.result?.();
    const file = normalizeFilePath(resolveModulePath(testModule));
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

function getModuleTests(testModule: unknown): unknown[] {
  const moduleLike = testModule as VitestModuleLike;

  return moduleLike.children?.allTests?.() ?? [];
}

function resolveModulePath(testModule: VitestModuleLike): string {
  return (
    testModule.moduleId ??
    testModule.filepath ??
    testModule.file?.filepath ??
    testModule.file?.name ??
    'unknown'
  );
}

function normalizeFilePath(filePath: string): string {
  if (filePath === 'unknown') {
    return filePath;
  }

  return path.relative(process.cwd(), filePath);
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
