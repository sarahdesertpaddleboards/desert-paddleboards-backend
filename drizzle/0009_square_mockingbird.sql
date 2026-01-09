CREATE TABLE `class_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` varchar(2000),
	`price` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`image_url` varchar(500),
	`capacity` int NOT NULL DEFAULT 1,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `class_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_products_product_key_unique` UNIQUE(`product_key`)
);
--> statement-breakpoint
CREATE TABLE `class_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_product_id` int NOT NULL,
	`start_time` timestamp NOT NULL,
	`end_time` timestamp,
	`seats_total` int NOT NULL,
	`seats_available` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `class_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_overrides` ADD `type` varchar(32);