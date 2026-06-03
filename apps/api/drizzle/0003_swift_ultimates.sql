PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_conversation_starters` (
	`id` text PRIMARY KEY NOT NULL,
	`interests_id` text,
	`category` text NOT NULL,
	`prompt` text NOT NULL,
	`trigger_minute` integer NOT NULL,
	FOREIGN KEY (`interests_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "conversation_starters_trigger_minute_check" CHECK("__new_conversation_starters"."trigger_minute" IN (0, 5, 10, 15, 20, 25, 30, 35, 40, 45))
);
--> statement-breakpoint
INSERT INTO `__new_conversation_starters`("id", "interests_id", "category", "prompt", "trigger_minute") SELECT "id", "interests_id", "category", "prompt", "trigger_minute" FROM `conversation_starters`;--> statement-breakpoint
DROP TABLE `conversation_starters`;--> statement-breakpoint
ALTER TABLE `__new_conversation_starters` RENAME TO `conversation_starters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;