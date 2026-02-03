CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int NOT NULL,
	`file_key` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gift_certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(100) NOT NULL,
	`product_id` int NOT NULL,
	`amount` int NOT NULL,
	`redeemed` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `gift_certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `gift_certificates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int DEFAULT 1,
	`stripe_session_id` varchar(255),
	`fulfilled` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`override_name` varchar(255),
	`override_price` int,
	CONSTRAINT `product_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_key` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`currency` varchar(10) DEFAULT 'usd',
	`image_url` varchar(500),
	`active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_product_key_unique` UNIQUE(`product_key`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`stripe_session_id` varchar(255),
	`email` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipping_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`address1` varchar(255) NOT NULL,
	`address2` varchar(255),
	`city` varchar(255) NOT NULL,
	`region` varchar(255),
	`postal_code` varchar(50) NOT NULL,
	`country` varchar(100) NOT NULL,
	CONSTRAINT `shipping_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `class_products` MODIFY COLUMN `product_key` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `class_products` MODIFY COLUMN `description` text;--> statement-breakpoint
ALTER TABLE `class_products` MODIFY COLUMN `capacity` int NOT NULL;--> statement-breakpoint
ALTER TABLE `class_products` MODIFY COLUMN `active` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `class_products` MODIFY COLUMN `product_type` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `venues` ADD CONSTRAINT `venues_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `class_sessions` ADD CONSTRAINT `class_sessions_class_product_id_class_products_id_fk` FOREIGN KEY (`class_product_id`) REFERENCES `class_products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_sessions` ADD CONSTRAINT `class_sessions_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;