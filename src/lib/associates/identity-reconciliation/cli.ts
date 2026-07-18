import type { ReconcileAssociateIdentitiesInput } from './index';

export function parseReconciliationArguments(args: string[]): ReconcileAssociateIdentitiesInput {
  if (args.length === 0 || (args.length === 1 && args[0] === 'report')) return { mode: 'report' };
  if (args[0] !== 'apply' || args.length !== 3 || args[1] !== '--evidence-hash') {
    throw new Error('INVALID_ARGUMENTS');
  }
  return { mode: 'apply', evidenceHash: args[2] };
}
