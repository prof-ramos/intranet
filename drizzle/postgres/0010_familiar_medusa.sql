CREATE TYPE "public"."payment_method" AS ENUM('folha', 'boleto', 'pix', 'transferencia', 'outros');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pago', 'pendente', 'atrasado', 'isento');--> statement-breakpoint
CREATE TABLE "monthly_payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monthly_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"associate_id" bigint NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pendente' NOT NULL,
	"payment_method" "payment_method" DEFAULT 'folha' NOT NULL,
	"paid_at" timestamp with time zone,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "payment_method" "payment_method" DEFAULT 'folha' NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_payments" ADD CONSTRAINT "monthly_payments_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_monthly_payments_unique" ON "monthly_payments" USING btree ("associate_id","year","month");