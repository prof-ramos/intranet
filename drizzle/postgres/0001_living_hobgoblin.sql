ALTER TABLE "app_settings" ALTER COLUMN "key" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_cpf_pii" CHECK ("associates"."cpf" IS NULL OR "associates"."cpf_ciphertext" IS NULL);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_email_pii" CHECK ("associates"."primary_email" IS NULL OR "associates"."primary_email_ciphertext" IS NULL);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_phone_pii" CHECK ("associates"."phone" IS NULL OR "associates"."phone_ciphertext" IS NULL);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_address_pii" CHECK ("associates"."address" IS NULL OR "associates"."address_ciphertext" IS NULL);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_whatsapp_pii" CHECK ("associates"."whatsapp" IS NULL OR "associates"."whatsapp_ciphertext" IS NULL);--> statement-breakpoint
ALTER TABLE "associates" ADD CONSTRAINT "chk_associates_siape_pii" CHECK ("associates"."siape" IS NULL OR "associates"."siape_ciphertext" IS NULL);