import {
  AssociateIdentityReconciliationError,
  reconcileAssociateIdentities,
  type ReconcileAssociateIdentitiesInput,
} from '@/lib/associates/identity-reconciliation';
import { parseReconciliationArguments } from '@/lib/associates/identity-reconciliation/cli';

async function main() {
  const input: ReconcileAssociateIdentitiesInput = parseReconciliationArguments(
    process.argv.slice(2),
  );
  const report = await reconcileAssociateIdentities(input);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const code =
    error instanceof AssociateIdentityReconciliationError
      ? error.code
      : error instanceof Error && error.message === 'INVALID_ARGUMENTS'
        ? 'INVALID_ARGUMENTS'
        : 'RECONCILIATION_FAILED';
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code } })}\n`);
  process.exitCode = 1;
});
