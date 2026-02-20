DROP INDEX `invite_token_token_unique`;--> statement-breakpoint
ALTER TABLE `invite_token` ADD `token_hash` text;--> statement-breakpoint
ALTER TABLE `invite_token` ADD `email_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `invite_token_token_hash_unique` ON `invite_token` (`token_hash`);--> statement-breakpoint
DROP INDEX `session_token_unique`;--> statement-breakpoint
ALTER TABLE `session` ADD `token_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_hash_unique` ON `session` (`token_hash`);--> statement-breakpoint
DROP INDEX `user_email_unique`;--> statement-breakpoint
ALTER TABLE `user` ADD `email_hash` text;--> statement-breakpoint
ALTER TABLE `user` ADD `pending_email_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_hash_unique` ON `user` (`email_hash`);--> statement-breakpoint
ALTER TABLE `email_verification_code` ADD `email_hash` text;