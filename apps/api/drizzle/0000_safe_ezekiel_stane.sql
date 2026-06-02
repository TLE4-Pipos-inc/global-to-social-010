CREATE TABLE `collage_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`collage_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`display_order` integer NOT NULL,
	`caption` text,
	FOREIGN KEY (`collage_id`) REFERENCES `collages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "collage_photos_display_order_check" CHECK("collage_photos"."display_order" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collage_photos_collage_id_display_order_unique` ON `collage_photos` (`collage_id`,`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `collage_photos_collage_id_photo_id_unique` ON `collage_photos` (`collage_id`,`photo_id`);--> statement-breakpoint
CREATE TABLE `collages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`collage_url` text,
	`layout_type` text DEFAULT 'five_stop_grid' NOT NULL,
	`share_token` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collages_session_id_unique` ON `collages` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `collages_share_token_unique` ON `collages` (`share_token`);--> statement-breakpoint
CREATE TABLE `conversation_starters` (
	`id` text PRIMARY KEY NOT NULL,
	`interests_id` text,
	`category` text NOT NULL,
	`prompt` text NOT NULL,
	`trigger_minute` integer NOT NULL,
	FOREIGN KEY (`interests_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "conversation_starters_trigger_minute_check" CHECK("conversation_starters"."trigger_minute" IN (0, 5, 10, 15))
);
--> statement-breakpoint
CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`route_id` text NOT NULL,
	`theme_id` text,
	`selected_time_slot` text NOT NULL,
	`status` text DEFAULT 'setup' NOT NULL,
	`current_stop_index` integer DEFAULT 0 NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`group_id`) REFERENCES `player_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`theme_id`) REFERENCES `route_themes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "game_sessions_current_stop_index_check" CHECK("game_sessions"."current_stop_index" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_game_sessions_group` ON `game_sessions` (`group_id`);--> statement-breakpoint
CREATE INDEX `idx_game_sessions_route` ON `game_sessions` (`route_id`);--> statement-breakpoint
CREATE TABLE `group_interests` (
	`group_id` text NOT NULL,
	`interest_id` text NOT NULL,
	PRIMARY KEY(`group_id`, `interest_id`),
	FOREIGN KEY (`group_id`) REFERENCES `player_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `group_join_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`match_score` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`matched_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `player_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "group_join_matches_match_score_check" CHECK("group_join_matches"."match_score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_join_matches_user_id_group_id_unique` ON `group_join_matches` (`user_id`,`group_id`);--> statement-breakpoint
CREATE INDEX `idx_group_join_matches_user` ON `group_join_matches` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_group_join_matches_group` ON `group_join_matches` (`group_id`);--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `player_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `group_members_group_id_user_id_unique` ON `group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `interests` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interests_name_unique` ON `interests` (`name`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`password` text NOT NULL,
	`organization_name` text NOT NULL,
	`contact_email` text,
	`partnership_type` text NOT NULL,
	`status` text DEFAULT 'prospect' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`session_stop_id` text NOT NULL,
	`uploaded_by_group_id` text,
	`photo_url` text,
	`local_uri` text,
	`proof_type` text DEFAULT 'venue_proof' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`session_stop_id`) REFERENCES `session_stops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_group_id`) REFERENCES `player_groups`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "photos_photo_url_or_local_uri_check" CHECK("photos"."photo_url" IS NOT NULL OR "photos"."local_uri" IS NOT NULL)
);
--> statement-breakpoint
CREATE INDEX `idx_photos_session_stop` ON `photos` (`session_stop_id`);--> statement-breakpoint
CREATE TABLE `player_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`group_name` text NOT NULL,
	`group_size` integer NOT NULL,
	`selected_time_slot` text NOT NULL,
	`match_status` text DEFAULT 'waiting' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "player_groups_group_size_check" CHECK("player_groups"."group_size" BETWEEN 4 AND 8)
);
--> statement-breakpoint
CREATE INDEX `idx_player_groups_time_slot` ON `player_groups` (`selected_time_slot`);--> statement-breakpoint
CREATE TABLE `route_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`route_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`route_order` integer NOT NULL,
	`planned_duration_minutes` integer DEFAULT 20 NOT NULL,
	`walk_label` text,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "route_stops_route_order_check" CHECK("route_stops"."route_order" > 0),
	CONSTRAINT "route_stops_planned_duration_minutes_check" CHECK("route_stops"."planned_duration_minutes" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `route_stops_route_id_route_order_unique` ON `route_stops` (`route_id`,`route_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `route_stops_route_id_venue_id_unique` ON `route_stops` (`route_id`,`venue_id`);--> statement-breakpoint
CREATE INDEX `idx_route_stops_route` ON `route_stops` (`route_id`);--> statement-breakpoint
CREATE TABLE `route_themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`mood` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `route_themes_name_unique` ON `route_themes` (`name`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`theme_id` text,
	`name` text NOT NULL,
	`area` text NOT NULL,
	`city` text DEFAULT 'Rotterdam' NOT NULL,
	`route_type` text DEFAULT 'social' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`theme_id`) REFERENCES `route_themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_routes_theme` ON `routes` (`theme_id`);--> statement-breakpoint
CREATE TABLE `session_stops` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`route_stop_id` text NOT NULL,
	`timer_state` text DEFAULT 'not_started' NOT NULL,
	`arrived_at` text,
	`timer_started_at` text,
	`timer_finished_at` text,
	`completed_at` text,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_stop_id`) REFERENCES `route_stops`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_stops_session_id_route_stop_id_unique` ON `session_stops` (`session_id`,`route_stop_id`);--> statement-breakpoint
CREATE INDEX `idx_session_stops_session` ON `session_stops` (`session_id`);--> statement-breakpoint
CREATE TABLE `user_interests` (
	`user_id` text NOT NULL,
	`interest_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `interest_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`email` text,
	`password` text NOT NULL,
	`school` text,
	`campus` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `venue_partnerships` (
	`id` text PRIMARY KEY NOT NULL,
	`venue_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`deal_title` text NOT NULL,
	`deal_description` text,
	`starts_at` text,
	`ends_at` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_venue_partnerships_venue` ON `venue_partnerships` (`venue_id`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`venue_type` text NOT NULL,
	`address` text NOT NULL,
	`description` text,
	`latitude` real,
	`longitude` real,
	`suggested_order` text,
	`vibe` text
);
