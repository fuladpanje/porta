<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN sms_cooldown_minutes INT NOT NULL DEFAULT 60 AFTER sms_enabled");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users DROP COLUMN sms_cooldown_minutes");
    }
};
