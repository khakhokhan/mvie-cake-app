CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`pack_size` real NOT NULL,
	`purchase_price` real NOT NULL,
	`loss_percent` real DEFAULT 0 NOT NULL,
	`alert_at` real DEFAULT 0 NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`expiry_date` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ingredients_user_idx` ON `ingredients` (`user_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`items_json` text NOT NULL,
	`subtotal` real NOT NULL,
	`shipping_fee` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`cost_of_goods` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`ordered_at` text NOT NULL,
	`delivered_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`,`ordered_at`);--> statement-breakpoint
CREATE TABLE `productions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`recipe_name` text NOT NULL,
	`batches` integer NOT NULL,
	`quantity_made` integer NOT NULL,
	`material_cost_snapshot` real NOT NULL,
	`total_cost_snapshot` real NOT NULL,
	`unit_cost_snapshot` real NOT NULL,
	`produced_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `productions_user_idx` ON `productions` (`user_id`,`produced_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`shop_name` text DEFAULT 'M’Vie Cake' NOT NULL,
	`seeded_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recipe_ingredients_recipe_idx` ON `recipe_ingredients` (`user_id`,`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`yield_count` integer NOT NULL,
	`sale_price` real NOT NULL,
	`labor_cost` real DEFAULT 0 NOT NULL,
	`packaging_cost` real DEFAULT 0 NOT NULL,
	`other_cost` real DEFAULT 0 NOT NULL,
	`batch_loss_percent` real DEFAULT 0 NOT NULL,
	`finished_stock` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recipes_user_idx` ON `recipes` (`user_id`);--> statement-breakpoint
CREATE TABLE `stock_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`ingredient_name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`purchase_total` real NOT NULL,
	`supplier` text DEFAULT '' NOT NULL,
	`received_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stock_receipts_user_idx` ON `stock_receipts` (`user_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`direction` text NOT NULL,
	`accounting_type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transactions_user_idx` ON `transactions` (`user_id`,`occurred_at`);