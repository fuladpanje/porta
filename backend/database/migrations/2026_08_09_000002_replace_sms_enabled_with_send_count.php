<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // portfolio_items: حذف sms_enabled، اضافه کردن ۴ ستون تعداد
        DB::statement("ALTER TABLE portfolio_items DROP COLUMN sms_enabled");
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN sms_resistance_1_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER support_2");
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN sms_resistance_2_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_resistance_1_count");
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN sms_support_1_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_resistance_2_count");
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN sms_support_2_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_support_1_count");

        // user_symbol_levels: حذف sms_enabled، اضافه کردن ۴ ستون تعداد
        DB::statement("ALTER TABLE user_symbol_levels DROP COLUMN sms_enabled");
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN sms_resistance_1_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER support_2");
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN sms_resistance_2_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_resistance_1_count");
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN sms_support_1_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_resistance_2_count");
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN sms_support_2_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER sms_support_1_count");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE portfolio_items DROP COLUMN sms_resistance_1_count, DROP COLUMN sms_resistance_2_count, DROP COLUMN sms_support_1_count, DROP COLUMN sms_support_2_count");
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN sms_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER support_2");

        DB::statement("ALTER TABLE user_symbol_levels DROP COLUMN sms_resistance_1_count, DROP COLUMN sms_resistance_2_count, DROP COLUMN sms_support_1_count, DROP COLUMN sms_support_2_count");
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN sms_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER support_2");
    }
};
