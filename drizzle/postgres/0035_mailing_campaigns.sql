CREATE TYPE "public"."mailing_campaign_status" AS ENUM('rascunho', 'em_envio', 'concluida', 'falhou', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."mailing_channel" AS ENUM('email', 'etiquetas');--> statement-breakpoint
CREATE TYPE "public"."mailing_recipient_status" AS ENUM('pendente', 'enviando', 'enviado', 'falhou', 'cancelado');--> statement-breakpoint
CREATE TABLE "mailing_campaigns" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mailing_campaigns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"channel" "mailing_channel" NOT NULL,
	"subject" text,
	"template_body" text NOT NULL,
	"status" "mailing_campaign_status" DEFAULT 'rascunho' NOT NULL,
	"filters" jsonb NOT NULL,
	"recipient_count" integer NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by" bigint,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_recipients" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mailing_recipients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"campaign_id" bigint NOT NULL,
	"associate_id" bigint,
	"recipient_name" text NOT NULL,
	"email_ciphertext" text,
	"status" "mailing_recipient_status" DEFAULT 'pendente' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailing_campaigns" ADD CONSTRAINT "mailing_campaigns_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_recipients" ADD CONSTRAINT "mailing_recipients_campaign_id_mailing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."mailing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_recipients" ADD CONSTRAINT "mailing_recipients_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mailing_campaigns_created_by" ON "mailing_campaigns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_mailing_campaigns_status_created_at" ON "mailing_campaigns" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mailing_recipients_campaign_associate" ON "mailing_recipients" USING btree ("campaign_id","associate_id");--> statement-breakpoint
CREATE INDEX "idx_mailing_recipients_campaign_status" ON "mailing_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "idx_mailing_recipients_pending" ON "mailing_recipients" USING btree ("campaign_id") WHERE "mailing_recipients"."status" = 'pendente';