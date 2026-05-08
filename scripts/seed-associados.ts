import Database from 'better-sqlite3';
import { db } from '../src/lib/db';
import { associates } from '../src/lib/db/schema';

import path from 'path';

const rawPath = process.env.SEED_SOURCE_DB || '../prd-intranet/data/associados_mvp.sqlite';
const SOURCE_DB_PATH = path.resolve(rawPath);
if (!SOURCE_DB_PATH.startsWith(path.resolve('..'))) {
  throw new Error('Invalid source path: must be within project directory');
}
const BATCH_SIZE = 100;

function main() {
  const sourceDb = new Database(SOURCE_DB_PATH);
  const rows = sourceDb.prepare('SELECT * FROM associates').all() as Record<string, unknown>[];

  console.log(`Found ${rows.length} rows to seed.`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      sourceRowNumber: row.source_row_number as string | null,
      fullName: row.full_name as string,
      cpf: row.cpf as string | null,
      primaryEmail: row.primary_email as string | null,
      phone: row.phone as string | null,
      whatsapp: row.whatsapp as string | null,
      siape: row.siape as string | null,
      functionalStatus: row.functional_status as string | null,
      assignment: row.assignment as string | null,
      assignmentStartDate: row.assignment_start_date as string | null,
      locationCity: row.location_city as string | null,
      locationCountry: row.location_country as string | null,
      associationStatus: (row.association_status as string) || 'ativo',
      joinedAt: row.joined_at as string | null,
      associationCategory: row.association_category as string | null,
      contributionStatus: (row.contribution_status as string) || 'pendente_migracao',
      address: row.address as string | null,
      secondaryEmail: row.secondary_email as string | null,
      internalNotes: row.internal_notes as string | null,
      birthDate: row.birth_date as string | null,
      classPattern: row.class_pattern as string | null,
      sourcePayload: row.source_payload as string | null,
    }));

    db.insert(associates).values(batch).run();
    console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`);
  }

  console.log('Done seeding associates.');
}

main();
