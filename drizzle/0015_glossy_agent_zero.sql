CREATE TABLE `backup_config` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_enabled` integer DEFAULT true NOT NULL,
	`weekly_enabled` integer DEFAULT true NOT NULL,
	`monthly_enabled` integer DEFAULT true NOT NULL,
	`daily_retention` integer DEFAULT 7 NOT NULL,
	`weekly_retention` integer DEFAULT 4 NOT NULL,
	`monthly_retention` integer DEFAULT 12 NOT NULL,
	`updated_at` integer NOT NULL
);
