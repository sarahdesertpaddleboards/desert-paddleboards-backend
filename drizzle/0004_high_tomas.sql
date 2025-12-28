CREATE TABLE `product_overrides` (
	`product_key` varchar(64) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`price` int,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_overrides_product_key` PRIMARY KEY(`product_key`)
);
