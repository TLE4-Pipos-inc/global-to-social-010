ALTER TABLE `group_join_matches` ADD `session_id` text REFERENCES game_sessions(id);--> statement-breakpoint
CREATE INDEX `idx_group_join_matches_session` ON `group_join_matches` (`session_id`);