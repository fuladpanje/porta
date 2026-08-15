-- اضافه کردن ستون notification_cooldown_minutes
-- اگر ستون از قبل وجود داشته باشد، خطا میده که مشکلی نیست

ALTER TABLE `portfolio_items`
ADD COLUMN `notification_cooldown_minutes` int(10) unsigned NOT NULL DEFAULT 10
AFTER `sms_support_2_count`;

ALTER TABLE `user_symbol_levels`
ADD COLUMN `notification_cooldown_minutes` int(10) unsigned NOT NULL DEFAULT 10
AFTER `sms_cooldown_minutes`;
