CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripe_session_id` varchar(255) NOT NULL,
	`product_key` varchar(64) NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(10) NOT NULL,
	`customer_email` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_stripe_session_id_unique` UNIQUE(`stripe_session_id`)
);
