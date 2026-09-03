import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const HASH_COLUMNS = ['cpf_hash', 'siape_hash', 'primary_email_hash'] as const;
type HashColumn = (typeof HASH_COLUMNS)[number];

export interface DuplicateHashGroup {
  column: HashColumn;
  keepId: number;
  clearIds: number[];
  groupSize: number;
}

export interface ClearDuplicateIdentityHashesReport {
  mode: 'report' | 'apply';
  groups: DuplicateHashGroup[];
  clearedRowCount: number;
}

export function planClearDuplicateIdentityHashes(
  rows: Array<{ column: HashColumn; ids: Array<number | string> }>,
): DuplicateHashGroup[] {
  return rows
    .map(({ column, ids }) => {
      const sorted = [...new Set(ids.map((id) => Number(id)))]
        .filter((id) => Number.isInteger(id) && id > 0)
        .sort((a, b) => a - b);
      if (sorted.length < 2) return null;
      return {
        column,
        keepId: sorted[0],
        clearIds: sorted.slice(1),
        groupSize: sorted.length,
      } satisfies DuplicateHashGroup;
    })
    .filter((group): group is DuplicateHashGroup => group !== null);
}

async function loadDuplicateGroups(sql: postgres.Sql): Promise<DuplicateHashGroup[]> {
  const collected: Array<{ column: HashColumn; ids: number[] }> = [];

  for (const column of HASH_COLUMNS) {
    const rows =
      column === 'cpf_hash'
        ? await sql`
            SELECT array_agg(id ORDER BY id) AS ids
            FROM associates
            WHERE cpf_hash IS NOT NULL
            GROUP BY cpf_hash
            HAVING count(*) > 1
          `
        : column === 'siape_hash'
          ? await sql`
              SELECT array_agg(id ORDER BY id) AS ids
              FROM associates
              WHERE siape_hash IS NOT NULL
              GROUP BY siape_hash
              HAVING count(*) > 1
            `
          : await sql`
              SELECT array_agg(id ORDER BY id) AS ids
              FROM associates
              WHERE primary_email_hash IS NOT NULL
              GROUP BY primary_email_hash
              HAVING count(*) > 1
            `;

    for (const row of rows) {
      const ids = ((row.ids as Array<number | string> | null) ?? []).map(Number);
      collected.push({ column, ids });
    }
  }

  return planClearDuplicateIdentityHashes(collected);
}

async function applyClearDuplicateIdentityHashes(
  sql: postgres.Sql,
  groups: DuplicateHashGroup[],
): Promise<number> {
  let clearedRowCount = 0;

  await sql.begin(async (tx) => {
    for (const group of groups) {
      if (group.clearIds.length === 0) continue;

      const result =
        group.column === 'cpf_hash'
          ? await tx`
              UPDATE associates
              SET cpf_hash = NULL, updated_at = NOW()
              WHERE id IN ${tx(group.clearIds)}
                AND cpf_hash IS NOT NULL
              RETURNING id
            `
          : group.column === 'siape_hash'
            ? await tx`
                UPDATE associates
                SET siape_hash = NULL, updated_at = NOW()
                WHERE id IN ${tx(group.clearIds)}
                  AND siape_hash IS NOT NULL
                RETURNING id
              `
            : await tx`
                UPDATE associates
                SET primary_email_hash = NULL, updated_at = NOW()
                WHERE id IN ${tx(group.clearIds)}
                  AND primary_email_hash IS NOT NULL
                RETURNING id
              `;
      clearedRowCount += result.length;

      await tx`
        INSERT INTO audit_logs (action, entity_type, entity_id, performed_by, changes, metadata)
        VALUES (
          'associate_identity_hash_cleared',
          'associate',
          ${group.keepId},
          NULL,
          ${tx.json({
            old: { [group.column]: 'duplicate' },
            new: { [group.column]: null },
          })},
          ${tx.json({
            column: group.column,
            keepId: group.keepId,
            clearIds: group.clearIds,
            groupSize: group.groupSize,
            reason: 'unblock_unique_identity_hash_indexes',
          })}
        )
      `;
    }
  });

  return clearedRowCount;
}

async function main() {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    throw new Error('DATABASE_MIGRATION_URL must be set.');
  }

  const mode = process.argv.includes('--apply') ? 'apply' : 'report';
  const sql = postgres(url, { max: 1, ssl: 'require' });

  try {
    const groups = await loadDuplicateGroups(sql);
    let clearedRowCount = 0;
    if (mode === 'apply' && groups.length > 0) {
      clearedRowCount = await applyClearDuplicateIdentityHashes(sql, groups);
    }

    const report: ClearDuplicateIdentityHashesReport = { mode, groups, clearedRowCount };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

    if (mode === 'report' && groups.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
