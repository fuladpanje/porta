<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->time('sms_start_time')->nullable()->after('sms_cooldown_minutes');
            $table->time('sms_end_time')->nullable()->after('sms_start_time');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['sms_start_time', 'sms_end_time']);
        });
    }
};
