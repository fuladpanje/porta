<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('schedule_enabled')->default(false)->after('auto_switch');
            $table->integer('schedule_seconds')->default(0)->after('schedule_enabled');
            $table->integer('schedule_minutes')->default(0)->after('schedule_seconds');
            $table->integer('schedule_hours')->default(0)->after('schedule_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['schedule_enabled', 'schedule_seconds', 'schedule_minutes', 'schedule_hours']);
        });
    }
};