CREATE TABLE `venues` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address_line` varchar(255) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(20) NOT NULL,
  `postal_code` varchar(20),
  `callout` text,
  `notes` text,
  `timezone` varchar(64) NOT NULL DEFAULT 'America/Phoenix',
  `active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT (now()),
  `updated_at` timestamp DEFAULT (now()),
  CONSTRAINT `venues_id` PRIMARY KEY (`id`),
  CONSTRAINT `venues_slug_unique` UNIQUE (`slug`)
);

ALTER TABLE `class_sessions`
  ADD COLUMN `venue_id` int NULL;

CREATE INDEX `class_sessions_venue_id_idx`
  ON `class_sessions` (`venue_id`);

ALTER TABLE `class_sessions`
  ADD CONSTRAINT `class_sessions_venue_id_venues_id_fk`
  FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`);
