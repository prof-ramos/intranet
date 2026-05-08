CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_email_unique` ON `admins` (`email`);--> statement-breakpoint
CREATE TABLE `associates` (
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_associates_cpf` ON `associates` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_associates_siape` ON `associates` (`siape`);--> statement-breakpoint
CREATE INDEX `idx_associates_name` ON `associates` (`full_name`);--> statement-breakpoint
CREATE TABLE `activities` (
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
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`completed_at` text,
	`position` real DEFAULT 1000 NOT NULL,
	FOREIGN KEY (`assignee_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`associate_id`) REFERENCES `associates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`performed_by` integer NOT NULL,
	`changes` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`performed_by`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
