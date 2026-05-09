CREATE TYPE "public"."admin_role" AS ENUM('admin', 'diretoria', 'secretaria');--> statement-breakpoint
CREATE TYPE "public"."association_status" AS ENUM('ativo', 'inativo');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('em_dia', 'inadimplente', 'pendente_migracao');--> statement-breakpoint
CREATE TYPE "public"."functional_status" AS ENUM('ativo', 'aposentado', 'cedido', 'em_licenca');--> statement-breakpoint
CREATE TYPE "public"."activity_priority" AS ENUM('baixa', 'normal', 'alta', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('associate', 'admin', 'activity');--> statement-breakpoint
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
CREATE TABLE "associates" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "associates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source_row_number" text,
	"full_name" text NOT NULL,
	"cpf" text,
	"primary_email" text,
	"phone" text,
	"whatsapp" text,
	"siape" text,
	"functional_status" "functional_status",
	"assignment" text,
	"assignment_start_date" date,
	"location_city" text,
	"location_country" text,
	"association_status" "association_status" DEFAULT 'ativo' NOT NULL,
	"joined_at" timestamp with time zone,
	"association_category" text,
	"contribution_status" "contribution_status" DEFAULT 'pendente_migracao' NOT NULL,
	"address" text,
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
	"position" real DEFAULT 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"action" text NOT NULL,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" bigint NOT NULL,
	"performed_by" bigint,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_id_admins_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_admins_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_cpf" ON "associates" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_siape" ON "associates" USING btree ("siape");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_associates_primary_email" ON "associates" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "idx_associates_name" ON "associates" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_associates_association_status" ON "associates" USING btree ("association_status");--> statement-breakpoint
CREATE INDEX "idx_associates_contribution_status" ON "associates" USING btree ("contribution_status");--> statement-breakpoint
CREATE INDEX "idx_associates_status_name" ON "associates" USING btree ("association_status","full_name");--> statement-breakpoint
CREATE INDEX "idx_activities_status" ON "activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_activities_due_date" ON "activities" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_activities_status_due_date" ON "activities" USING btree ("status","due_date");--> statement-breakpoint
CREATE INDEX "idx_activities_assignee_id" ON "activities" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_activities_associate_id" ON "activities" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_activities_created_by" ON "activities" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_audit_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_performed_by" ON "audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_completed_at_check" CHECK (
	("status" = 'concluido' AND "completed_at" IS NOT NULL)
	OR ("status" <> 'concluido' AND "completed_at" IS NULL)
);--> statement-breakpoint
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "admins_set_updated_at"
BEFORE UPDATE ON "admins"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
CREATE TRIGGER "associates_set_updated_at"
BEFORE UPDATE ON "associates"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
CREATE TRIGGER "activities_set_updated_at"
BEFORE UPDATE ON "activities"
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();--> statement-breakpoint
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "associates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins_all" ON "admins" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "associates_all" ON "associates" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "activities_all" ON "activities" FOR ALL USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "audit_logs_all" ON "audit_logs" FOR ALL USING (true) WITH CHECK (true);
