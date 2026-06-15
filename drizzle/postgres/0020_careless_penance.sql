CREATE TYPE "public"."career_origin" AS ENUM('brasil', 'exterior', 'outros_orgaos');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('solteiro', 'casado', 'divorciado', 'viuvo', 'separado', 'outros');--> statement-breakpoint
CREATE TYPE "public"."mission_type" AS ENUM('permanente', 'transitoria');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TABLE "dependents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dependents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"associate_id" bigint NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_agreements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "health_agreements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"associate_id" bigint NOT NULL,
	"provider" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "sex" "sex";--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "marital_status" "marital_status";--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "birth_city" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "birth_state" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg_ciphertext" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg_hash" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg_issuer" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg_state" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "rg_expedition_date" date;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "zip_code" text;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "mission_type" "mission_type";--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "career_origin" "career_origin";--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "admission_date" date;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "inauguration_date" date;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "cancellation_date" date;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "ceoc_member" boolean;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "caoc_member" boolean;--> statement-breakpoint
ALTER TABLE "associates" ADD COLUMN "number_of_dependents" integer;--> statement-breakpoint
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_agreements" ADD CONSTRAINT "health_agreements_associate_id_associates_id_fk" FOREIGN KEY ("associate_id") REFERENCES "public"."associates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dependents_associate_id" ON "dependents" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_health_agreements_associate_id" ON "health_agreements" USING btree ("associate_id");--> statement-breakpoint
CREATE INDEX "idx_associates_rg_hash" ON "associates" USING btree ("rg_hash");--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_rg_pii" CHECK ("associates"."rg" IS NULL OR "associates"."rg_ciphertext" IS NULL);