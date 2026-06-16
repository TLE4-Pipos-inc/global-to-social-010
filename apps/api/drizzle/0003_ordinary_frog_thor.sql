CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`partnership_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`starts_at` text,
	`ends_at` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`partnership_id`) REFERENCES `venue_partnerships`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_deals_partnership` ON `deals` (`partnership_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_partnerships_venue_partner_unique` ON `venue_partnerships` (`venue_id`,`partner_id`);--> statement-breakpoint
ALTER TABLE `venue_partnerships` DROP COLUMN `deal_title`;--> statement-breakpoint
ALTER TABLE `venue_partnerships` DROP COLUMN `deal_description`;--> statement-breakpoint
ALTER TABLE `venue_partnerships` DROP COLUMN `starts_at`;--> statement-breakpoint
ALTER TABLE `venue_partnerships` DROP COLUMN `ends_at`;--> statement-breakpoint
ALTER TABLE `venue_partnerships` DROP COLUMN `active`;