CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
DROP TABLE `eventTypes`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
DROP TABLE `giftCertificates`;--> statement-breakpoint
DROP TABLE `locations`;--> statement-breakpoint
DROP TABLE `musicPurchases`;--> statement-breakpoint
DROP TABLE `newsletterSubscribers`;--> statement-breakpoint
DROP TABLE `orderItems`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
DROP TABLE `privateEventInquiries`;--> statement-breakpoint
DROP TABLE `productCategories`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
DROP TABLE `trackPreviewPlays`;--> statement-breakpoint
DROP TABLE `users`;