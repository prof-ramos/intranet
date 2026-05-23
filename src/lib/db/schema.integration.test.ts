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
  app_settings: [
    'key:text:NO',
    'value_ciphertext:text:NO',
    'updated_by:int8:NO',
    'updated_at:timestamptz:NO',
  ],
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
    'position:int4:NO',
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
    'cpf_ciphertext:text:YES',
    'cpf_hash:text:YES',
    'primary_email:text:YES',
    'primary_email_ciphertext:text:YES',
    'primary_email_hash:text:YES',
    'phone:text:YES',
    'phone_ciphertext:text:YES',
    'phone_hash:text:YES',
    'address:text:YES',
    'address_ciphertext:text:YES',
    'address_hash:text:YES',
    'whatsapp:text:YES',
    'whatsapp_ciphertext:text:YES',
    'whatsapp_hash:text:YES',
    'siape:text:YES',
    'siape_ciphertext:text:YES',
    'siape_hash:text:YES',
    'functional_status:functional_status:YES',
    'assignment:text:YES',
    'assignment_start_date:date:YES',
    'location_city:text:YES',
    'location_country:text:YES',
    'association_status:association_status:NO',
    'joined_at:timestamptz:YES',
    'association_category:text:YES',
    'contribution_status:contribution_status:NO',
    'secondary_email:text:YES',
    'internal_notes:text:YES',
    'birth_date:date:YES',
    'class_pattern:text:YES',
    'source_payload:text:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
    'payment_method:payment_method:NO',
  ],
  associates_list_view: [
    'id:int8:YES',
    'full_name:text:YES',
    'assignment:text:YES',
    'class_pattern:text:YES',
    'association_status:association_status:YES',
    'functional_status:functional_status:YES',
    'contribution_status:contribution_status:YES',
    'location_country:text:YES',
    'location_city:text:YES',
    'created_at:timestamptz:YES',
    'updated_at:timestamptz:YES',
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
  domain_events: [
    'id:int8:NO',
    'event_type:domain_event_type:NO',
    'entity_type:domain_event_entity_type:NO',
    'entity_id:int8:NO',
    'actor_admin_id:int8:YES',
    'payload:jsonb:NO',
    'delivery_status:domain_event_delivery_status:NO',
    'expires_at:timestamptz:YES',
    'occurred_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  integration_api_keys: [
    'id:int8:NO',
    'name:text:NO',
    'key_hash:text:NO',
    'scopes:jsonb:NO',
    'is_active:bool:NO',
    'last_used_at:timestamptz:YES',
    'created_by:int8:NO',
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
    'email:text:YES',
    'email_hash:text:YES',
    'attempts:int4:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  login_attempts_dedup_backup: [
    'id:int8:NO',
    'email:text:YES',
    'email_hash:text:YES',
    'attempts:int4:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
    'backed_up_at:timestamptz:NO',
    'backup_reason:text:NO',
  ],
  rate_limits: [
    'id:int8:NO',
    'key:text:NO',
    'scope:text:NO',
    'attempts:int4:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  monthly_payments: [
    'id:int8:NO',
    'associate_id:int8:NO',
    'year:int4:NO',
    'month:int4:NO',
    'status:payment_status:NO',
    'payment_method:payment_method:NO',
    'paid_at:timestamptz:YES',
    'cancelled_at:timestamptz:YES',
    'cancellation_reason:text:YES',
    'cancelled_by:int8:YES',
    'updated_by:int8:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  oficios: [
    'id:int8:NO',
    'number:text:NO',
    'year:int4:NO',
    'sequence:int4:NO',
    'recipient:text:NO',
    'recipient_role:text:NO',
    'vocativo:text:NO',
    'letter_date:text:NO',
    'subject:text:NO',
    'itamaraty_sector:text:NO',
    'signatory_name:text:NO',
    'signatory_role:text:NO',
    'closure:text:NO',
    'body_rich_text:text:NO',
    'body_plain_text:text:NO',
    'pdf_storage_path:text:YES',
    'status:official_letter_status:NO',
    'created_by:int8:NO',
    'updated_by:int8:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  documents: [
    'id:int8:NO',
    'name:text:NO',
    'description:text:YES',
    'category:document_category:NO',
    'storage_path:text:NO',
    'file_size:int4:NO',
    'file_type:text:NO',
    'uploaded_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  webhook_deliveries: [
    'id:int8:NO',
    'domain_event_id:int8:NO',
    'webhook_subscription_id:int8:NO',
    'attempt:int4:NO',
    'request_id:text:NO',
    'idempotency_key:text:YES',
    'status:webhook_delivery_status:NO',
    'status_code:int4:YES',
    'response_excerpt:text:YES',
    'failure_reason:text:YES',
    'delivered_at:timestamptz:YES',
    'next_retry_at:timestamptz:YES',
    'failed_at:timestamptz:YES',
    'created_at:timestamptz:NO',
  ],
  webhook_subscriptions: [
    'id:int8:NO',
    'name:text:NO',
    'target_url:text:NO',
    'secret_ciphertext:text:NO',
    'subscribed_events:jsonb:NO',
    'is_active:bool:NO',
    'created_by:int8:NO',
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
  audit_entity_type: [
    'associate',
    'admin',
    'activity',
    'assignment',
    'legal_consultation',
    'legal_process',
    'finance',
    'monthly_payment',
    'official_letter',
    'domain_event',
    'webhook_subscription',
    'document',
  ],
  contribution_status: ['em_dia', 'inadimplente', 'pendente_migracao'],
  document_category: [
    'modelo_contrato',
    'contrato',
    'minuta',
    'estatuto',
    'ata',
    'oficio',
    'rh',
    'evento',
    'nota_fiscal',
    'comprovante',
    'outro',
  ],
  domain_event_delivery_status: [
    'pending',
    'processing',
    'delivered',
    'partially_delivered',
    'failed',
  ],
  domain_event_entity_type: [
    'associate',
    'legal_consultation',
    'official_letter',
    'monthly_payment',
  ],
  domain_event_type: [
    'associate.updated',
    'legal_consultation.created',
    'legal_consultation.status_changed',
    'official_letter.created',
    'monthly_payment.updated',
    'official_letter.published',
  ],
  functional_status: ['ativo', 'aposentado', 'cedido', 'em_licenca'],
  legal_consultation_status: ['aberta', 'aguardando_escritorio', 'respondida', 'arquivada'],
  legal_process_status: ['ativo', 'concluido', 'suspenso'],
  legal_process_subtype: ['justica_federal', 'stf', 'mre', 'cgu', 'tcu'],
  legal_process_type: ['judicial', 'administrativo'],
  legal_satisfaction: ['satisfeito', 'insatisfeito', 'sem_resposta'],
  legal_note_entity_type: ['consultation', 'process'],
  official_letter_status: ['gerado', 'cancelado', 'rascunho'],
  payment_method: ['folha', 'boleto', 'pix', 'transferencia', 'outros'],
  payment_status: ['pago', 'pendente', 'atrasado', 'isento', 'cancelado'],
  webhook_delivery_status: ['pending', 'delivered', 'failed', 'retry_scheduled'],
} as const;

const expectedIndexes = {
  app_settings: ['app_settings_pkey', 'idx_app_settings_updated_by'],
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
    'idx_associates_address_hash',
    'idx_associates_association_status',
    'idx_associates_birth_month',
    'idx_associates_contribution_status',
    'idx_associates_cpf',
    'idx_associates_cpf_hash',
    'idx_associates_name_trgm',
    'idx_associates_phone_hash',
    'idx_associates_primary_email',
    'idx_associates_primary_email_hash',
    'idx_associates_siape',
    'idx_associates_siape_hash',
    'idx_associates_status_country',
    'idx_associates_status_name',
    'idx_associates_whatsapp_hash',
  ],
  audit_logs: [
    'audit_logs_pkey',
    'idx_audit_created_at',
    'idx_audit_entity',
    'idx_audit_performed_by',
  ],
  assignments: ['assignments_pkey'],
  domain_events: [
    'domain_events_pkey',
    'idx_domain_events_actor_admin_id',
    'idx_domain_events_delivery_status',
    'idx_domain_events_entity',
    'idx_domain_events_event_type',
    'idx_domain_events_expires_at',
    'idx_domain_events_occurred_at',
    'idx_domain_events_pending',
    'idx_domain_events_status_occurred_at',
  ],
  integration_api_keys: [
    'idx_integration_api_keys_active',
    'idx_integration_api_keys_created_by',
    'idx_integration_api_keys_key_hash_unique',
    'idx_integration_api_keys_name_unique',
    'integration_api_keys_pkey',
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
    'idx_login_attempts_email_hash_unique',
    'idx_login_attempts_expires_at',
    'login_attempts_pkey',
  ],
  login_attempts_dedup_backup: ['login_attempts_dedup_backup_pkey'],
  monthly_payments: [
    'idx_monthly_payments_associate_id',
    'idx_monthly_payments_cancelled_at',
    'idx_monthly_payments_status',
    'idx_monthly_payments_unique',
    'idx_monthly_payments_updated_by',
    'idx_monthly_payments_year_month_method',
    'idx_monthly_payments_year_month_status',
    'monthly_payments_pkey',
  ],
  oficios: [
    'idx_oficios_created_at',
    'idx_oficios_created_at_desc',
    'idx_oficios_created_by',
    'idx_oficios_status',
    'idx_oficios_updated_by',
    'idx_oficios_year',
    'oficios_number_key',
    'oficios_pkey',
    'uq_oficios_year_sequence',
  ],
  rate_limits: ['idx_rate_limits_expires_at', 'idx_rate_limits_key_scope', 'rate_limits_pkey'],
  webhook_deliveries: [
    'idx_webhook_deliveries_domain_event_id',
    'idx_webhook_deliveries_request_id_unique',
    'idx_webhook_deliveries_status',
    'idx_webhook_deliveries_status_next_retry_at',
    'idx_webhook_deliveries_subscription_attempt_unique',
    'idx_webhook_deliveries_webhook_subscription_id',
    'webhook_deliveries_pkey',
  ],
  webhook_subscriptions: [
    'idx_webhook_subscriptions_active',
    'idx_webhook_subscriptions_active_partial',
    'idx_webhook_subscriptions_created_by',
    'idx_webhook_subscriptions_name_unique',
    'idx_webhook_subscriptions_subscribed_events',
    'idx_webhook_subscriptions_target_url',
    'webhook_subscriptions_pkey',
  ],
  documents: [
    'documents_pkey',
    'idx_documents_category',
    'idx_documents_created_at',
    'idx_documents_description_trgm',
    'idx_documents_name_trgm',
    'idx_documents_uploaded_by',
  ],
} as const;

const expectedAppTables = Object.keys(expectedColumns)
  .filter((name) => name !== 'associates_list_view')
  .sort();
// These allow known local/dev-only DB artifacts without weakening the production schema contract.
// Add entries only for temporary local fixtures and promote them to expected* lists when migrations require them.
const allowedLocalOnlyTables = ['notifications'] as const;
const allowedLocalOnlyEnums = ['notification_entity_type', 'notification_type'] as const;
const allowedLocalOnlyIndexTables = ['notifications'] as const;

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

    const unexpectedTables = Object.keys(actual)
      .filter((tableName) => !(tableName in expectedColumns))
      .filter((tableName) => !allowedLocalOnlyTables.includes(tableName as never));
    expect(unexpectedTables).toEqual([]);
    for (const [tableName, expectedTableColumns] of Object.entries(expectedColumns)) {
      expect(actual[tableName]?.toSorted()).toEqual(expectedTableColumns.toSorted());
    }
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

    const unexpectedEnums = Object.keys(actual)
      .filter((enumName) => !(enumName in expectedEnums))
      .filter((enumName) => !allowedLocalOnlyEnums.includes(enumName as never));
    expect(unexpectedEnums).toEqual([]);
    for (const [enumName, expectedLabels] of Object.entries(expectedEnums)) {
      expect(actual[enumName]).toEqual(expectedLabels);
    }
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

    const unexpectedIndexTables = Object.keys(actual)
      .filter((tableName) => !(tableName in expectedIndexes))
      .filter((tableName) => !allowedLocalOnlyIndexTables.includes(tableName as never));
    expect(unexpectedIndexTables).toEqual([]);
    for (const [tableName, expectedTableIndexes] of Object.entries(expectedIndexes)) {
      expect(actual[tableName]).toEqual(expectedTableIndexes);
    }
  });

  it('has all expected CHECK constraints for range validation', async () => {
    const rows = await db<
      {
        table_name: string;
        constraint_name: string;
        check_clause: string;
      }[]
    >`
      select ccu.table_name, tc.constraint_name, cc.check_clause
      from information_schema.check_constraints cc
      join information_schema.table_constraints tc
        on cc.constraint_catalog = tc.constraint_catalog
        and cc.constraint_schema = tc.constraint_schema
        and cc.constraint_name = tc.constraint_name
        and tc.constraint_type = 'CHECK'
      join information_schema.constraint_column_usage ccu
        on tc.constraint_catalog = ccu.constraint_catalog
        and tc.constraint_schema = ccu.constraint_schema
        and tc.constraint_name = ccu.constraint_name
      where tc.constraint_schema = 'public'
        and tc.constraint_name like 'chk_%'
      order by ccu.table_name, tc.constraint_name
    `;

    const actual = rows.map((row) => `${row.table_name}:${row.constraint_name}`);
    const expected = [
      'documents:chk_documents_file_size',
      'monthly_payments:chk_monthly_payments_month',
      'monthly_payments:chk_monthly_payments_year',
      'oficios:chk_oficios_sequence',
      'oficios:chk_oficios_year',
      'webhook_deliveries:chk_webhook_deliveries_attempt',
    ];
    expect(actual).toEqual(expected);
  });

  it('has pg_trgm available for trigram indexes', async () => {
    const rows = await db<{ extname: string }[]>`
      select extname
      from pg_extension
      where extname = 'pg_trgm'
    `;

    expect(rows).toEqual([{ extname: 'pg_trgm' }]);
  });

  it('has RLS enabled with at least one policy on every app table', async () => {
    const rows = await db<{ relname: string; relrowsecurity: boolean; policy_count: number }[]>`
      select c.relname, c.relrowsecurity, count(p.polname)::int as policy_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy p on p.polrelid = c.oid
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any(${expectedAppTables})
      group by c.relname, c.relrowsecurity
      order by c.relname
    `;

    expect(rows.map((row) => row.relname)).toEqual(expectedAppTables);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    expect(rows.every((row) => row.policy_count > 0)).toBe(true);
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

    expect(actualTimestamps).toEqual(expect.arrayContaining(expectedTimestamps));
  });
});
