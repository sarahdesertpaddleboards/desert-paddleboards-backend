ALTER TABLE `gift_certificates` MODIFY COLUMN `generated_code` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `raw` json NOT NULL;