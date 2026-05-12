import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set for database schema integration tests.');
}

const db = postgres(databaseUrl, { max: 1 });

const expectedColumns = {
  activities: [
    'id:int8:NO',
    'title:text:NO',
    'description:text:YES',
    'status:activity_status:NO',
    'assignee_id:int8:YES',
    'due_date:timestamptz:YES',
    'priority:activity_priority:NO',
    'associate_id:int8:YES',
    'tags:jsonb:YES',
    'created_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
    'completed_at:timestamptz:YES',
    'position:float4:NO',
  ],
  admins: [
    'id:int8:NO',
    'name:text:NO',
    'email:text:NO',
    'password_hash:text:NO',
    'role:admin_role:NO',
    'is_active:bool:NO',
    'must_change_password:bool:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  associates: [
    'id:int8:NO',
    'source_row_number:text:YES',
    'full_name:text:NO',
    'cpf:text:YES',
    'primary_email:text:YES',
    'phone:text:YES',
    'whatsapp:text:YES',
    'siape:text:YES',
    'functional_status:functional_status:YES',
    'assignment:text:YES',
    'assignment_start_date:date:YES',
    'location_city:text:YES',
    'location_country:text:YES',
    'association_status:association_status:NO',
    'joined_at:timestamptz:YES',
    'association_category:text:YES',
    'contribution_status:contribution_status:NO',
    'address:text:YES',
    'secondary_email:text:YES',
    'internal_notes:text:YES',
    'birth_date:date:YES',
    'class_pattern:text:YES',
    'source_payload:text:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  audit_logs: [
    'id:int8:NO',
    'action:text:NO',
    'entity_type:audit_entity_type:NO',
    'entity_id:int8:YES',
    'performed_by:int8:YES',
    'changes:jsonb:YES',
    'metadata:jsonb:YES',
    'created_at:timestamptz:NO',
  ],
  assignments: [
    'id:int8:NO',
    'name:text:NO',
    'type:assignment_type:NO',
    'is_active:bool:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  legal_consultations: [
    'id:int8:NO',
    'internal_number:text:NO',
    'title:text:NO',
    'question_summary:text:NO',
    'question_full_text:text:YES',
    'associate_id:int8:YES',
    'answered_by:int8:YES',
    'final_answer:text:YES',
    'attachments:jsonb:YES',
    'sla_due_date:timestamptz:YES',
    'status:legal_consultation_status:NO',
    'satisfaction:legal_satisfaction:YES',
    'last_interaction_at:timestamptz:YES',
    'created_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  legal_notes: [
    'id:int8:NO',
    'entity_type:legal_note_entity_type:NO',
    'entity_id:int8:NO',
    'content:text:NO',
    'created_by:int8:NO',
    'is_escritorio_response:bool:NO',
    'created_at:timestamptz:NO',
  ],
  legal_opinion_tags: ['id:int8:NO', 'name:text:NO', 'created_at:timestamptz:NO'],
  legal_opinions: [
    'id:int8:NO',
    'title:text:NO',
    'content:text:NO',
    'tags:jsonb:YES',
    'attachments:jsonb:YES',
    'related_process_id:int8:YES',
    'created_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  legal_processes: [
    'id:int8:NO',
    'internal_number:text:NO',
    'external_number:text:YES',
    'title:text:NO',
    'type:legal_process_type:NO',
    'subtype:legal_process_subtype:NO',
    'associate_id:int8:YES',
    'status:legal_process_status:NO',
    'satisfaction:legal_satisfaction:YES',
    'office_deadline:timestamptz:YES',
    'legal_deadline:timestamptz:YES',
    'last_check_at:timestamptz:YES',
    'attachments:jsonb:YES',
    'created_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  login_attempts: [
    'id:int8:NO',
    'email:text:NO',
    'attempts:int8:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  rate_limits: [
    'id:int8:NO',
    'key:text:NO',
    'scope:text:NO',
    'attempts:int8:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
} as const;

const expectedEnums = {
  activity_priority: ['baixa', 'normal', 'alta', 'urgente'],
  activity_status: ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'],
  admin_role: ['admin', 'diretoria', 'secretaria'],
  assignment_type: ['domestic', 'abroad'],
  association_status: ['ativo', 'inativo'],
  audit_entity_type: ['associate', 'admin', 'activity', 'assignment', 'legal_consultation', 'legal_process'],
  contribution_status: ['em_dia', 'inadimplente', 'pendente_migracao'],
  functional_status: ['ativo', 'aposentado', 'cedido', 'em_licenca'],
  legal_consultation_status: ['aberta', 'aguardando_escritorio', 'respondida', 'arquivada'],
  legal_process_status: ['ativo', 'concluido', 'suspenso'],
  legal_process_subtype: ['justica_federal', 'stf', 'mre', 'cgu', 'tcu'],
  legal_process_type: ['judicial', 'administrativo'],
  legal_satisfaction: ['satisfeito', 'insatisfeito', 'sem_resposta'],
  legal_note_entity_type: ['consultation', 'process'],
} as const;

const expectedIndexes = {
  activities: [
    'activities_pkey',
    'idx_activities_assignee_id',
    'idx_activities_associate_due_id',
    'idx_activities_associate_id',
    'idx_activities_created_by',
    'idx_activities_open_due_date',
    'idx_activities_position',
    'idx_activities_status',
    'idx_activities_status_due_date',
    'idx_activities_tags',
  ],
  admins: ['admins_email_unique', 'admins_pkey'],
  associates: [
    'associates_pkey',
    'idx_associates_association_status',
    'idx_associates_birth_month',
    'idx_associates_contribution_status',
    'idx_associates_cpf',
    'idx_associates_name',
    'idx_associates_name_trgm',
    'idx_associates_primary_email',
    'idx_associates_siape',
    'idx_associates_status_country',
    'idx_associates_status_name',
  ],
  audit_logs: [
    'audit_logs_pkey',
    'idx_audit_created_at',
    'idx_audit_entity',
    'idx_audit_performed_by',
  ],
  assignments: [
    'assignments_pkey',
  ],
  legal_consultations: [
    'idx_legal_consultations_answered_by',
    'idx_legal_consultations_associate',
    'idx_legal_consultations_created_at',
    'idx_legal_consultations_created_by',
    'idx_legal_consultations_open_last_interaction',
    'idx_legal_consultations_open_sla',
    'idx_legal_consultations_responded',
    'idx_legal_consultations_sla',
    'idx_legal_consultations_status',
    'idx_legal_consultations_status_created_at',
    'idx_legal_consultations_status_updated_at',
    'idx_legal_consultations_title_trgm',
    'legal_consultations_internal_number_unique',
    'legal_consultations_pkey',
  ],
  legal_notes: [
    'idx_legal_notes_created_at',
    'idx_legal_notes_created_by',
    'idx_legal_notes_entity',
    'legal_notes_pkey',
  ],
  legal_opinion_tags: [
    'idx_legal_opinion_tags_name',
    'legal_opinion_tags_name_unique',
    'legal_opinion_tags_pkey',
  ],
  legal_opinions: [
    'idx_legal_opinions_created_at',
    'idx_legal_opinions_created_by',
    'idx_legal_opinions_related_process',
    'idx_legal_opinions_tags',
    'legal_opinions_pkey',
  ],
  legal_processes: [
    'idx_legal_processes_associate',
    'idx_legal_processes_created_by',
    'idx_legal_processes_last_check',
    'idx_legal_processes_status',
    'idx_legal_processes_type',
    'legal_processes_internal_number_unique',
    'legal_processes_pkey',
  ],
  login_attempts: [
    'idx_login_attempts_email',
    'idx_login_attempts_expires_at',
    'login_attempts_pkey',
  ],
  rate_limits: ['idx_rate_limits_expires_at', 'idx_rate_limits_key_scope', 'rate_limits_pkey'],
} as const;

afterAll(async () => {
  await db.end();
});

describe('database schema contract', () => {
  it('has all expected public tables and columns', async () => {
    const rows = await db<
      {
        table_name: string;
        column_name: string;
        udt_name: string;
        is_nullable: 'YES' | 'NO';
      }[]
    >`
      select table_name, column_name, udt_name, is_nullable
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `;

    const actual = rows.reduce<Record<string, string[]>>((acc, row) => {
      if (row.table_name.startsWith('pg_stat_statements')) return acc;
      acc[row.table_name] ??= [];
      acc[row.table_name].push(`${row.column_name}:${row.udt_name}:${row.is_nullable}`);
      return acc;
    }, {});

    expect(actual).toEqual(expectedColumns);
  });

  it('has all expected enum labels in the right order', async () => {
    const rows = await db<{ typname: string; enumlabel: string }[]>`
      select t.typname, e.enumlabel
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder
    `;

    const actual = rows.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.typname] ??= [];
      acc[row.typname].push(row.enumlabel);
      return acc;
    }, {});

    expect(actual).toEqual(expectedEnums);
  });

  it('has all expected indexes and unique constraints', async () => {
    const rows = await db<{ tablename: string; indexname: string }[]>`
      select tablename, indexname
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname
    `;

    const actual = rows.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.tablename] ??= [];
      acc[row.tablename].push(row.indexname);
      return acc;
    }, {});

    expect(actual).toEqual(expectedIndexes);
  });

  it('has pg_trgm available for trigram indexes', async () => {
    const rows = await db<{ extname: string }[]>`
      select extname
      from pg_extension
      where extname = 'pg_trgm'
    `;

    expect(rows).toEqual([{ extname: 'pg_trgm' }]);
  });

  it('has migration SQL files, journal entries, and DB migration history aligned', async () => {
    const migrationsDir = path.join(process.cwd(), 'drizzle/postgres');
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8'),
    ) as { entries: Array<{ idx: number; tag: string; when: number }> };

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    expect(sqlFiles).toEqual(journal.entries.map((entry) => `${entry.tag}.sql`));
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, index) => index),
    );

    const migrationRows = await db<{ id: number; created_at: string | number | bigint }[]>`
      select id, created_at
      from drizzle.__drizzle_migrations
      order by id
    `;

    const hasBigIntTimestamp = migrationRows.some((row) => typeof row.created_at === 'bigint');
    const actualTimestamps = migrationRows.map((row) =>
      hasBigIntTimestamp ? BigInt(row.created_at) : Number(row.created_at),
    );
    const expectedTimestamps = journal.entries.map((entry) =>
      hasBigIntTimestamp ? BigInt(entry.when) : entry.when,
    );

    expect(actualTimestamps).toEqual(expectedTimestamps);
  });
});
