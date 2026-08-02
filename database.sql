-- Porta Database Schema
-- Generated from Laravel migrations

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `unit` varchar(10) NOT NULL DEFAULT 'rial',
  `auto_switch` tinyint(1) NOT NULL DEFAULT 1,
  `schedule_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `schedule_seconds` int NOT NULL DEFAULT 0,
  `schedule_minutes` int NOT NULL DEFAULT 5,
  `schedule_hours` int NOT NULL DEFAULT 0,
  `schedule_start_time` time NULL DEFAULT NULL,
  `schedule_end_time` time NULL DEFAULT NULL,
  `commission_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `buy_commission` decimal(5,2) NOT NULL DEFAULT 0.37,
  `sell_commission` decimal(5,2) NOT NULL DEFAULT 0.88,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `is_stale` tinyint(1) NOT NULL DEFAULT 1,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: portfolios
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portfolios` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `commission_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `buy_commission` decimal(5,2) NOT NULL DEFAULT 0.37,
  `sell_commission` decimal(5,2) NOT NULL DEFAULT 0.88,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `portfolios_user_id_foreign` (`user_id`),
  CONSTRAINT `portfolios_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: portfolio_items
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portfolio_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `portfolio_id` bigint UNSIGNED NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `last_price` decimal(12,2) DEFAULT NULL,
  `pe` decimal(12,2) DEFAULT NULL,
  `buy_price` decimal(12,2) NOT NULL,
  `quantity` decimal(12,4) NOT NULL,
  `sell_price` decimal(12,2) DEFAULT NULL,
  `resistance_1` decimal(12,2) DEFAULT NULL,
  `resistance_2` decimal(12,2) DEFAULT NULL,
  `resistance_3` decimal(12,2) DEFAULT NULL,
  `support_1` decimal(12,2) DEFAULT NULL,
  `support_2` decimal(12,2) DEFAULT NULL,
  `support_3` decimal(12,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `portfolio_items_portfolio_id_foreign` (`portfolio_id`),
  CONSTRAINT `portfolio_items_portfolio_id_foreign` FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: system_settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NULL,
  `description` varchar(255) NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `system_settings_setting_key_unique` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: symbols_cache
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `symbols_cache` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `isin` varchar(50) NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `full_name` varchar(500) NOT NULL,
  `last_price` decimal(12,2) DEFAULT NULL,
  `pe` decimal(12,2) DEFAULT NULL,
  `price_change_percent` decimal(8,2) DEFAULT NULL,
  `price_change` decimal(12,2) DEFAULT NULL,
  `sector` varchar(255) DEFAULT NULL,
  `last_updated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `symbols_cache_isin_unique` (`isin`),
  KEY `symbols_cache_symbol_index` (`symbol`),
  KEY `symbols_cache_full_name_index` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: api_keys
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `api_key` text NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `daily_requests` int NOT NULL DEFAULT 0,
  `last_reset_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `api_keys_user_id_foreign` (`user_id`),
  CONSTRAINT `api_keys_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: favorites
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `symbol` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `favorites_user_id_symbol_unique` (`user_id`, `symbol`),
  CONSTRAINT `favorites_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: sessions
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `payload` longtext NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: personal_access_tokens
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint UNSIGNED NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`, `tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Table: migrations
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Default system_settings data
-- --------------------------------------------------------
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`, `created_at`, `updated_at`) VALUES
('api_keys', '[]', 'کلیدهای API سیستم (JSON array)', NOW(), NOW()),
('schedule_enabled', 'false', 'فعال/غیرفعال بودن زمان‌بندی', NOW(), NOW()),
('schedule_seconds', '0', 'ثانیه‌های زمان‌بندی', NOW(), NOW()),
('schedule_minutes', '5', 'دقیقه‌های زمان‌بندی', NOW(), NOW()),
('schedule_hours', '0', 'ساعت‌های زمان‌بندی', NOW(), NOW()),
('schedule_start_time', NULL, 'زمان شروع بازه اجرا', NOW(), NOW()),
('schedule_end_time', NULL, 'زمان پایان بازه اجرا', NOW(), NOW()),
('auto_switch', 'true', 'چرخش خودکار کلید API', NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;
