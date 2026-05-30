CREATE TYPE "public"."lawyer_status" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TYPE "public"."assinafy_document_status" AS ENUM('uploading', 'uploaded', 'metadata_processing', 'metadata_ready', 'pending_signature', 'certificating', 'certificated', 'expired', 'rejected_by_signer', 'rejected_by_user', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_categoria" AS ENUM('juridico', 'administrativo', 'financeiro', 'institucional', 'comunicacao', 'irrelevante');--> statement-breakpoint
CREATE TYPE "public"."email_confianca" AS ENUM('baixa', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."email_nivel_risco" AS ENUM('baixo', 'medio', 'alto', 'critico');--> statement-breakpoint
CREATE TYPE "public"."email_responsavel" AS ENUM('juridico', 'administrativo', 'financeiro', 'diretoria');--> statement-breakpoint
CREATE TYPE "public"."email_status_triagem" AS ENUM('novo', 'analisado', 'aguardando_validacao', 'validado', 'em_andamento', 'concluido', 'vencido', 'arquivado', 'erro_validacao_ia', 'erro_processamento_anexo', 'aguardando_reprocessamento', 'descartado_por_irrelevancia', 'pendente_validacao_lgpd');--> statement-breakpoint
CREATE TYPE "public"."email_tipo_prazo" AS ENUM('processual', 'administrativo', 'contratual', 'financeiro', 'reuniao', 'resposta', 'outro');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'lgpd_request';--> statement-breakpoint
CREATE TABLE "lawyers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lawyers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"oab" text,
	"firm" text,
	"specialty" text,
	"status" "lawyer_status" DEFAULT 'ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lawyers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_triagens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_triagens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"message_id" varchar(255) NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"history_id" varchar(255),
	"received_at" timestamp with time zone NOT NULL,
	"sender" varchar(512) NOT NULL,
	"original_recipient" varchar(512),
	"subject" varchar(1000) NOT NULL,
	"body_hash" char(64) NOT NULL,
	"body_excerpt" text NOT NULL,
	"raw_body_stored" boolean DEFAULT false NOT NULL,
	"redaction_applied" boolean DEFAULT true NOT NULL,
	"categoria" "email_categoria" NOT NULL,
	"resumo" text NOT NULL,
	"thread_context_summary" text,
	"ha_prazo" boolean DEFAULT false NOT NULL,
	"prazo_data" date,
	"prazo_hora" time,
	"prazo_confianca_data" "email_confianca",
	"tipo_prazo" "email_tipo_prazo",
	"trecho_fonte_do_prazo" text,
	"resumo_anexos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nivel_risco" "email_nivel_risco" NOT NULL,
	"confianca" "email_confianca" NOT NULL,
	"acao_recomendada" text NOT NULL,
	"responsavel_sugerido" "email_responsavel",
	"exige_validacao_humana" boolean DEFAULT true NOT NULL,
	"legal_basis" varchar(100) DEFAULT 'avaliacao_humana_necessaria' NOT NULL,
	"processed_purpose" varchar(255) NOT NULL,
	"data_retention_until" timestamp with time zone,
	"processing_version" varchar(100) DEFAULT 'email-controller-mvp-v1' NOT NULL,
	"model_name" varchar(255),
	"model_response_id" varchar(255),
	"status" "email_status_triagem" DEFAULT 'novo' NOT NULL,
	"usuario_validador_id" bigint,
	"validated_at" timestamp with time zone,
	"observacoes_validacao" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_triagens_message_id_unique" UNIQUE("message_id"),
	CONSTRAINT "chk_email_triagens_body_hash_sha256" CHECK ("email_triagens"."body_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "chk_email_triagens_body_excerpt_len" CHECK (char_length("email_triagens"."body_excerpt") <= 600),
	CONSTRAINT "chk_email_triagens_prazo_data_conf" CHECK ("email_triagens"."prazo_data" is null or "email_triagens"."prazo_confianca_data" is not null),
	CONSTRAINT "chk_email_triagens_sem_prazo_sem_tipo" CHECK ("email_triagens"."ha_prazo" = true or ("email_triagens"."prazo_data" is null and "email_triagens"."prazo_hora" is null and "email_triagens"."prazo_confianca_data" is null and "email_triagens"."tipo_prazo" is null and "email_triagens"."trecho_fonte_do_prazo" is null)),
	CONSTRAINT "chk_email_triagens_prazo_com_evidencia" CHECK ("email_triagens"."ha_prazo" = false or jsonb_array_length("email_triagens"."source_evidence") > 0),
	CONSTRAINT "chk_email_triagens_juridico_validacao" CHECK ("email_triagens"."categoria" <> 'juridico' or "email_triagens"."exige_validacao_humana" = true),
	CONSTRAINT "chk_email_triagens_risco_validacao" CHECK ("email_triagens"."nivel_risco" not in ('alto', 'critico') or "email_triagens"."exige_validacao_humana" = true),
	CONSTRAINT "chk_email_triagens_confianca_validacao" CHECK ("email_triagens"."confianca" = 'alta' or "email_triagens"."exige_validacao_humana" = true)
);
--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD COLUMN "signing_secret_ciphertext" text;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_document_id" text;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_status" "assinafy_document_status";--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_assignment_id" text;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_signer_id" text;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_signed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oficios" ADD COLUMN "assinafy_error" text;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD CONSTRAINT "email_triagens_usuario_validador_id_admins_id_fk" FOREIGN KEY ("usuario_validador_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_triagens_thread_id" ON "email_triagens" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_history_id" ON "email_triagens" USING btree ("history_id");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_status" ON "email_triagens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_received_at" ON "email_triagens" USING btree ("received_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_email_triagens_prazo_data" ON "email_triagens" USING btree ("prazo_data") WHERE "email_triagens"."ha_prazo" = true and "email_triagens"."prazo_data" is not null;--> statement-breakpoint
CREATE INDEX "idx_email_triagens_exige_validacao" ON "email_triagens" USING btree ("exige_validacao_humana") WHERE "email_triagens"."exige_validacao_humana" = true;--> statement-breakpoint
CREATE INDEX "idx_email_triagens_source_evidence_gin" ON "email_triagens" USING gin ("source_evidence");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_resumo_anexos_gin" ON "email_triagens" USING gin ("resumo_anexos");--> statement-breakpoint
ALTER TABLE "oficios" ADD CONSTRAINT "oficios_assinafy_document_id_unique" UNIQUE("assinafy_document_id");