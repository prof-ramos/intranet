import { createClient } from '@libsql/client';
import { db } from '../src/lib/db';
import { associates } from '../src/lib/db/schema';

import path from 'path';

const functionalStatuses = ['ativo', 'aposentado', 'cedido', 'em_licenca'] as const;
const associationStatuses = ['ativo', 'inativo'] as const;
const contributionStatuses = ['em_dia', 'inadimplente', 'pendente_migracao'] as const;

function enumValue<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
): T[number];
function enumValue<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: null,
): T[number] | null;
function enumValue<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number] | null,
) {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

function requiredEnumValue<T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
) {
  return enumValue(value, values, fallback);
}

const rawPath = process.env.SEED_SOURCE_DB?.trim();
if (!rawPath) {
  throw new Error('SEED_SOURCE_DB must be set to the SQLite seed source path.');
}
const SOURCE_DB_PATH = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
const BATCH_SIZE = 100;

async function main() {
  const sourceClient = createClient({ url: `file:${SOURCE_DB_PATH}` });
  const result = await sourceClient.execute('SELECT * FROM associates');
  const rows = result.rows as Record<string, unknown>[];

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
      functionalStatus: enumValue(row.functional_status, functionalStatuses, null),
      assignment: row.assignment as string | null,
      assignmentStartDate: row.assignment_start_date as string | null,
      locationCity: row.location_city as string | null,
      locationCountry: row.location_country as string | null,
      associationStatus: requiredEnumValue(row.association_status, associationStatuses, 'ativo'),
      joinedAt: row.joined_at as string | null,
      associationCategory: row.association_category as string | null,
      contributionStatus: requiredEnumValue(
        row.contribution_status,
        contributionStatuses,
        'pendente_migracao',
      ),
      address: row.address as string | null,
      secondaryEmail: row.secondary_email as string | null,
      internalNotes: row.internal_notes as string | null,
      birthDate: row.birth_date as string | null,
      classPattern: row.class_pattern as string | null,
      sourcePayload: row.source_payload as string | null,
    }));

    await db.insert(associates).values(batch);
    console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`);
  }

  console.log('Done seeding associates.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
