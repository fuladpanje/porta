<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users ADD COLUMN sms_once_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER sms_scope");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users DROP COLUMN sms_once_enabled");
    }
};
