CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`token` varchar(64) NOT NULL,
	`used_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`),
	CONSTRAINT `downloads_token_unique` UNIQUE(`token`)
);
