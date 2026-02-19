CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`target_id` text,
	`target_email` text,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
