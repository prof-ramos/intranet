import { integer, text, timestamp, pgEnum, pgTable, index, uuid } from 'drizzle-orm/pg-core';

export const testRunner = pgEnum('test_runner', ['vitest', 'playwright']);
export const testEnvironment = pgEnum('test_environment', ['ci', 'local']);
export const testResultStatus = pgEnum('test_result_status', [
  'passed',
  'failed',
  'skipped',
  'todo',
  'timed_out',
  'interrupted',
  'unknown',
]);

export const testRuns = pgTable(
  'test_runs',
  {
    runId: text('run_id').primaryKey(),
    runner: testRunner('runner').notNull(),
    suite: text('suite').notNull(),
    environment: testEnvironment('environment').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
    totalDurationMs: integer('total_duration_ms').notNull(),
    totalTests: integer('total_tests').notNull(),
    passed: integer('passed').notNull(),
    failed: integer('failed').notNull(),
    skipped: integer('skipped').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_test_runs_runner_suite').on(table.runner, table.suite),
    index('idx_test_runs_started_at').on(table.startedAt),
  ]
);

export const testResults = pgTable(
  'test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: text('run_id')
      .notNull()
      .references(() => testRuns.runId, { onDelete: 'cascade' }),
    file: text('file').notNull(),
    name: text('name').notNull(),
    fullName: text('full_name').notNull(),
    status: testResultStatus('status').notNull(),
    durationMs: integer('duration_ms').notNull(),
    retry: integer('retry'),
    projectName: text('project_name'),
    errorCount: integer('error_count').default(0),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('idx_test_results_run_id').on(table.runId),
    index('idx_test_results_status').on(table.status),
    index('idx_test_results_duration').on(table.durationMs),
  ]
);

export type TestRun = typeof testRuns.$inferSelect;
export type NewTestRun = typeof testRuns.$inferInsert;
export type TestResult = typeof testResults.$inferSelect;
export type NewTestResult = typeof testResults.$inferInsert;
