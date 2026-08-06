<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_symbol_levels', function (Blueprint $table) {
            $table->boolean('sms_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('user_symbol_levels', function (Blueprint $table) {
            $table->dropColumn('sms_enabled');
        });
    }
};
