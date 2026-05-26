CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('admin', 'diretoria', 'secretaria');--> statement-breakpoint
CREATE TYPE "public"."association_status" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('em_dia', 'inadimplente', 'pendente_migracao');--> statement-breakpoint
CREATE TYPE "public"."functional_status" AS ENUM('ativo', 'aposentado', 'cedido', 'em_licenca');--> statement-breakpoint
CREATE TYPE "public"."activity_priority" AS ENUM('baixa', 'normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."assignment_type" AS ENUM('domestic', 'abroad');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('associate', 'admin', 'activity', 'assignment', 'legal_consultation', 'legal_process', 'finance', 'monthly_payment', 'official_letter', 'domain_event', 'webhook_subscription', 'document');--> statement-breakpoint
CREATE TYPE "public"."legal_satisfaction" AS ENUM('satisfeito', 'insatisfeito', 'sem_resposta');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('folha', 'boleto', 'pix', 'transferencia', 'outros');--> statement-breakpoint
CREATE TYPE "public"."domain_event_delivery_status" AS ENUM('pending', 'processing', 'delivered', 'partially_delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."domain_event_entity_type" AS ENUM('associate', 'legal_consultation', 'official_letter', 'monthly_payment');--> statement-breakpoint
CREATE TYPE "public"."domain_event_type" AS ENUM('associate.updated', 'legal_consultation.created', 'legal_consultation.status_changed', 'official_letter.created', 'monthly_payment.updated', 'official_letter.published');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'retry_scheduled');--> statement-breakpoint
CREATE TYPE "public"."legal_consultation_status" AS ENUM('aberta', 'aguardando_escritorio', 'respondida', 'arquivada');--> statement-breakpoint
CREATE TYPE "public"."legal_process_status" AS ENUM('ativo', 'concluido', 'suspenso');--> statement-breakpoint
CREATE TYPE "public"."legal_process_subtype" AS ENUM('justica_federal', 'stf', 'mre', 'cgu', 'tcu');--> statement-breakpoint
CREATE TYPE "public"."legal_process_type" AS ENUM('judicial', 'administrativo');--> statement-breakpoint
CREATE TYPE "public"."legal_note_entity_type" AS ENUM('consultation', 'process');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pago', 'pendente', 'atrasado', 'isento', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('activity', 'legal_consultation');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('activity.completed', 'legal_consultation.answered', 'activity.assigned', 'legal_consultation.sla_warning');--> statement-breakpoint
CREATE TYPE "public"."official_letter_status" AS ENUM('gerado', 'cancelado', 'rascunho');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('modelo_contrato', 'contrato', 'minuta', 'estatuto', 'ata', 'oficio', 'rh', 'evento', 'nota_fiscal', 'comprovante', 'outro');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value_ciphertext" text NOT NULL,
	"updated_by" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "associates" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "associates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source_row_number" text,
	"full_name" text NOT NULL,
	"cpf" text,
	"cpf_ciphertext" text,
	"cpf_hash" text,
	"primary_email" text,
	"primary_email_ciphertext" text,
	"primary_email_hash" text,
	"phone" text,
	"phone_ciphertext" text,
	"phone_hash" text,
	"address" text,
	"address_ciphertext" text,
	"address_hash" text,
	"whatsapp" text,
	"whatsapp_ciphertext" text,
	"whatsapp_hash" text,
	"siape" text,
	"siape_ciphertext" text,
	"siape_hash" text,
	"functional_status" "functional_status",
	"assignment" text,
	"assignment_start_date" date,
	"location_city" text,
	"location_country" text,
	"association_status" "association_status" DEFAULT 'ativo' NOT NULL,
	"joined_at" timestamp with time zone,
	"association_category" text,
	"contribution_status" "contribution_status" DEFAULT 'pendente_migracao' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'folha' NOT NULL,
	"secondary_email" text,
	"internal_notes" text,
	"birth_date" date,
	"class_pattern" text,
	"source_payload" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"status" "activity_status" DEFAULT 'a_fazer' NOT NULL,
	"assignee_id" bigint,
	"due_date" timestamp with time zone,
	"priority" "activity_priority" DEFAULT 'normal' NOT NULL,
	"associate_id" bigint,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"position" integer DEFAULT 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assignments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"type" "assignment_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"action" text NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" bigint,
	"performed_by" bigint,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "domain_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_type" "domain_event_type" NOT NULL,
	"entity_type" "domain_event_entity_type" NOT NULL,
	"entity_id" bigint NOT NULL,
	"actor_admin_id" bigint,
	"payload" jsonb NOT NULL,
	"delivery_status" "domain_event_delivery_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_api_keys" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "integration_api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_deliveries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"domain_event_id" bigint NOT NULL,
	"webhook_subscription_id" bigint NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"request_id" text NOT NULL,
	"idempotency_key" text,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response_excerpt" text,
	"delivered_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_webhook_deliveries_attempt" CHECK ("webhook_deliveries"."attempt" > 0)
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"target_url" text NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"subscribed_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text,
	"email_hash" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_consultations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_consultations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"internal_number" text NOT NULL,
	"title" text NOT NULL,
	"question_summary" text NOT NULL,
	"question_full_text" text,
	"associate_id" bigint,
	"answered_by" bigint,
	"final_answer" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"sla_due_date" timestamp with time zone,
	"status" "legal_consultation_status" DEFAULT 'aberta' NOT NULL,
	"satisfaction" "legal_satisfaction",
	"last_interaction_at" timestamp with time zone,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_consultations_internal_number_unique" UNIQUE("internal_number")
);
--> statement-breakpoint
CREATE TABLE "legal_processes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_processes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"internal_number" text NOT NULL,
	"external_number" text,
	"title" text NOT NULL,
	"type" "legal_process_type" NOT NULL,
	"subtype" "legal_process_subtype" NOT NULL,
	"associate_id" bigint,
	"status" "legal_process_status" DEFAULT 'ativo' NOT NULL,
	"satisfaction" "legal_satisfaction",
	"office_deadline" timestamp with time zone,
	"legal_deadline" timestamp with time zone,
	"last_check_at" timestamp with time zone,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_processes_internal_number_unique" UNIQUE("internal_number")
);
--> statement-breakpoint
CREATE TABLE "legal_notes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entity_type" "legal_note_entity_type" NOT NULL,
	"entity_id" bigint NOT NULL,
	"content" text NOT NULL,
	"created_by" bigint NOT NULL,
	"is_escritorio_response" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_opinion_tags" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_opinion_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_opinion_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "legal_opinions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legal_opinions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"related_process_id" bigint,
	"created_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rate_limits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"associate_id" bigint NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pendente' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'folha' NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_by" bigint,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_monthly_payments_month" CHECK ("monthly_payments"."month" between 1 and 12),
	CONSTRAINT "chk_monthly_payments_year" CHECK ("monthly_payments"."year" between 2000 and 2100)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" bigint NOT NULL,
	"actor_id" bigint,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"href" text,
	"entity_type" "notification_entity_type",
	"entity_id" bigint,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oficios" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "oficios_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"number" text NOT NULL,
	"year" integer NOT NULL,
	"sequence" integer NOT NULL,
	"recipient" text NOT NULL,
	"recipient_role" text NOT NULL,
	"vocativo" text NOT NULL,
	"letter_date" text NOT NULL,
	"subject" text NOT NULL,
	"itamaraty_sector" text NOT NULL,
	"signatory_name" text NOT NULL,
	"signatory_role" text NOT NULL,
	"closure" text DEFAULT 'Atenciosamente,' NOT NULL,
	"body_rich_text" text NOT NULL,
	"body_plain_text" text NOT NULL,
	"pdf_storage_path" text,
	"status" "official_letter_status" DEFAULT 'gerado' NOT NULL,
	"created_by" bigint NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oficios_number_unique" UNIQUE("number"),
	CONSTRAINT "uq_oficios_year_sequence" UNIQUE("year","sequence"),
	CONSTRAINT "chk_oficios_year" CHECK ("oficios"."year" between 2000 and 2100),
	CONSTRAINT "chk_oficios_sequence" CHECK ("oficios"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"category" "document_category" NOT NULL,
	"storage_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" text NOT NULL,
	"uploaded_by" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_id_admins_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_admins_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_actor_admin_id_admins_id_fk" FOREIGN KEY ("actor_admin_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_domain_event_id_domain_events_id_fk" FOREIGN KEY ("domain_event_id") REFERENCES "public"."domain_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_subscription_id_webhook_subscriptions_id_fk" FOREIGN KEY ("webhook_subscription_id") REFERENCES "public"."webhook_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_answered_by_admins_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_processes" ADD CONSTRAINT "legal_processes_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_processes" ADD CONSTRAINT "legal_processes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_notes" ADD CONSTRAINT "legal_notes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_related_process_id_legal_processes_id_fk" FOREIGN KEY ("related_process_id") REFERENCES "public"."legal_processes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_cancelled_by_admins_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_admins_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_admins_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oficios" ADD CONSTRAINT "oficios_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oficios" ADD CONSTRAINT "oficios_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_settings_updated_by" ON "app_settings" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_cpf" ON "associates" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_siape" ON "associates" USING btree ("siape");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_primary_email" ON "associates" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "idx_associates_cpf_hash" ON "associates" USING btree ("cpf_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_siape_hash" ON "associates" USING btree ("siape_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_primary_email_hash" ON "associates" USING btree ("primary_email_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_phone_hash" ON "associates" USING btree ("phone_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_address_hash" ON "associates" USING btree ("address_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_whatsapp_hash" ON "associates" USING btree ("whatsapp_hash");--> statement-breakpoint
CREATE INDEX "idx_associates_association_status" ON "associates" USING btree ("association_status");--> statement-breakpoint
CREATE INDEX "idx_associates_contribution_status" ON "associates" USING btree ("contribution_status");--> statement-breakpoint
CREATE INDEX "idx_associates_status_name" ON "associates" USING btree ("association_status","full_name");--> statement-breakpoint
CREATE INDEX "idx_associates_name_trgm" ON "associates" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_activities_status" ON "activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_activities_due_date" ON "activities" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_activities_status_due_date" ON "activities" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "idx_activities_assignee_id" ON "activities" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_activities_associate_id" ON "activities" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_activities_associate_due_id" ON "activities" USING btree ("associate_id","due_date","id");--> statement-breakpoint
CREATE INDEX "idx_activities_created_by" ON "activities" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_performed_by" ON "audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_domain_events_event_type" ON "domain_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_domain_events_entity" ON "domain_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_domain_events_actor_admin_id" ON "domain_events" USING btree ("actor_admin_id");--> statement-breakpoint
CREATE INDEX "idx_domain_events_delivery_status" ON "domain_events" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "idx_domain_events_occurred_at" ON "domain_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_domain_events_status_occurred_at" ON "domain_events" USING btree ("delivery_status","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_domain_events_expires_at" ON "domain_events" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_domain_events_pending" ON "domain_events" USING btree ("id") WHERE "domain_events"."delivery_status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "idx_integration_api_keys_name_unique" ON "integration_api_keys" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_integration_api_keys_key_hash_unique" ON "integration_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_integration_api_keys_active" ON "integration_api_keys" USING btree ("id") WHERE "integration_api_keys"."is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_integration_api_keys_created_by" ON "integration_api_keys" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_deliveries_request_id_unique" ON "webhook_deliveries" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_deliveries_subscription_attempt_unique" ON "webhook_deliveries" USING btree ("domain_event_id","webhook_subscription_id","attempt");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_domain_event_id" ON "webhook_deliveries" USING btree ("domain_event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_webhook_subscription_id" ON "webhook_deliveries" USING btree ("webhook_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status_next_retry_at" ON "webhook_deliveries" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_subscriptions_name_unique" ON "webhook_subscriptions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_target_url" ON "webhook_subscriptions" USING btree ("target_url");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_active" ON "webhook_subscriptions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_created_by" ON "webhook_subscriptions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_subscribed_events" ON "webhook_subscriptions" USING gin ("subscribed_events");--> statement-breakpoint
CREATE INDEX "idx_webhook_subscriptions_active_partial" ON "webhook_subscriptions" USING btree ("id") WHERE "webhook_subscriptions"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_login_attempts_email_hash_unique" ON "login_attempts" USING btree ("email_hash") WHERE "login_attempts"."email_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_login_attempts_expires_at" ON "login_attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_status" ON "legal_consultations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_associate" ON "legal_consultations" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_created_by" ON "legal_consultations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_sla" ON "legal_consultations" USING btree ("sla_due_date");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_last_interaction" ON "legal_consultations" USING btree ("last_interaction_at");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_created_at" ON "legal_consultations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_legal_processes_status" ON "legal_processes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_legal_processes_associate" ON "legal_processes" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_legal_processes_created_by" ON "legal_processes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_legal_processes_type" ON "legal_processes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_legal_processes_last_check" ON "legal_processes" USING btree ("last_check_at");--> statement-breakpoint
CREATE INDEX "idx_legal_notes_entity" ON "legal_notes" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_legal_notes_created_by" ON "legal_notes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_legal_notes_created_at" ON "legal_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_legal_opinion_tags_name" ON "legal_opinion_tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_legal_opinions_created_by" ON "legal_opinions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_legal_opinions_related_process" ON "legal_opinions" USING btree ("related_process_id");--> statement-breakpoint
CREATE INDEX "idx_legal_opinions_created_at" ON "legal_opinions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rate_limits_key_scope" ON "rate_limits" USING btree ("key","scope");--> statement-breakpoint
CREATE INDEX "idx_rate_limits_expires_at" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_monthly_payments_unique" ON "monthly_payments" USING btree ("associate_id","year","month");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_status" ON "monthly_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_updated_by" ON "monthly_payments" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_year_month_status" ON "monthly_payments" USING btree ("year","month","status");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_year_month_method" ON "monthly_payments" USING btree ("year","month","payment_method");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_associate_id" ON "monthly_payments" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_monthly_payments_cancelled_at" ON "monthly_payments" USING btree ("cancelled_at") WHERE "monthly_payments"."cancelled_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read_at" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created_at" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notifications_user_dedupe_key" ON "notifications" USING btree ("user_id","dedupe_key") WHERE "notifications"."dedupe_key" is not null;--> statement-breakpoint
CREATE INDEX "idx_oficios_year" ON "oficios" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_oficios_status" ON "oficios" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_oficios_created_at" ON "oficios" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_oficios_created_at_desc" ON "oficios" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_oficios_created_by" ON "oficios" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_oficios_updated_by" ON "oficios" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "idx_documents_category" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_uploaded_by" ON "documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_documents_name_trgm" ON "documents" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_documents_description_trgm" ON "documents" USING gin ("description" gin_trgm_ops);
