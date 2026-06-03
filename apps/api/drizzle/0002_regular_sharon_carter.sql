PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_route_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`route_order` integer NOT NULL,
	`planned_duration_minutes` integer DEFAULT 45 NOT NULL,
	`walk_label` text,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "route_stops_route_order_check" CHECK("__new_route_stops"."route_order" > 0),
	CONSTRAINT "route_stops_planned_duration_minutes_check" CHECK("__new_route_stops"."planned_duration_minutes" > 0 AND "__new_route_stops"."planned_duration_minutes" <= 45)
);
--> statement-breakpoint
INSERT INTO `__new_route_stops`("id", "route_id", "venue_id", "route_order", "planned_duration_minutes", "walk_label") SELECT "id", "route_id", "venue_id", "route_order", "planned_duration_minutes", "walk_label" FROM `route_stops`;--> statement-breakpoint
DROP TABLE `route_stops`;--> statement-breakpoint
ALTER TABLE `__new_route_stops` RENAME TO `route_stops`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `route_stops_route_id_route_order_unique` ON `route_stops` (`route_id`,`route_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `route_stops_route_id_venue_id_unique` ON `route_stops` (`route_id`,`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_route_stops_route` ON `route_stops` (`route_id`);