CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`service` text NOT NULL,
	`budget` text NOT NULL,
	`timing` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'nuevo' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`rate_key` text NOT NULL,
	`privacy_version` text NOT NULL,
	`notification_status` text DEFAULT 'pendiente' NOT NULL,
	`notified_at` integer
);
--> statement-breakpoint
CREATE INDEX `leads_rate_created` ON `leads` (`rate_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `leads_created` ON `leads` (`created_at`);CREATE TABLE login_codes(code_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL);
CREATE TABLE login_attempts(rate_key TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX login_attempts_time ON login_attempts(created_at);
