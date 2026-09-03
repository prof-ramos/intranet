import postgres from 'postgres';

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  throw new Error('DATABASE_MIGRATION_URL must be set.');
}

const sql = postgres(url, { max: 1, ssl: 'require' });

try {
  const checks = [
    {
      field: 'cpf_hash',
      query: sql`
        SELECT count(*)::int AS duplicate_groups
        FROM (
          SELECT cpf_hash
          FROM associates
          WHERE cpf_hash IS NOT NULL
          GROUP BY cpf_hash
          HAVING count(*) > 1
        ) t
      `,
    },
    {
      field: 'siape_hash',
      query: sql`
        SELECT count(*)::int AS duplicate_groups
        FROM (
          SELECT siape_hash
          FROM associates
          WHERE siape_hash IS NOT NULL
          GROUP BY siape_hash
          HAVING count(*) > 1
        ) t
      `,
    },
    {
      field: 'primary_email_hash',
      query: sql`
        SELECT count(*)::int AS duplicate_groups
        FROM (
          SELECT primary_email_hash
          FROM associates
          WHERE primary_email_hash IS NOT NULL
          GROUP BY primary_email_hash
          HAVING count(*) > 1
        ) t
      `,
    },
  ] as const;

  for (const { field, query } of checks) {
    const rows = await query;
    const duplicateGroups = Number(rows[0]?.duplicate_groups ?? 0);
    if (duplicateGroups > 0) {
      throw new Error(`duplicate associate identity hash: ${field} (${duplicateGroups} groups)`);
    }
    console.log(`${field}: 0 duplicate groups`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
