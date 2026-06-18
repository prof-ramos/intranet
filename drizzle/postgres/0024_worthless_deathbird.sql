CREATE TABLE "integration_signature_nonces" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "integration_signature_nonces_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"key_id" text NOT NULL,
	"signature" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_signature_nonces_key_sig_idx" ON "integration_signature_nonces" USING btree ("key_id","signature");--> statement-breakpoint
CREATE INDEX "integration_signature_nonces_expires_idx" ON "integration_signature_nonces" USING btree ("expires_at");