import { describe, expect, it } from 'vitest';
import { parseReconciliationArguments } from './cli';

describe('associate identity reconciliation command arguments', () => {
  it('defaults to report and accepts an explicit report', () => {
    expect(parseReconciliationArguments([])).toEqual({ mode: 'report' });
    expect(parseReconciliationArguments(['report'])).toEqual({ mode: 'report' });
  });

  it('requires an evidence hash for apply and rejects unknown arguments', () => {
    expect(() => parseReconciliationArguments(['apply'])).toThrow('INVALID_ARGUMENTS');
    expect(() => parseReconciliationArguments(['--apply'])).toThrow('INVALID_ARGUMENTS');
    expect(() => parseReconciliationArguments(['report', '--extra'])).toThrow('INVALID_ARGUMENTS');
    expect(parseReconciliationArguments(['apply', '--evidence-hash', 'a'.repeat(64)])).toEqual({
      mode: 'apply',
      evidenceHash: 'a'.repeat(64),
    });
  });
});
