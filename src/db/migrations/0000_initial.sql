CREATE TABLE `bill` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`period` text NOT NULL,
	`rent_paise` integer NOT NULL,
	`rate_paise_per_unit` integer NOT NULL,
	`prev_reading` integer,
	`new_reading` integer,
	`units_consumed` integer,
	`electricity_paise` integer,
	`total_paise` integer,
	`is_paid` integer DEFAULT false NOT NULL,
	`paid_at` integer,
	`note` text,
	`photo_uri` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`unit_id`) REFERENCES `unit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bill_unit_period_idx` ON `bill` (`unit_id`,`period`);--> statement-breakpoint
CREATE INDEX `bill_period_idx` ON `bill` (`period`);--> statement-breakpoint
CREATE TABLE `building` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'apartment' NOT NULL,
	`currency_symbol` text DEFAULT '₹' NOT NULL,
	`country_code` text DEFAULT '91' NOT NULL,
	`default_rent_paise` integer DEFAULT 0 NOT NULL,
	`rate_paise_per_unit` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `floor` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`level` integer NOT NULL,
	`label` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `floor_building_idx` ON `floor` (`building_id`,`level`);--> statement-breakpoint
CREATE TABLE `unit` (
	`id` text PRIMARY KEY NOT NULL,
	`floor_id` text NOT NULL,
	`label` text NOT NULL,
	`position` integer NOT NULL,
	`tenant_name` text,
	`tenant_phone` text,
	`rent_paise` integer,
	`rate_paise_per_unit` integer,
	`meter_digits` integer DEFAULT 5 NOT NULL,
	`opening_reading` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`floor_id`) REFERENCES `floor`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `unit_floor_idx` ON `unit` (`floor_id`,`position`);