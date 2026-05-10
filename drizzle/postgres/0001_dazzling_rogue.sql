CREATE TABLE "login_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "login_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"attempts" bigint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "associates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "activities_completed_at_check";--> statement-breakpoint
CREATE INDEX "idx_login_attempts_email" ON "login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_expires_at" ON "login_attempts" USING btree ("expires_at");--> statement-breakpoint
DROP POLICY "admins_all" ON "admins" CASCADE;--> statement-breakpoint
DROP POLICY "associates_all" ON "associates" CASCADE;--> statement-breakpoint
DROP POLICY "activities_all" ON "activities" CASCADE;--> statement-breakpoint
DROP POLICY "audit_logs_all" ON "audit_logs" CASCADE;