PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_admins`("id", "name", "email", "password_hash", "role", "is_active", "must_change_password", "created_at", "updated_at") SELECT "id", "name", "email", "password_hash", "role", "is_active", "must_change_password", "created_at", "updated_at" FROM `admins`;--> statement-breakpoint
DROP TABLE `admins`;--> statement-breakpoint
ALTER TABLE `__new_admins` RENAME TO `admins`;--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `__new_associates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_row_number` text,
	`full_name` text NOT NULL,
	`cpf` text,
	`primary_email` text,
	`phone` text,
	`whatsapp` text,
	`siape` text,
	`functional_status` text,
	`assignment` text,
	`assignment_start_date` text,
	`location_city` text,
	`location_country` text,
	`association_status` text DEFAULT 'ativo' NOT NULL,
	`joined_at` text,
	`association_category` text,
	`contribution_status` text DEFAULT 'pendente_migracao' NOT NULL,
	`address` text,
	`secondary_email` text,
	`internal_notes` text,
	`birth_date` text,
	`class_pattern` text,
	`source_payload` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_associates`("id", "source_row_number", "full_name", "cpf", "primary_email", "phone", "whatsapp", "siape", "functional_status", "assignment", "assignment_start_date", "location_city", "location_country", "association_status", "joined_at", "association_category", "contribution_status", "address", "secondary_email", "internal_notes", "birth_date", "class_pattern", "source_payload", "created_at", "updated_at") SELECT "id", "source_row_number", "full_name", "cpf", "primary_email", "phone", "whatsapp", "siape", "functional_status", "assignment", "assignment_start_date", "location_city", "location_country", "association_status", "joined_at", "association_category", "contribution_status", "address", "secondary_email", "internal_notes", "birth_date", "class_pattern", "source_payload", "created_at", "updated_at" FROM `associates`;--> statement-breakpoint
DROP TABLE `associates`;--> statement-breakpoint
ALTER TABLE `__new_associates` RENAME TO `associates`;--> statement-breakpoint
CREATE INDEX `idx_associates_cpf` ON `associates` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_associates_siape` ON `associates` (`siape`);--> statement-breakpoint
CREATE INDEX `idx_associates_name` ON `associates` (`full_name`);--> statement-breakpoint
CREATE INDEX `idx_associates_association_status` ON `associates` (`association_status`);--> statement-breakpoint
CREATE INDEX `idx_associates_contribution_status` ON `associates` (`contribution_status`);--> statement-breakpoint
CREATE INDEX `idx_associates_status_name` ON `associates` (`association_status`,`full_name`);--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'a_fazer' NOT NULL,
	`assignee_id` integer,
	`due_date` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`associate_id` integer,
	`tags` text DEFAULT '[]',
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`position` real DEFAULT 1000 NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`associate_id`) REFERENCES `associates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "title", "description", "status", "assignee_id", "due_date", "priority", "associate_id", "tags", "created_by", "created_at", "updated_at", "completed_at", "position") SELECT "id", "title", "description", "status", "assignee_id", "due_date", "priority", "associate_id", "tags", "created_by", "created_at", "updated_at", "completed_at", "position" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
CREATE INDEX `idx_activities_status` ON `activities` (`status`);--> statement-breakpoint
CREATE INDEX `idx_activities_due_date` ON `activities` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_activities_status_due_date` ON `activities` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_activities_assignee_id` ON `activities` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_associate_id` ON `activities` (`associate_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_by` ON `activities` (`created_by`);--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`performed_by` integer,
	`changes` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`performed_by`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "action", "entity_type", "entity_id", "performed_by", "changes", "metadata", "created_at") SELECT "id", "action", "entity_type", "entity_id", "performed_by", "changes", "metadata", "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_performed_by` ON `audit_logs` (`performed_by`);--> statement-breakpoint
CREATE INDEX `idx_audit_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
