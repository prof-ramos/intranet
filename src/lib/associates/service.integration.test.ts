import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { inArray, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';

const runId = `${Date.now()}-${process.pid}`;
const sourcePrefix = `INT-UNIQ-${runId}`;

function postgresConstraintCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code ?? candidate.cause?.code;
}

async function insertWithCpfHash(suffix: string, cpfHash: string | null): Promise<number> {
  const [row] = await db
    .insert(associates)
    .values({
      sourceRowNumber: `${sourcePrefix}-${suffix}`,
      fullName: 'Oficial Sintético Unicidade',
      associationStatus: 'associado',
      contributionStatus: 'em_dia',
      paymentMethod: 'folha',
      cpfHash,
    })
    .returning({ id: associates.id });
  return row.id;
}

async function cleanup() {
  const rows = await db
    .select({ id: associates.id })
    .from(associates)
    .where(like(associates.sourceRowNumber, `${sourcePrefix}%`));
  const ids = rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(associates).where(inArray(associates.id, ids));
  }
}

describe('associate identity hash uniqueness', () => {
  afterEach(cleanup);
  afterAll(cleanup);

  it('allows exactly one concurrent insert with the same cpf hash', async () => {
    const sharedHash = `cpf-uniq-${runId}`;
    const results = await Promise.allSettled([
      insertWithCpfHash('a', sharedHash),
      insertWithCpfHash('b', sharedHash),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(rejected).toHaveLength(1);
    expect(postgresConstraintCode(rejected[0].reason)).toBe('23505');
  });

  it('allows multiple officials with null identity hashes', async () => {
    const first = await insertWithCpfHash('null-a', null);
    const second = await insertWithCpfHash('null-b', null);
    expect(first).not.toEqual(second);
  });
});
