<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('portfolios', function (Blueprint $table) {
            $table->boolean('commission_enabled')->default(false)->after('name');
            $table->decimal('buy_commission', 5, 2)->default(0.37)->after('commission_enabled');
            $table->decimal('sell_commission', 5, 2)->default(0.88)->after('buy_commission');
        });
    }

    public function down(): void
    {
        Schema::table('portfolios', function (Blueprint $table) {
            $table->dropColumn(['commission_enabled', 'buy_commission', 'sell_commission']);
        });
    }
};
