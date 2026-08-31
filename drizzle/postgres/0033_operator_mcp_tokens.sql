CREATE TABLE "operator_mcp_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operator_mcp_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"admin_id" bigint NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"lgpd_acknowledged_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operator_mcp_tokens" ADD CONSTRAINT "operator_mcp_tokens_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_operator_mcp_tokens_token_hash_unique" ON "operator_mcp_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_operator_mcp_tokens_admin_id" ON "operator_mcp_tokens" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_operator_mcp_tokens_active" ON "operator_mcp_tokens" USING btree ("admin_id") WHERE "operator_mcp_tokens"."revoked_at" is null;