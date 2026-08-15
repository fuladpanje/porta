<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE portfolio_items ADD COLUMN notification_cooldown_minutes INT NOT NULL DEFAULT 10 AFTER sms_support_2_count");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE portfolio_items DROP COLUMN notification_cooldown_minutes");
    }
};
