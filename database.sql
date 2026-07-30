SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `migrations`;
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `portfolio_items`;
DROP TABLE IF EXISTS `portfolios`;
DROP TABLE IF EXISTS `api_keys`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `unit` VARCHAR(10) DEFAULT 'rial',
    `auto_switch` TINYINT(1) DEFAULT 1,
    `schedule_enabled` TINYINT(1) DEFAULT 0,
    `schedule_seconds` INT DEFAULT 0,
    `schedule_minutes` INT DEFAULT 0,
    `schedule_hours` INT DEFAULT 0,
    `commission_enabled` TINYINT(1) DEFAULT 0,
    `buy_commission` DECIMAL(5,2) DEFAULT 0.37,
    `sell_commission` DECIMAL(5,2) DEFAULT 0.88,
    `email_verified_at` TIMESTAMP NULL,
    `password` VARCHAR(255) NOT NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portfolios` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `commission_enabled` TINYINT(1) DEFAULT 0,
    `buy_commission` DECIMAL(5,2) DEFAULT 0.37,
    `sell_commission` DECIMAL(5,2) DEFAULT 0.88,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portfolio_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `portfolio_id` BIGINT UNSIGNED NOT NULL,
    `symbol` VARCHAR(255) NOT NULL,
    `last_price` DECIMAL(12,2) NULL,
    `pe` DECIMAL(12,2) NULL,
    `buy_price` DECIMAL(12,2) NOT NULL,
    `quantity` DECIMAL(12,4) NOT NULL,
    `sell_price` DECIMAL(12,2) NULL,
    `resistance_1` DECIMAL(12,2) NULL,
    `resistance_2` DECIMAL(12,2) NULL,
    `resistance_3` DECIMAL(12,2) NULL,
    `support_1` DECIMAL(12,2) NULL,
    `support_2` DECIMAL(12,2) NULL,
    `support_3` DECIMAL(12,2) NULL,
    `active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_keys` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `api_key` TEXT NOT NULL,
    `is_default` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
    `id` VARCHAR(255) PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` LONGTEXT NOT NULL,
    `last_activity` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tokenable_type` VARCHAR(255) NOT NULL,
    `tokenable_id` BIGINT UNSIGNED NOT NULL,
    `name` TEXT NOT NULL,
    `token` TEXT NOT NULL UNIQUE,
    `abilities` TEXT NULL,
    `last_used_at` TIMESTAMP NULL,
    `expires_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `migrations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `migration` VARCHAR(255) NOT NULL,
    `batch` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `migrations` (`migration`, `batch`) VALUES
('2024_01_01_000000_create_users_table', 1),
('2024_01_02_000000_create_portfolios_table', 1),
('2024_01_03_000000_create_portfolio_items_table', 1),
('2026_07_26_171857_create_sessions_table', 1),
('2026_07_26_184816_create_personal_access_tokens_table', 1),
('2026_07_27_000000_add_active_to_portfolio_items_table', 1),
('2026_07_27_230946_add_unit_to_users_table', 1),
('2026_07_28_000000_add_last_price_to_portfolio_items_table', 1),
('2026_07_28_073414_add_auto_switch_to_users_table', 1),
('2026_07_28_104600_create_api_keys_table', 1),
('2026_07_28_131151_add_schedule_to_users_table', 1),
('2026_07_28_140500_add_pe_to_portfolio_items_table', 1),
('2026_07_29_000000_add_commission_to_portfolios_table', 1),
('2026_07_29_000000_add_commission_to_users_table', 1),
('2026_07_29_100000_add_active_to_portfolios_table', 1);

SET FOREIGN_KEY_CHECKS = 1;