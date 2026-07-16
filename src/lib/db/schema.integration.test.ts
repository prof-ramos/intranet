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
  app_settings: [
    'key:varchar:NO',
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
    'session_version:int4:NO',
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
    'sex:sex:YES',
    'marital_status:marital_status:YES',
    'birth_city:text:YES',
    'birth_state:text:YES',
    'rg:text:YES',
    'rg_ciphertext:text:YES',
    'rg_hash:text:YES',
    'rg_issuer:text:YES',
    'rg_state:text:YES',
    'rg_expedition_date:date:YES',
    'address_state:text:YES',
    'neighborhood:text:YES',
    'zip_code:text:YES',
    'mission_type:mission_type:YES',
    'career_origin:career_origin:YES',
    'admission_date:date:YES',
    'inauguration_date:date:YES',
    'retirement_date:date:YES',
    'cancellation_date:date:YES',
    'leave_date:date:YES',
    'ceoc_member:bool:YES',
    'caoc_member:bool:YES',
    'number_of_dependents:int4:YES',
    'birth_date:date:YES',
    'class_pattern:text:YES',
    'source_payload:text:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
    'payment_method:payment_method:NO',
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
  email_triagens: [
    'id:int8:NO',
    'message_id:varchar:NO',
    'thread_id:varchar:NO',
    'history_id:varchar:YES',
    'received_at:timestamptz:NO',
    'sender:varchar:NO',
    'original_recipient:varchar:YES',
    'subject:varchar:NO',
    'body_hash:bpchar:NO',
    'body_excerpt:text:NO',
    'raw_body_stored:bool:NO',
    'redaction_applied:bool:NO',
    'categoria:email_categoria:NO',
    'resumo:text:NO',
    'thread_context_summary:text:YES',
    'ha_prazo:bool:NO',
    'prazo_data:date:YES',
    'prazo_hora:time:YES',
    'prazo_confianca_data:email_confianca:YES',
    'tipo_prazo:email_tipo_prazo:YES',
    'trecho_fonte_do_prazo:text:YES',
    'resumo_anexos:jsonb:NO',
    'source_evidence:jsonb:NO',
    'attachments_hashes:jsonb:NO',
    'nivel_risco:email_nivel_risco:NO',
    'confianca:email_confianca:NO',
    'acao_recomendada:text:NO',
    'responsavel_sugerido:email_responsavel:YES',
    'exige_validacao_humana:bool:NO',
    'legal_basis:varchar:NO',
    'processed_purpose:varchar:NO',
    'data_retention_until:timestamptz:YES',
    'processing_version:varchar:NO',
    'model_name:varchar:YES',
    'model_response_id:varchar:YES',
    'status:email_status_triagem:NO',
    'usuario_validador_id:int8:YES',
    'validated_at:timestamptz:YES',
    'observacoes_validacao:text:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
    'consultation_id:int8:YES',
    'lawyer_id:int8:YES',
  ],
  integration_api_keys: [
    'id:int8:NO',
    'name:text:NO',
    'key_hash:text:NO',
    'signing_secret_ciphertext:text:YES',
    'scopes:jsonb:NO',
    'is_active:bool:NO',
    'last_used_at:timestamptz:YES',
    'created_by:int8:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  integration_signature_nonces: [
    'id:int8:NO',
    'key_id:text:NO',
    'signature:text:NO',
    'accepted_at:timestamptz:NO',
    'expires_at:timestamptz:NO',
  ],
  lawyers: [
    'id:int8:NO',
    'name:text:NO',
    'email:text:NO',
    'oab:text:YES',
    'firm:text:YES',
    'specialty:text:YES',
    'status:lawyer_status:NO',
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
    'lawyer_id:int8:YES',
    'thread_id:varchar:YES',
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
  notifications: [
    'id:int8:NO',
    'user_id:int8:NO',
    'actor_id:int8:YES',
    'type:notification_type:NO',
    'title:text:NO',
    'message:text:NO',
    'href:text:YES',
    'entity_type:notification_entity_type:YES',
    'entity_id:int8:YES',
    'read_at:timestamptz:YES',
    'metadata:jsonb:YES',
    'dedupe_key:text:YES',
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
    'assinafy_document_id:text:YES',
    'assinafy_status:assinafy_document_status:YES',
    'assinafy_assignment_id:text:YES',
    'assinafy_signer_id:text:YES',
    'assinafy_sent_at:timestamptz:YES',
    'assinafy_signed_at:timestamptz:YES',
    'assinafy_error:text:YES',
    'assinafy_signing_url:text:YES',
    'recipient_address:text:YES',
    'recipient_city:text:YES',
    'recipient_zip:text:YES',
  ],
  password_reset_attempts: [
    'id:int8:NO',
    'email_hash:text:NO',
    'attempts:int4:NO',
    'expires_at:timestamptz:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  password_reset_tokens: [
    'id:int8:NO',
    'admin_id:int8:NO',
    'token_hash:text:NO',
    'expires_at:timestamptz:NO',
    'used_at:timestamptz:YES',
    'created_at:timestamptz:NO',
  ],
  dependents: [
    'id:int8:NO',
    'associate_id:int8:NO',
    'name:text:NO',
    'relationship:text:NO',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
  ],
  health_agreements: [
    'id:int8:NO',
    'associate_id:int8:NO',
    'provider:text:NO',
    'start_date:date:YES',
    'end_date:date:YES',
    'created_at:timestamptz:NO',
    'updated_at:timestamptz:NO',
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
  test_results: [
    'id:uuid:NO',
    'run_id:text:NO',
    'file:text:NO',
    'name:text:NO',
    'full_name:text:NO',
    'status:test_result_status:NO',
    'duration_ms:int4:NO',
    'retry:int4:YES',
    'project_name:text:YES',
    'error_count:int4:YES',
    'recorded_at:timestamptz:NO',
  ],
  test_runs: [
    'run_id:text:NO',
    'runner:test_runner:NO',
    'suite:text:NO',
    'environment:test_environment:NO',
    'started_at:timestamptz:NO',
    'finished_at:timestamptz:NO',
    'total_duration_ms:int4:NO',
    'total_tests:int4:NO',
    'passed:int4:NO',
    'failed:int4:NO',
    'skipped:int4:NO',
    'created_at:timestamptz:NO',
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
    'delivered_at:timestamptz:YES',
    'next_retry_at:timestamptz:YES',
    'failed_at:timestamptz:YES',
    'failure_reason:text:YES',
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
};

const expectedEnums = {
  activity_status: ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'],
  activity_priority: ['baixa', 'normal', 'alta', 'urgente'],
  admin_role: ['admin', 'diretoria', 'secretaria'],
  functional_status: ['ativo', 'aposentado', 'cedido', 'em_licenca'],
  sex: ['M', 'F'],
  marital_status: ['solteiro', 'casado', 'divorciado', 'viuvo', 'separado'],
  mission_type: ['permanente', 'transitoria'],
  career_origin: ['brasil', 'exterior', 'outros_orgaos'],
  association_status: ['associado', 'nao_associado'],
  contribution_status: ['em_dia', 'inadimplente'],
  payment_method: ['folha', 'boleto', 'pix', 'transferencia', 'outros'],
  payment_status: ['pago', 'pendente', 'atrasado', 'isento', 'cancelado'],
  assignment_type: ['nacional', 'exterior'],
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
  legal_satisfaction: ['satisfeito', 'insatisfeito', 'sem_resposta'],
  domain_event_type: [
    'associate.updated',
    'legal_consultation.created',
    'legal_consultation.status_changed',
    'official_letter.created',
    'official_letter.published',
    'official_letter.status_changed',
    'monthly_payment.updated',
    'activity.created',
    'activity.status_changed',
    'activity.assigned',
    'activity.completed',
    'activity.priority_changed',
    'activity.due_date_changed',
  ],
  domain_event_entity_type: [
    'associate',
    'legal_consultation',
    'official_letter',
    'monthly_payment',
    'activity',
  ],
  domain_event_delivery_status: [
    'pending',
    'processing',
    'delivered',
    'partially_delivered',
    'failed',
  ],
  webhook_delivery_status: ['pending', 'delivered', 'failed', 'retry_scheduled'],
  legal_consultation_status: ['aberta', 'aguardando_escritorio', 'respondida', 'arquivada'],
  legal_process_status: ['ativo', 'concluido', 'suspenso'],
  legal_process_subtype: ['justica_federal', 'stf', 'mre', 'cgu', 'tcu'],
  legal_process_type: ['judicial', 'administrativo'],
  legal_note_entity_type: ['consultation', 'process'],
  notification_entity_type: ['activity', 'legal_consultation', 'email_triagem', 'oficio'],
  notification_type: [
    'activity.completed',
    'legal_consultation.answered',
    'activity.assigned',
    'legal_consultation.sla_warning',
    'lgpd_request',
    'email_triage_pending',
    'oficio.status_changed',
  ],
  official_letter_status: ['gerado', 'cancelado', 'rascunho'],
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
  assinafy_document_status: [
    'uploading',
    'uploaded',
    'metadata_processing',
    'metadata_ready',
    'pending_signature',
    'certificating',
    'certificated',
    'expired',
    'partially_signed',
    'rejected_by_signer',
    'rejected_by_user',
    'failed',
  ],
  test_environment: ['ci', 'local'],
  test_result_status: [
    'passed',
    'failed',
    'skipped',
    'todo',
    'timed_out',
    'interrupted',
    'unknown',
  ],
  test_runner: ['vitest', 'playwright'],
  email_categoria: [
    'juridico',
    'administrativo',
    'financeiro',
    'institucional',
    'comunicacao',
    'irrelevante',
  ],
  email_tipo_prazo: [
    'processual',
    'administrativo',
    'contratual',
    'financeiro',
    'reuniao',
    'resposta',
    'outro',
  ],
  email_nivel_risco: ['baixo', 'medio', 'alto', 'critico'],
  email_confianca: ['baixa', 'media', 'alta'],
  email_responsavel: ['juridico', 'administrativo', 'financeiro', 'diretoria'],
  email_status_triagem: [
    'novo',
    'analisado',
    'aguardando_validacao',
    'validado',
    'em_andamento',
    'concluido',
    'vencido',
    'arquivado',
    'erro_validacao_ia',
    'erro_processamento_anexo',
    'aguardando_reprocessamento',
    'descartado_por_irrelevancia',
    'pendente_validacao_lgpd',
  ],
  lawyer_status: ['ativo', 'inativo'],
};

const expectedIndexes = {
  activities: [
    'activities_pkey',
    'idx_activities_assignee_id',
    'idx_activities_associate_due_id',
    'idx_activities_associate_id',
    'idx_activities_created_by',
    'idx_activities_due_date',
    'idx_activities_status',
    'idx_activities_status_due_date',
  ],
  admins: ['admins_email_unique', 'admins_pkey'],
  app_settings: ['app_settings_pkey', 'idx_app_settings_updated_by'],
  assignments: ['assignments_name_unique', 'assignments_pkey'],
  associates: [
    'associates_pkey',
    'idx_associates_address_hash',
    'idx_associates_association_status',
    'idx_associates_contribution_status',
    'idx_associates_cpf',
    'idx_associates_cpf_hash',
    'idx_associates_name_lower_trgm',
    'idx_associates_name_trgm',
    'idx_associates_paginated_list',
    'idx_associates_phone_hash',
    'idx_associates_primary_email',
    'idx_associates_primary_email_hash',
    'idx_associates_rg_hash',
    'idx_associates_siape',
    'idx_associates_siape_hash',
    'idx_associates_source_row_number',
    'idx_associates_status_name',
    'idx_associates_whatsapp_hash',
  ],
  audit_logs: [
    'audit_logs_pkey',
    'idx_audit_created_at',
    'idx_audit_entity',
    'idx_audit_performed_by',
  ],
  documents: [
    'documents_pkey',
    'idx_documents_category',
    'idx_documents_created_at',
    'idx_documents_description_trgm',
    'idx_documents_name_trgm',
    'idx_documents_uploaded_by',
  ],
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
  email_triagens: [
    'email_triagens_message_id_key',
    'email_triagens_pkey',
    'idx_email_triagens_consultation',
    'idx_email_triagens_exige_validacao',
    'idx_email_triagens_history_id',
    'idx_email_triagens_lawyer',
    'idx_email_triagens_prazo_data',
    'idx_email_triagens_received_at',
    'idx_email_triagens_resumo_anexos_gin',
    'idx_email_triagens_source_evidence_gin',
    'idx_email_triagens_status',
    'idx_email_triagens_thread_id',
  ],
  integration_api_keys: [
    'idx_integration_api_keys_active',
    'idx_integration_api_keys_created_by',
    'idx_integration_api_keys_key_hash_unique',
    'idx_integration_api_keys_name_unique',
    'integration_api_keys_pkey',
  ],
  integration_signature_nonces: [
    'integration_signature_nonces_expires_idx',
    'integration_signature_nonces_key_sig_idx',
    'integration_signature_nonces_pkey',
  ],
  lawyers: ['idx_lawyers_name_trgm', 'lawyers_email_unique', 'lawyers_pkey'],
  legal_consultations: [
    'idx_legal_consultations_associate',
    'idx_legal_consultations_created_at',
    'idx_legal_consultations_created_by',
    'idx_legal_consultations_last_interaction',
    'idx_legal_consultations_lawyer',
    'idx_legal_consultations_sla',
    'idx_legal_consultations_status',
    'idx_legal_consultations_thread',
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
  notifications: [
    'idx_notifications_user_created_at',
    'idx_notifications_user_dedupe_key',
    'idx_notifications_user_read_at',
    'notifications_pkey',
  ],
  oficios: [
    'idx_oficios_assinafy_document_id',
    'idx_oficios_assinafy_status',
    'idx_oficios_created_at',
    'idx_oficios_created_at_desc',
    'idx_oficios_created_by',
    'idx_oficios_status',
    'idx_oficios_updated_by',
    'idx_oficios_year',
    'oficios_assinafy_document_id_unique',
    'oficios_number_unique',
    'oficios_pkey',
    'uq_oficios_year_sequence',
  ],
  password_reset_attempts: [
    'idx_password_reset_attempts_email_hash_unique',
    'idx_password_reset_attempts_expires_at',
    'password_reset_attempts_pkey',
  ],
  password_reset_tokens: [
    'idx_password_reset_tokens_admin_id',
    'idx_password_reset_tokens_expires_at',
    'idx_password_reset_tokens_hash_unique',
    'password_reset_tokens_pkey',
  ],
  dependents: ['dependents_pkey', 'idx_dependents_associate_id'],
  health_agreements: ['health_agreements_pkey', 'idx_health_agreements_associate_id'],
  rate_limits: ['idx_rate_limits_expires_at', 'idx_rate_limits_key_scope', 'rate_limits_pkey'],
  test_results: [
    'idx_test_results_duration',
    'idx_test_results_run_id',
    'idx_test_results_status',
    'test_results_pkey',
  ],
  test_runs: ['idx_test_runs_runner_suite', 'idx_test_runs_started_at', 'test_runs_pkey'],
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
};

type ContractMap = Record<string, string[]>;

type MigrationJournal = {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

type SnapshotBaseline = {
  index: number;
};

const snapshotBaseline = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'drizzle/postgres/snapshot-baseline.json'), 'utf8'),
) as SnapshotBaseline;

if (!Number.isInteger(snapshotBaseline.index) || snapshotBaseline.index < 0) {
  throw new Error('Drizzle snapshot baseline index must be a non-negative integer.');
}

const SNAPSHOT_BASELINE_INDEX = snapshotBaseline.index;

function addContractValue(acc: ContractMap, key: string, value: string) {
  acc[key] ??= [];
  acc[key].push(value);
  return acc;
}

function normalize(values: string[] | undefined) {
  return [...(values ?? [])].sort();
}

function expectContractMap(kind: string, actual: ContractMap, expected: ContractMap) {
  const unexpected = Object.keys(actual)
    .filter((name) => !(name in expected))
    .sort();
  expect(unexpected, `Unexpected ${kind}: ${unexpected.join(', ') || 'none'}`).toEqual([]);

  for (const [name, expectedValues] of Object.entries(expected)) {
    expect(normalize(actual[name]), `${kind} mismatch for "${name}"`).toEqual(
      normalize(expectedValues),
    );
  }
}

function validateLatestJournalSnapshot(journal: MigrationJournal, snapshotFiles: string[]) {
  const latestEntry = journal.entries.at(-1);
  if (!latestEntry) {
    return 'Migration journal must contain at least one entry';
  }
  if (latestEntry.idx < SNAPSHOT_BASELINE_INDEX) {
    return null;
  }

  const expectedSnapshot = `${String(latestEntry.idx).padStart(4, '0')}_snapshot.json`;
  return snapshotFiles.includes(expectedSnapshot)
    ? null
    : `Missing Drizzle snapshot for latest journal entry ${latestEntry.tag}: ${expectedSnapshot}`;
}

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
    const rows = await db<
      { table_name: string; column_name: string; udt_name: string; is_nullable: 'YES' | 'NO' }[]
    >`
      select table_name, column_name, udt_name, is_nullable
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `;
    const actual = rows.reduce<Record<string, string[]>>((acc, row) => {
      if (row.table_name.startsWith('pg_stat_statements')) return acc;
      return addContractValue(
        acc,
        row.table_name,
        `${row.column_name}:${row.udt_name}:${row.is_nullable}`,
      );
    }, {});
    expectContractMap('table columns', actual, expectedColumns);
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
      return addContractValue(acc, row.typname, row.enumlabel);
    }, {});
    expectContractMap('enum labels', actual, expectedEnums);
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
      return addContractValue(acc, row.tablename, row.indexname);
    }, {});
    expectContractMap('indexes', actual, expectedIndexes);
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
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8'),
    ) as MigrationJournal;
    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    expect(sqlFiles).toEqual(journal.entries.map((entry) => `${entry.tag}.sql`));
  });

  it('has a snapshot for the latest journal entry from the reconciled baseline onward', () => {
    const metaDir = path.join(process.cwd(), 'drizzle/postgres/meta');
    const journal = JSON.parse(
      fs.readFileSync(path.join(metaDir, '_journal.json'), 'utf8'),
    ) as MigrationJournal;
    const snapshotFiles = fs
      .readdirSync(metaDir)
      .filter((file) => /^\d{4}_snapshot\.json$/.test(file));

    expect(validateLatestJournalSnapshot(journal, snapshotFiles)).toBeNull();
    expect(
      validateLatestJournalSnapshot(
        {
          entries: [
            { idx: SNAPSHOT_BASELINE_INDEX, tag: '0031_reconcile_snapshot_baseline', when: 0 },
          ],
        },
        [],
      ),
    ).toBe(
      'Missing Drizzle snapshot for latest journal entry 0031_reconcile_snapshot_baseline: 0031_snapshot.json',
    );
  });
});
