CREATE TABLE `orders` (
	`id` varchar(255) NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`status` varchar(32) NOT NULL,
	`customer_email` varchar(255),
	`stripe_event_id` varchar(255) NOT NULL,
	`raw` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
