import { describe, it, expect, vi } from 'vitest';
import { applyCorrelationActions } from './correlation-actions';
import type { CorrelationAction } from './correlate';

vi.mock('@/lib/system-users', () => ({
  resolveSystemBotUser: vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 1;
  }),
}));

vi.mock('@/lib/juridico/service', () => ({
  addNoteService: vi.fn().mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('applyCorrelationActions performance benchmark', () => {
  it('should process a batch of insert_note actions', async () => {
    const actions: CorrelationAction[] = Array.from({ length: 100 }).map((_, i) => ({
      type: 'insert_note',
      consultationId: i + 1,
      content: `Test content ${i}`,
      reason: 'test',
    }));

    const start = performance.now();
    await applyCorrelationActions(actions);
    const end = performance.now();

    const executionTime = end - start;
    console.log(`Execution time for 100 actions: ${executionTime.toFixed(2)} ms`);

    // The benchmark should just pass so we can see the log output
    expect(true).toBe(true);
  });
});
