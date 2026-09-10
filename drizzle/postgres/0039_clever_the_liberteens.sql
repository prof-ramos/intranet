CREATE TABLE "activity_label_assignments" (
	"activity_id" bigint NOT NULL,
	"label_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" bigint NOT NULL,
	CONSTRAINT "activity_label_assignments_activity_id_label_id_pk" PRIMARY KEY("activity_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "activity_labels" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_labels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color_token" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_labels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "activity_label_assignments" ADD CONSTRAINT "activity_label_assignments_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_label_assignments" ADD CONSTRAINT "activity_label_assignments_label_id_activity_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."activity_labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_label_assignments" ADD CONSTRAINT "activity_label_assignments_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_labels_active" ON "activity_labels" USING btree ("active");