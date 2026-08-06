<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_notifications', function (Blueprint $table) {
            $table->string('symbol')->nullable()->after('portfolio_item_id');
        });
    }

    public function down(): void
    {
        Schema::table('sms_notifications', function (Blueprint $table) {
            $table->dropColumn('symbol');
        });
    }
};
