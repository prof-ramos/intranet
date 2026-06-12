#!/bin/bash
cat << 'PATCH_EOF' > /tmp/schema.diff
--- src/lib/db/schema.integration.test.ts
+++ src/lib/db/schema.integration.test.ts
@@ -36,6 +36,7 @@
   domain_events: ['id:int8:NO', 'event_type:domain_event_type:NO', 'entity_type:domain_event_entity_type:NO', 'entity_id:int8:NO', 'actor_admin_id:int8:YES', 'payload:jsonb:NO', 'delivery_status:domain_event_delivery_status:NO', 'expires_at:timestamptz:YES', 'occurred_at:timestamptz:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
   email_triagens: ['id:int8:NO', 'message_id:varchar:NO', 'thread_id:varchar:NO', 'history_id:varchar:YES', 'received_at:timestamptz:NO', 'sender:varchar:NO', 'original_recipient:varchar:YES', 'subject:varchar:NO', 'body_hash:bpchar:NO', 'body_excerpt:text:NO', 'raw_body_stored:bool:NO', 'redaction_applied:bool:NO', 'categoria:email_categoria:NO', 'resumo:text:NO', 'thread_context_summary:text:YES', 'ha_prazo:bool:NO', 'prazo_data:date:YES', 'prazo_hora:time:YES', 'prazo_confianca_data:email_confianca:YES', 'tipo_prazo:email_tipo_prazo:YES', 'trecho_fonte_do_prazo:text:YES', 'resumo_anexos:jsonb:NO', 'source_evidence:jsonb:NO', 'attachments_hashes:jsonb:NO', 'nivel_risco:email_nivel_risco:NO', 'confianca:email_confianca:NO', 'acao_recomendada:text:NO', 'responsavel_sugerido:email_responsavel:YES', 'exige_validacao_humana:bool:NO', 'legal_basis:varchar:NO'],
+  monthly_payments: ['id:int8:NO', 'associate_id:int8:NO', 'year:int4:NO', 'month:int4:NO', 'status:payment_status:NO', 'payment_method:payment_method:NO', 'paid_at:timestamptz:YES', 'cancelled_at:timestamptz:YES', 'cancellation_reason:text:YES', 'cancelled_by:int8:YES', 'updated_by:int8:NO', 'created_at:timestamptz:NO', 'updated_at:timestamptz:NO'],
 };

 const expectedEnums = {
@@ -70,6 +71,7 @@
   audit_logs: ['audit_logs_pkey', 'idx_audit_logs_entity', 'idx_audit_logs_performed_by', 'idx_audit_logs_created_at'],
   domain_events: ['domain_events_pkey', 'idx_domain_events_delivery_status', 'idx_domain_events_entity', 'idx_domain_events_expires_at', 'idx_domain_events_occurred_at'],
   email_triagens: ['email_triagens_pkey', 'idx_email_triagens_message_id_unique', 'idx_email_triagens_received_at', 'idx_email_triagens_sender', 'idx_email_triagens_categoria', 'idx_email_triagens_nivel_risco'],
+  monthly_payments: ['idx_monthly_payments_status', 'monthly_payments_associate_id_year_month_index', 'monthly_payments_pkey'],
 };

 afterAll(async () => {
PATCH_EOF
patch -p0 < /tmp/schema.diff
