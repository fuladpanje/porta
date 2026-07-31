<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->integer('daily_requests')->default(0)->after('is_default');
            $table->timestamp('last_reset_at')->nullable()->after('daily_requests');
        });
    }

    public function down(): void
    {
        Schema::table('api_keys', function (Blueprint $table) {
            $table->dropColumn(['daily_requests', 'last_reset_at']);
        });
    }
};
