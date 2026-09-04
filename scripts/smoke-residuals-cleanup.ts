/**
 * Inventário / limpeza de resíduos SMOKE_* (produção ou qualquer Postgres).
 *
 * Uso:
 *   DATABASE_MIGRATION_URL=... node --import tsx scripts/smoke-residuals-cleanup.ts
 *   DATABASE_MIGRATION_URL=... node --import tsx scripts/smoke-residuals-cleanup.ts --apply
 *
 * - report (default): imprime contagens JSON (sem PII)
 * - --apply: DELETE em transação (audit_logs intacto), exige
 *   ALLOW_SMOKE_RESIDUAL_CLEANUP=CLEAN-SMOKE-RESIDUALS
 *
 * Pattern amplo: LIKE 'SMOKE_%' / '%SMOKE_%' (não run-scoped).
 * Preferir o SQL impresso pelo smoke mutante quando o alvo é um run específico.
 */

import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');
const CONFIRM_ENV = 'ALLOW_SMOKE_RESIDUAL_CLEANUP';
const CONFIRM_VALUE = 'CLEAN-SMOKE-RESIDUALS';

type Counts = {
  associates: number;
  activities: number;
  legal_consultations: number;
  oficios: number;
  notifications: number;
  domain_events: number;
  webhook_deliveries: number;
  dependents: number;
  health_agreements: number;
  legal_notes: number;
};

function requireMigrationUrl(): string {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    throw new Error('DATABASE_MIGRATION_URL is required');
  }
  return url;
}

async function inventory(sql: postgres.Sql): Promise<Counts> {
  const [row] = await sql<Counts[]>`
    SELECT
      (SELECT count(*)::int FROM associates WHERE full_name LIKE 'SMOKE_%') AS associates,
      (SELECT count(*)::int FROM activities WHERE title LIKE 'SMOKE_%') AS activities,
      (SELECT count(*)::int FROM legal_consultations WHERE title LIKE 'SMOKE_%') AS legal_consultations,
      (SELECT count(*)::int FROM oficios WHERE subject LIKE 'SMOKE_%') AS oficios,
      (SELECT count(*)::int FROM notifications
        WHERE title LIKE '%SMOKE_%' OR message LIKE '%SMOKE_%') AS notifications,
      (SELECT count(*)::int FROM domain_events
        WHERE payload::text LIKE '%SMOKE_%') AS domain_events,
      (SELECT count(*)::int FROM webhook_deliveries wd
        WHERE wd.domain_event_id IN (
          SELECT id FROM domain_events WHERE payload::text LIKE '%SMOKE_%'
        )) AS webhook_deliveries,
      (SELECT count(*)::int FROM dependents d
        WHERE d.associate_id IN (SELECT id FROM associates WHERE full_name LIKE 'SMOKE_%')) AS dependents,
      (SELECT count(*)::int FROM health_agreements h
        WHERE h.associate_id IN (SELECT id FROM associates WHERE full_name LIKE 'SMOKE_%')) AS health_agreements,
      (SELECT count(*)::int FROM legal_notes ln
        WHERE ln.entity_type = 'consultation'
          AND ln.entity_id IN (SELECT id FROM legal_consultations WHERE title LIKE 'SMOKE_%')) AS legal_notes
  `;
  return row;
}

async function applyCleanup(sql: postgres.Sql): Promise<Counts> {
  return sql.begin(async (tx) => {
    // Capture IDs first (same shape as e2e/smoke-prod.spec.ts afterAll)
    await tx`
      CREATE TEMP TABLE smoke_all_activities ON COMMIT DROP AS
      SELECT id FROM activities WHERE title LIKE 'SMOKE_%'
    `;
    await tx`
      CREATE TEMP TABLE smoke_all_associates ON COMMIT DROP AS
      SELECT id FROM associates WHERE full_name LIKE 'SMOKE_%'
    `;
    await tx`
      CREATE TEMP TABLE smoke_all_consultations ON COMMIT DROP AS
      SELECT id FROM legal_consultations WHERE title LIKE 'SMOKE_%'
    `;
    await tx`
      CREATE TEMP TABLE smoke_all_oficios ON COMMIT DROP AS
      SELECT id FROM oficios WHERE subject LIKE 'SMOKE_%'
    `;
    await tx`
      CREATE TEMP TABLE smoke_all_domain_events ON COMMIT DROP AS
      SELECT id FROM domain_events
      WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_all_activities))
         OR (entity_type = 'associate' AND entity_id IN (SELECT id FROM smoke_all_associates))
         OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_all_consultations))
         OR (entity_type = 'official_letter' AND entity_id IN (SELECT id FROM smoke_all_oficios))
         OR payload::text LIKE '%SMOKE_%'
    `;

    await tx`
      DELETE FROM webhook_deliveries
      WHERE domain_event_id IN (SELECT id FROM smoke_all_domain_events)
    `;
    await tx`
      DELETE FROM domain_events
      WHERE id IN (SELECT id FROM smoke_all_domain_events)
    `;
    await tx`DELETE FROM activities WHERE id IN (SELECT id FROM smoke_all_activities)`;
    await tx`DELETE FROM associates WHERE id IN (SELECT id FROM smoke_all_associates)`;
    await tx`
      DELETE FROM legal_notes
      WHERE entity_type = 'consultation'
        AND entity_id IN (SELECT id FROM smoke_all_consultations)
    `;
    await tx`DELETE FROM legal_consultations WHERE id IN (SELECT id FROM smoke_all_consultations)`;
    await tx`DELETE FROM oficios WHERE id IN (SELECT id FROM smoke_all_oficios)`;
    await tx`
      DELETE FROM notifications
      WHERE (entity_type = 'activity' AND entity_id IN (SELECT id FROM smoke_all_activities))
         OR (entity_type = 'legal_consultation' AND entity_id IN (SELECT id FROM smoke_all_consultations))
         OR (entity_type = 'oficio' AND entity_id IN (SELECT id FROM smoke_all_oficios))
         OR title LIKE '%SMOKE_%'
         OR message LIKE '%SMOKE_%'
    `;

    const after = await inventory(tx as unknown as postgres.Sql);
    const residual =
      after.associates +
      after.activities +
      after.legal_consultations +
      after.oficios +
      after.notifications +
      after.domain_events +
      after.webhook_deliveries;
    if (residual !== 0) {
      throw new Error(`smoke_cleanup_incomplete: ${JSON.stringify(after)}`);
    }
    return after;
  });
}

async function main() {
  const url = requireMigrationUrl();
  if (APPLY && process.env[CONFIRM_ENV] !== CONFIRM_VALUE) {
    throw new Error(
      `--apply requer ${CONFIRM_ENV}=${CONFIRM_VALUE} (audit_logs não é tocado).`,
    );
  }

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    prepare: false,
  });

  try {
    const before = await inventory(sql);
    if (!APPLY) {
      console.log(JSON.stringify({ mode: 'report', counts: before }, null, 2));
      const total = Object.values(before).reduce((a, b) => a + b, 0);
      process.exitCode = total > 0 ? 2 : 0;
      return;
    }

    const after = await applyCleanup(sql);
    console.log(JSON.stringify({ mode: 'apply', before, after }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
