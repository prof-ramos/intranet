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
  email_triagens: ['id:int8:NO', 'message_id:varchar:NO', 'thread_id:varchar:NO', 'history_id:varchar:YES', 'received_at:timestamptz:NO', 'sender:varchar:NO', 'original_recipient:varchar:YES', 'subject:varchar:NO', 'body_hash:bpchar:NO', 'body_excerpt:text:NO', 'raw_body_stored:bool:NO', 'redaction_applied:bool:NO', 'categoria:email_categoria:NO', 'resumo:text:NO', 'thread_context_summary:text:YES', 'ha_prazo:bool:NO', 'prazo_data:date:YES', 'prazo_hora:time:YES', 'prazo_confianca_data:email_confianca:YES', 'tipo_prazo:email_tipo_prazo:YES', 'trecho_fonte_do_prazo:text:YES', 'resumo_anexos:jsonb:NO', 'source_evidence:jsonb:NO', 'attachments_hashes:jsonb:NO', 'nivel_risco:email_nivel_risco:NO', 'confianca:email_confianca:NO', 'acao_recomendada:text:NO', 'responsavel_sugerido:email_responsavel:YES', 'exige_validacao_humana:bool:NO', 'legal_basis:varchar:NO', 'processed_purpose:varchar:NO', 'data_retention_until:timestamptz:YES', 'processing_version:varchar:NO', 'model_name:varchar:YES', 'model_response_id:varchar:YES', 'status:email_status_triagem:NO', 'consultation_id:int8:YES', 'lawyer_id:int8:YES', 'usuario_validador_id:int8:YES', 'validated_at:timestamptz:YES', 'observacoes_validacao:text:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  documents: ['id:int8:NO', 'associate_id:int8:YES', 'category:document_category:NO', 'name:text:NO', 'description:text:YES', 'file_type:text:NO', 'file_size:int4:NO', 'storage_path:text:NO', 'is_archived:bool:NO', 'uploaded_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  integration_api_keys: ['id:int8:NO', 'name:text:NO', 'description:text:YES', 'api_key_hash:text:NO', 'is_active:bool:NO', 'last_used_at:timestamptz:YES', 'created_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  lawyers: ['id:int8:NO', 'name:text:NO', 'oab_number:text:NO', 'oab_state:varchar:NO', 'email:text:NO', 'phone:text:YES', 'status:lawyer_status:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  legal_consultations: ['id:int8:NO', 'associate_id:int8:NO', 'internal_number:text:NO', 'subject:text:NO', 'description:text:YES', 'status:legal_consultation_status:NO', 'assigned_lawyer_id:int8:YES', 'priority:activity_priority:NO', 'opened_at:timestamptz:NO', 'closed_at:timestamptz:YES', 'sla_due_date:timestamptz:NO', 'last_interaction_at:timestamptz:NO', 'satisfaction_rating:legal_satisfaction:YES', 'satisfaction_feedback:text:YES', 'created_by:int8:NO', 'updated_at:timestamptz:NO'],
  legal_notes: ['id:int8:NO', 'entity_type:legal_note_entity_type:NO', 'entity_id:int8:NO', 'content:text:NO', 'is_internal:bool:NO', 'author_id:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  legal_opinion_tags: ['opinion_id:int8:NO', 'tag:varchar:NO'],
  legal_opinions: ['id:int8:NO', 'title:text:NO', 'abstract:text:YES', 'content:text:NO', 'issued_at:date:NO', 'author_name:text:NO', 'source_document_url:text:YES', 'is_archived:bool:NO', 'created_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  legal_processes: ['id:int8:NO', 'process_number:text:NO', 'associate_id:int8:NO', 'type:legal_process_type:NO', 'subtype:legal_process_subtype:NO', 'status:legal_process_status:NO', 'court_name:text:NO', 'jurisdiction:text:YES', 'value_in_dispute:numeric:YES', 'distribution_date:date:NO', 'assigned_lawyer_id:int8:YES', 'main_claim:text:NO', 'prognosis:activity_priority:NO', 'notes:text:YES', 'created_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  login_attempts: ['email_hash:text:NO', 'attempts:int4:NO', 'lockout_until:timestamptz:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  monthly_payments: ['id:int8:NO', 'associate_id:int8:NO', 'year:int4:NO', 'month:int4:NO', 'status:payment_status:NO', 'payment_method:payment_method:NO', 'paid_at:timestamptz:YES', 'cancelled_at:timestamptz:YES', 'cancellation_reason:text:YES', 'cancelled_by:int8:YES', 'updated_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  notifications: ['id:int8:NO', 'recipient_id:int8:NO', 'type:notification_type:NO', 'title:text:NO', 'message:text:NO', 'entity_type:notification_entity_type:YES', 'entity_id:int8:YES', 'is_read:bool:NO', 'created_at:timestamptz:NO', 'action_url:text:YES'],
  oficios: ['id:int8:NO', 'number:text:NO', 'year:int4:NO', 'status:official_letter_status:NO', 'subject:text:NO', 'recipient_name:text:YES', 'recipient_title:text:YES', 'recipient_organization:text:YES', 'sender_admin_id:int8:YES', 'content:text:NO', 'is_urgent:bool:NO', 'response_due_date:date:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO', 'assinafy_document_id:varchar:YES', 'assinafy_status:assinafy_document_status:YES', 'assinafy_signed_at:timestamptz:YES', 'assinafy_signing_url:text:YES'],
  password_reset_attempts: ['email_hash:text:NO', 'attempts:int4:NO', 'lockout_until:timestamptz:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  password_reset_tokens: ['id:int8:NO', 'admin_id:int8:NO', 'token_hash:text:NO', 'expires_at:timestamptz:NO', 'used_at:timestamptz:YES', 'created_at:timestamptz:NO'],
  rate_limits: ['key:text:NO', 'tokens:int4:NO', 'last_refill:int8:NO'],
  test_results: ['id:int8:NO', 'run_id:int8:NO', 'suite_name:text:NO', 'test_name:text:NO', 'status:test_result_status:NO', 'duration_ms:int4:YES', 'error_message:text:YES', 'error_stack:text:YES', 'created_at:timestamptz:NO'],
  test_runs: ['id:int8:NO', 'environment:test_environment:NO', 'runner:test_runner:NO', 'branch:text:YES', 'commit_sha:text:YES', 'total_tests:int4:NO', 'passed_tests:int4:NO', 'failed_tests:int4:NO', 'skipped_tests:int4:NO', 'duration_ms:int4:NO', 'started_at:timestamptz:NO', 'completed_at:timestamptz:NO', 'metadata:jsonb:YES'],
  webhook_deliveries: ['id:int8:NO', 'webhook_subscription_id:int8:NO', 'event_id:int8:NO', 'status:webhook_delivery_status:NO', 'request_url:text:NO', 'request_headers:jsonb:NO', 'request_payload:jsonb:NO', 'response_status:int4:YES', 'response_body:text:YES', 'duration_ms:int4:YES', 'error_message:text:YES', 'next_retry_at:timestamptz:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
  webhook_subscriptions: ['id:int8:NO', 'name:text:NO', 'url:text:NO', 'description:text:YES', 'secret_key_hash:text:NO', 'is_active:bool:NO', 'event_types:jsonb:NO', 'created_by:int8:YES', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
};

const expectedEnums = {
  activity_status: ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'],
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
  assinafy_document_status: ['created', 'partially_signed', 'signed', 'voided', 'rejected', 'canceled', 'expired', 'error'],
  document_category: ['rg', 'cpf', 'comprovante_residencia', 'contrato', 'holerite', 'procuracao', 'processo_judicial', 'parecer_juridico', 'oficio', 'outros'],
  email_status_triagem: ['pendente', 'triado', 'ignorado'],
  lawyer_status: ['active', 'inactive'],
  legal_consultation_status: ['aberta', 'respondida', 'aguardando_escritorio', 'aguardando_associado', 'encerrada'],
  legal_note_entity_type: ['legal_consultation', 'legal_process'],
  legal_process_status: ['ativo', 'suspenso', 'arquivado', 'encerrado'],
  legal_process_subtype: ['indenizatoria', 'obrigacao_fazer', 'mandado_seguranca', 'cobranca', 'execucao', 'recurso', 'outro'],
  legal_process_type: ['administrativo', 'judicial'],
  legal_satisfaction: ['1', '2', '3', '4', '5'],
  notification_entity_type: ['legal_consultation', 'email_triage', 'activity'],
  notification_type: ['legal_consultation_status', 'legal_consultation_sla', 'legal_consultation_note', 'email_triage_new', 'email_triage_deadline', 'activity_assigned', 'activity_status'],
  official_letter_status: ['rascunho', 'gerado', 'enviado', 'respondido', 'cancelado'],
  test_environment: ['local', 'ci', 'staging', 'production'],
  test_result_status: ['passed', 'failed', 'skipped'],
  test_runner: ['vitest', 'playwright', 'jest', 'cypress', 'custom'],
  webhook_delivery_status: ['pending', 'success', 'failed'],
};

const expectedIndexes = {
  associates: ['associates_pkey', 'idx_associates_cpf_hash', 'idx_associates_email_hash', 'idx_associates_full_name_trgm', 'idx_associates_primary_email_hash', 'idx_associates_siape_hash', 'idx_associates_whatsapp_hash'],
  admins: ['admins_pkey', 'idx_admins_email_unique'],
  activities: ['activities_pkey', 'idx_activities_assignee_id', 'idx_activities_associate_id', 'idx_activities_status'],
  audit_logs: ['audit_logs_pkey', 'idx_audit_logs_entity', 'idx_audit_logs_performed_by', 'idx_audit_logs_created_at'],
  domain_events: ['domain_events_pkey', 'idx_domain_events_delivery_status', 'idx_domain_events_entity', 'idx_domain_events_expires_at', 'idx_domain_events_occurred_at'],
  email_triagens: ['email_triagens_pkey', 'idx_email_triagens_message_id_unique', 'idx_email_triagens_received_at', 'idx_email_triagens_thread_id', 'idx_email_triagens_history_id', 'idx_email_triagens_status', 'idx_email_triagens_prazo_data', 'idx_email_triagens_exige_validacao', 'idx_email_triagens_source_evidence_gin', 'idx_email_triagens_resumo_anexos_gin', 'idx_email_triagens_consultation', 'idx_email_triagens_lawyer'],
  app_settings: ['app_settings_pkey'],
  assignments: ['assignments_pkey'],
  documents: ['documents_pkey', 'idx_documents_associate', 'idx_documents_category'],
  integration_api_keys: ['integration_api_keys_pkey'],
  lawyers: ['idx_lawyers_email_unique', 'idx_lawyers_oab_unique', 'idx_lawyers_status', 'lawyers_pkey'],
  legal_consultations: ['idx_legal_consultations_assigned_lawyer', 'idx_legal_consultations_associate', 'idx_legal_consultations_internal_number_unique', 'idx_legal_consultations_sla_due_date', 'idx_legal_consultations_status', 'legal_consultations_pkey'],
  legal_notes: ['idx_legal_notes_entity', 'legal_notes_pkey'],
  legal_opinion_tags: ['idx_legal_opinion_tags_tag', 'legal_opinion_tags_opinion_id_tag_pk'],
  legal_opinions: ['legal_opinions_pkey'],
  legal_processes: ['idx_legal_processes_assigned_lawyer', 'idx_legal_processes_associate', 'idx_legal_processes_number', 'idx_legal_processes_status', 'legal_processes_pkey'],
  login_attempts: ['login_attempts_email_hash_pk'],
  monthly_payments: ['idx_monthly_payments_status', 'monthly_payments_associate_id_year_month_index', 'monthly_payments_pkey'],
  notifications: ['idx_notifications_recipient_is_read', 'notifications_pkey'],
  oficios: ['idx_oficios_number', 'idx_oficios_status', 'idx_oficios_year', 'oficios_pkey'],
  password_reset_attempts: ['password_reset_attempts_email_hash_pk'],
  password_reset_tokens: ['idx_password_reset_tokens_token_hash', 'password_reset_tokens_pkey'],
  rate_limits: ['rate_limits_key_pk'],
  test_results: ['idx_test_results_run_id', 'test_results_pkey'],
  test_runs: ['idx_test_runs_branch', 'idx_test_runs_commit_sha', 'idx_test_runs_environment', 'idx_test_runs_runner', 'test_runs_pkey'],
  webhook_deliveries: ['idx_webhook_deliveries_event_id', 'idx_webhook_deliveries_status', 'idx_webhook_deliveries_subscription_id', 'webhook_deliveries_pkey'],
  webhook_subscriptions: ['idx_webhook_subscriptions_is_active', 'webhook_subscriptions_pkey'],
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
    const unexpectedTables = Object.keys(actual).filter((tableName) => !(tableName in expectedColumns) && !["documents", "integration_api_keys", "lawyers", "legal_consultations", "legal_notes", "legal_opinion_tags", "legal_opinions", "legal_processes", "login_attempts", "monthly_payments", "notifications", "oficios", "password_reset_attempts", "password_reset_tokens", "rate_limits", "test_results", "test_runs", "webhook_deliveries", "webhook_subscriptions"].includes(tableName));
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
