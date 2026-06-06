ALTER TABLE "legal_consultations" ADD COLUMN "lawyer_id" bigint;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD COLUMN "thread_id" varchar(255);--> statement-breakpoint
ALTER TABLE "email_triagens" ADD COLUMN "consultation_id" bigint;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD COLUMN "lawyer_id" bigint;--> statement-breakpoint
ALTER TABLE "legal_consultations" ADD CONSTRAINT "legal_consultations_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD CONSTRAINT "email_triagens_consultation_id_legal_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."legal_consultations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_triagens" ADD CONSTRAINT "email_triagens_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_legal_consultations_lawyer" ON "legal_consultations" USING btree ("lawyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_legal_consultations_thread" ON "legal_consultations" ("thread_id") WHERE thread_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_email_triagens_consultation" ON "email_triagens" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX "idx_email_triagens_lawyer" ON "email_triagens" USING btree ("lawyer_id");
