UPDATE "associates" SET "marital_status" = null WHERE "marital_status" = 'outros';--> statement-breakpoint
ALTER TABLE "associates" ALTER COLUMN "marital_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."marital_status";--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('solteiro', 'casado', 'divorciado', 'viuvo', 'separado');--> statement-breakpoint
ALTER TABLE "associates" ALTER COLUMN "marital_status" SET DATA TYPE "public"."marital_status" USING "marital_status"::"public"."marital_status";