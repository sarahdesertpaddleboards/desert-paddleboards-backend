CREATE TABLE `gift_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`recipient_name` varchar(255),
	`recipient_email` varchar(255),
	`message` text,
	`generated_code` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `gift_certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`address_line1` varchar(255) NOT NULL,
	`address_line2` varchar(255),
	`city` varchar(255) NOT NULL,
	`state` varchar(255),
	`postal_code` varchar(50) NOT NULL,
	`country` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `shipping_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `raw` text NOT NULL;--> statement-breakpoint
ALTER TABLE `class_products` ADD `product_type` varchar(32) NOT NULL;