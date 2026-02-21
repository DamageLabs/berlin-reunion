CREATE TABLE `survey` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `survey_answer` (
	`id` text PRIMARY KEY NOT NULL,
	`response_id` text NOT NULL,
	`question_id` text NOT NULL,
	`value` text,
	FOREIGN KEY (`response_id`) REFERENCES `survey_response`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `survey_question`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `survey_question` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text,
	`required` integer DEFAULT true,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `survey`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `survey_response` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text NOT NULL,
	`user_id` text NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `survey`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `survey_response_unique` ON `survey_response` (`survey_id`,`user_id`);