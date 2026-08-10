<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // حذف duplicate ها
        DB::statement("DELETE FROM portfolio_sms_settings WHERE id NOT IN (SELECT * FROM (SELECT MIN(id) FROM portfolio_sms_settings GROUP BY user_id, portfolio_id, send_time) AS tmp)");

        // غیرفعال کردن بررسی FK موقتی
        DB::statement("SET FOREIGN_KEY_CHECKS=0");

        // حذف unique key قدیمی
        DB::statement("ALTER TABLE portfolio_sms_settings DROP INDEX portfolio_sms_settings_user_id_portfolio_id_unique");

        // اضافه کردن unique key جدید
        DB::statement("ALTER TABLE portfolio_sms_settings ADD UNIQUE KEY portfolio_sms_settings_user_portfolio_time (user_id, portfolio_id, send_time)");

        // فعال کردن مجدد FK
        DB::statement("SET FOREIGN_KEY_CHECKS=1");
    }

    public function down(): void
    {
        DB::statement("SET FOREIGN_KEY_CHECKS=0");
        DB::statement("ALTER TABLE portfolio_sms_settings DROP INDEX portfolio_sms_settings_user_portfolio_time");
        DB::statement("ALTER TABLE portfolio_sms_settings ADD UNIQUE KEY portfolio_sms_settings_user_id_portfolio_id_unique (user_id, portfolio_id)");
        DB::statement("SET FOREIGN_KEY_CHECKS=1");
    }
};
