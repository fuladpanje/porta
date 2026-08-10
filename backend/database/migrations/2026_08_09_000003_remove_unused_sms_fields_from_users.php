<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users DROP COLUMN sms_cooldown_minutes, DROP COLUMN sms_start_time, DROP COLUMN sms_end_time, DROP COLUMN sms_scope, DROP COLUMN sms_once_enabled");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN sms_cooldown_minutes INT NOT NULL DEFAULT 60 AFTER sms_enabled");
        DB::statement("ALTER TABLE users ADD COLUMN sms_start_time TIME NULL AFTER sms_cooldown_minutes");
        DB::statement("ALTER TABLE users ADD COLUMN sms_end_time TIME NULL AFTER sms_start_time");
        DB::statement("ALTER TABLE users ADD COLUMN sms_scope VARCHAR(20) NOT NULL DEFAULT 'portfolio' AFTER sms_end_time");
        DB::statement("ALTER TABLE users ADD COLUMN sms_once_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER sms_scope");
    }
};
