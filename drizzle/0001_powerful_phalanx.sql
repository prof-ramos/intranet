CREATE INDEX `idx_associates_association_status` ON `associates` (`association_status`);--> statement-breakpoint
CREATE INDEX `idx_associates_contribution_status` ON `associates` (`contribution_status`);--> statement-breakpoint
CREATE INDEX `idx_associates_status_name` ON `associates` (`association_status`,`full_name`);--> statement-breakpoint
CREATE INDEX `idx_activities_status` ON `activities` (`status`);--> statement-breakpoint
CREATE INDEX `idx_activities_due_date` ON `activities` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_activities_status_due_date` ON `activities` (`status`,`due_date`);