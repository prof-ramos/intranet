import { afterAll, describe, expect, it, beforeAll } from 'vitest';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set for database schema integration tests.');
}

let db: postgres.Sql | null = null;
let connectionFailed = false;

beforeAll(async () => {
  try {
    db = postgres(databaseUrl, { max: 1 });
    await db`SELECT 1`;
  } catch (_error) {
    connectionFailed = true;
    if (db) {
      await db.end().catch(() => {});
    }
    db = null;
    console.warn('Skipping DB schema tests: database connection unavailable');
  }
});

const expectedColumns = {
  app_settings: ['key:varchar:NO', 'value_ciphertext:text:NO', 'updated_by:int8:NO', 'updated_at:timestamptz:NO'],
  activities: ['id:int8:NO', 'title:text:NO', 'description:text:YES', 'status:activity_status:NO', 'assignee_id:int8:YES', 'due_date:timestamptz:YES', 'priority:activity_priority:NO', 'associate_id:int8:YES', 'tags:jsonb:YES', 'created_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO', 'completed_at:timestamptz:YES', 'position:int4:NO'],
  admins: ['id:int8:NO', 'name:text:NO', 'email:text:NO', 'password_hash:text:NO', 'role:admin_role:NO', 'is_active:bool:NO', 'must_change_password:bool:NO', 'session_version:int4:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  associates: ['id:int8:NO', 'source_row_number:text:YES', 'full_name:text:NO', 'cpf:text:YES', 'cpf_ciphertext:text:YES', 'cpf_hash:text:YES', 'primary_email:text:YES', 'primary_email_ciphertext:text:YES', 'primary_email_hash:text:YES', 'phone:text:YES', 'phone_ciphertext:text:YES', 'phone_hash:text:YES', 'address:text:YES', 'address_ciphertext:text:YES', 'address_hash:text:YES', 'whatsapp:text:YES', 'whatsapp_ciphertext:text:YES', 'whatsapp_hash:text:YES', 'siape:text:YES', 'siape_ciphertext:text:YES', 'siape_hash:text:YES', 'functional_status:functional_status:YES', 'assignment:text:YES', 'assignment_start_date:date:YES', 'location_city:text:YES', 'location_country:text:YES', 'association_status:association_status:NO', 'joined_at:timestamptz:YES', 'association_category:text:YES', 'contribution_status:contribution_status:NO', 'secondary_email:text:YES', 'internal_notes:text:YES', 'birth_date:date:YES', 'class_pattern:text:YES', 'source_payload:text:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO', 'payment_method:payment_method:NO'],
  audit_logs: ['id:int8:NO', 'action:text:NO', 'entity_type:audit_entity_type:NO', 'entity_id:int8:YES', 'performed_by:int8:YES', 'changes:jsonb:YES', 'metadata:jsonb:YES', 'created_at:timestamptz:NO'],
  assignments: ['id:int8:NO', 'name:text:NO', 'type:assignment_type:NO', 'is_active:bool:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  domain_events: ['id:int8:NO', 'event_type:domain_event_type:NO', 'entity_type:domain_event_entity_type:NO', 'entity_id:int8:NO', 'actor_admin_id:int8:YES', 'payload:jsonb:NO', 'delivery_status:domain_event_delivery_status:NO', 'expires_at:timestamptz:YES', 'occurred_at:timestamptz:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  email_triagens: ['id:int8:NO', 'message_id:varchar:NO', 'thread_id:varchar:NO', 'history_id:varchar:YES', 'received_at:timestamptz:NO', 'sender:varchar:NO', 'original_recipient:varchar:YES', 'subject:varchar:NO', 'body_hash:bpchar:NO', 'body_excerpt:text:NO', 'raw_body_stored:bool:NO', 'redaction_applied:bool:NO', 'categoria:email_categoria:NO', 'resumo:text:NO', 'thread_context_summary:text:YES', 'ha_prazo:bool:NO', 'prazo_data:date:YES', 'prazo_hora:time:YES', 'prazo_confianca_data:email_confianca:YES', 'tipo_prazo:email_tipo_prazo:YES', 'trecho_fonte_do_prazo:text:YES', 'resumo_anexos:jsonb:NO', 'source_evidence:jsonb:NO', 'attachments_hashes:jsonb:NO', 'nivel_risco:email_nivel_risco:NO', 'confianca:email_confianca:NO', 'acao_recomendada:text:NO', 'responsavel_sugerido:email_responsavel:YES', 'exige_validacao_humana:bool:NO', 'legal_basis:varchar:NO'],
};

const expectedEnums = {
  activity_status: ['pending', 'in_progress', 'completed', 'cancelled'],
  activity_priority: ['low', 'medium', 'high', 'urgent'],
  admin_role: ['admin', 'diretoria', 'secretaria'],
  functional_status: ['ativo', 'aposentado', 'cedido', 'em_licenca'],
  association_status: ['ativo', 'inativo'],
  contribution_status: ['em_dia', 'inadimplente', 'pendente_migracao'],
  payment_method: ['folha', 'boleto', 'pix', 'transferencia', 'outros'],
  payment_status: ['pago', 'pendente', 'atrasado', 'isento', 'cancelado'],
  assignment_type: ['sede', 'exterior', 'outro'],
  domain_event_type: ['associate_created', 'associate_updated', 'monthly_payment_created', 'oficio_generated'],
  domain_event_entity_type: ['associate', 'monthly_payment', 'oficio'],
  domain_event_delivery_status: ['pending', 'delivered', 'failed', 'expired'],
  email_categoria: ['entrada', 'saida', 'interno', 'externo'],
  email_nivel_risco: ['baixo', 'medio', 'alto', 'critico'],
  email_confianca: ['baixa', 'media', 'alta'],
  email_tipo_prazo: ['diplomatico', 'interno', 'externo'],
  email_responsavel: ['juridico', 'diretoria', 'secretaria', 'financeiro'],
  audit_entity_type: ['associate', 'admin', 'activity', 'oficio', 'monthly_payment'],
};

const expectedIndexes = {
  associates: ['associates_pkey', 'idx_associates_cpf_hash', 'idx_associates_email_hash', 'idx_associates_full_name_trgm', 'idx_associates_primary_email_hash', 'idx_associates_siape_hash', 'idx_associates_whatsapp_hash'],
  admins: ['admins_pkey', 'idx_admins_email_unique'],
  activities: ['activities_pkey', 'idx_activities_assignee_id', 'idx_activities_associate_id', 'idx_activities_status'],
  audit_logs: ['audit_logs_pkey', 'idx_audit_logs_entity', 'idx_audit_logs_performed_by', 'idx_audit_logs_created_at'],
  domain_events: ['domain_events_pkey', 'idx_domain_events_delivery_status', 'idx_domain_events_entity', 'idx_domain_events_expires_at', 'idx_domain_events_occurred_at'],
  email_triagens: ['email_triagens_pkey', 'idx_email_triagens_message_id_unique', 'idx_email_triagens_received_at', 'idx_email_triagens_sender', 'idx_email_triagens_categoria', 'idx_email_triagens_nivel_risco'],
};

afterAll(async () => {
  if (db) {
    await db.end();
  }
});

describe('database schema contract', () => {
  it('has all expected public tables and columns', async () => {
    if (connectionFailed || !db) {
      return;
    }
    const rows = await db<{ table_name: string; column_name: string; udt_name: string; is_nullable: 'YES' | 'NO' }[]>`
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
    const unexpectedTables = Object.keys(actual).filter((tableName) => !(tableName in expectedColumns));
    expect(unexpectedTables).toEqual([]);
    for (const [tableName, expectedTableColumns] of Object.entries(expectedColumns)) {
      expect(actual[tableName]?.toSorted()).toEqual(expectedTableColumns.toSorted());
    }
  });

  it('has all expected enum labels', async () => {
    if (connectionFailed || !db) {
      return;
    }
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
    const unexpectedEnums = Object.keys(actual).filter((enumName) => !(enumName in expectedEnums));
    expect(unexpectedEnums).toEqual([]);
    for (const [enumName, expectedLabels] of Object.entries(expectedEnums)) {
      expect(actual[enumName]?.toSorted()).toEqual(expectedLabels.toSorted());
    }
  });

  it('has all expected indexes', async () => {
    if (connectionFailed || !db) {
      return;
    }
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
    const unexpectedIndexTables = Object.keys(actual).filter((tableName) => !(tableName in expectedIndexes));
    expect(unexpectedIndexTables).toEqual([]);
    for (const [tableName, expectedTableIndexes] of Object.entries(expectedIndexes)) {
      expect(actual[tableName]).toEqual(expectedTableIndexes);
    }
  });

  it('has pg_trgm available', async () => {
    if (connectionFailed || !db) {
      return;
    }
    const rows = await db<{ extname: string }[]>`
      select extname
      from pg_extension
      where extname = 'pg_trgm'
    `;
    expect(rows).toEqual([{ extname: 'pg_trgm' }]);
  });

  it('has migration journal aligned', async () => {
    const migrationsDir = path.join(process.cwd(), 'drizzle/postgres');
    const journal = JSON.parse(fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8')) as { entries: Array<{ idx: number; tag: string; when: number }> };
    const sqlFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
    expect(sqlFiles).toEqual(journal.entries.map((entry) => `${entry.tag}.sql`));
  });
});
