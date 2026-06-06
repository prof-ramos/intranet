ALTER TYPE "public"."notification_entity_type" ADD VALUE 'email_triagem';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'email_triage_pending' BEFORE 'lgpd_request';--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"admin_id" bigint NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_triagens" DROP CONSTRAINT "chk_email_triagens_juridico_validacao";--> statement-breakpoint
ALTER TABLE "email_triagens" DROP CONSTRAINT "chk_email_triagens_risco_validacao";--> statement-breakpoint
ALTER TABLE "email_triagens" DROP CONSTRAINT "chk_email_triagens_confianca_validacao";--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD COLUMN "lawyer_id" bigint;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD COLUMN "thread_id" varchar(255);--> statement-breakpoint
ALTER TABLE "email_triagens" ADD COLUMN "consultation_id" bigint;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD COLUMN "lawyer_id" bigint;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_password_reset_tokens_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_admin_id" ON "password_reset_tokens" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_admin_unused" ON "password_reset_tokens" USING btree ("admin_id","used_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_password_reset_attempts_email_hash_unique" ON "password_reset_attempts" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "idx_password_reset_attempts_expires_at" ON "password_reset_attempts" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD CONSTRAINT "email_triagens_consultation_id_legal_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."legal_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD CONSTRAINT "email_triagens_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_lawyer" ON "legal_consultations" USING btree ("lawyer_id");--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_thread" ON "legal_consultations" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_consultation" ON "email_triagens" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_lawyer" ON "email_triagens" USING btree ("lawyer_id");