PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_event` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_at` integer NOT NULL,
	`duration_minutes` integer DEFAULT 60 NOT NULL,
	`location` text,
	`recurrence_type` text,
	`recurrence_end_at` integer,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_event`("id", "title", "description", "start_at", "duration_minutes", "location", "recurrence_type", "recurrence_end_at", "created_by", "updated_by", "created_at", "updated_at", "visibility") SELECT "id", "title", "description", "start_at", "duration_minutes", "location", "recurrence_type", "recurrence_end_at", "created_by", "updated_by", "created_at", "updated_at", "visibility" FROM `event`;--> statement-breakpoint
DROP TABLE `event`;--> statement-breakpoint
ALTER TABLE `__new_event` RENAME TO `event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `user` ADD `failed_login_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `locked_until` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `last_failed_login_at` integer;