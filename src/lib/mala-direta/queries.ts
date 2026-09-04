import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import { assignmentLocationTypeSql } from '@/lib/associates/location-country';
import { decryptPiiField } from '@/lib/crypto/pii';
import { db } from '@/lib/db';
import { assignments, associates } from '@/lib/db/schema';
import { createLogger } from '@/lib/logger';
import { splitContactName } from './name-split';
import {
  MALA_DIRETA_DEFAULT_LIMIT,
  type GmailContactRow,
  type MalaDiretaFilters,
} from './types';

const logger = createLogger('mala-direta:queries');

const hasPrintableAssociateName = sql`${associates.fullName} IS NOT NULL
  AND btrim(${associates.fullName}) <> ''
  AND ${associates.fullName} <> '(sem nome)'`;

const hasPrimaryEmailSql = sql`(
  ${associates.primaryEmailCiphertext} is not null
  or (${associates.primaryEmail} is not null and btrim(${associates.primaryEmail}) <> '')
)`;

function locationCondition(location: MalaDiretaFilters['location']): SQL | undefined {
  if (!location) return undefined;
  const locationType = assignmentLocationTypeSql(assignments.type, associates.locationCountry);
  if (location === 'brasil') return eq(locationType, 'nacional');
  if (location === 'exterior') return eq(locationType, 'exterior');
  return undefined;
}

function buildAudienceConditions(filters: MalaDiretaFilters): SQL | undefined {
  return and(
    filters.associationStatus
      ? eq(associates.associationStatus, filters.associationStatus)
      : undefined,
    filters.functionalStatus ? eq(associates.functionalStatus, filters.functionalStatus) : undefined,
    locationCondition(filters.location),
    hasPrintableAssociateName,
    hasPrimaryEmailSql,
  );
}

function needsAssignmentJoin(filters: MalaDiretaFilters): boolean {
  return Boolean(filters.location);
}

export async function countMalaDiretaAudience(filters: MalaDiretaFilters): Promise<number> {
  const conditions = buildAudienceConditions(filters);
  const selectTotal = { total: sql<number>`count(*)::int` };

  const [row] = needsAssignmentJoin(filters)
    ? await db
        .select(selectTotal)
        .from(associates)
        .leftJoin(assignments, eq(assignments.name, associates.assignment))
        .where(conditions)
    : await db.select(selectTotal).from(associates).where(conditions);

  return row?.total ?? 0;
}

export async function getMalaDiretaContacts(
  filters: MalaDiretaFilters,
  limit: number = MALA_DIRETA_DEFAULT_LIMIT,
): Promise<GmailContactRow[]> {
  const conditions = buildAudienceConditions(filters);
  const selectShape = {
    id: associates.id,
    fullName: associates.fullName,
    primaryEmail: associates.primaryEmail,
    primaryEmailCiphertext: associates.primaryEmailCiphertext,
  };

  const rows = needsAssignmentJoin(filters)
    ? await db
        .select(selectShape)
        .from(associates)
        .leftJoin(assignments, eq(assignments.name, associates.assignment))
        .where(conditions)
        .orderBy(asc(associates.fullName), asc(associates.id))
        .limit(limit + 1)
    : await db
        .select(selectShape)
        .from(associates)
        .where(conditions)
        .orderBy(asc(associates.fullName), asc(associates.id))
        .limit(limit + 1);

  if (rows.length > limit) {
    logger.warn('[mala-direta:queries] result truncated at limit', {
      count: rows.length,
      limit,
      truncated: true,
    });
    throw new Error(
      `Exportação excede o limite de ${limit} registros. Estreite os filtros para exportar.`,
    );
  }

  const contacts: GmailContactRow[] = [];
  for (const row of rows) {
    const email = decryptPiiField(
      row.primaryEmailCiphertext ?? null,
      row.primaryEmail ?? null,
    )?.trim();
    if (!email) continue;

    const { name, firstName, lastName } = splitContactName(row.fullName);
    if (!name) continue;

    contacts.push({ name, firstName, lastName, email });
  }

  return contacts;
}
