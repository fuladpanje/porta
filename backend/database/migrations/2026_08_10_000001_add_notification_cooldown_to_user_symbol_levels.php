<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE user_symbol_levels ADD COLUMN notification_cooldown_minutes INT NOT NULL DEFAULT 10 AFTER sms_cooldown_minutes");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE user_symbol_levels DROP COLUMN notification_cooldown_minutes");
    }
};
