CREATE TYPE "public"."legal_consultation_status" AS ENUM('aberta', 'aguardando_escritorio', 'respondida', 'arquivada');--> statement-breakpoint
CREATE TYPE "public"."legal_satisfaction" AS ENUM('satisfeito', 'insatisfeito', 'sem_resposta');--> statement-breakpoint
CREATE TYPE "public"."legal_process_status" AS ENUM('ativo', 'concluido', 'suspenso');--> statement-breakpoint
CREATE TYPE "public"."legal_process_subtype" AS ENUM('justica_federal', 'stf', 'mre', 'cgu', 'tcu');--> statement-breakpoint
CREATE TYPE "public"."legal_process_type" AS ENUM('judicial', 'administrativo');--> statement-breakpoint
ALTER TYPE "public"."audit_entity_type" ADD VALUE 'legal_consultation';--> statement-breakpoint
ALTER TYPE "public"."audit_entity_type" ADD VALUE 'legal_process';--> statement-breakpoint
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
	"satisfaction" text,
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
	"entity_type" text NOT NULL,
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
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_answered_by_admins_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_processes" ADD CONSTRAINT "legal_processes_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_processes" ADD CONSTRAINT "legal_processes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_notes" ADD CONSTRAINT "legal_notes_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_opinions" ADD CONSTRAINT "legal_opinions_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "idx_legal_opinions_created_at" ON "legal_opinions" USING btree ("created_at");