<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('symbols_cache', function (Blueprint $table) {
            $table->decimal('buy_i_volume', 16, 2)->nullable()->after('sector');
            $table->decimal('buy_count_i', 12, 2)->nullable()->after('buy_i_volume');
            $table->decimal('sell_i_volume', 16, 2)->nullable()->after('buy_count_i');
            $table->decimal('sell_count_i', 12, 2)->nullable()->after('sell_i_volume');
        });
    }

    public function down(): void
    {
        Schema::table('symbols_cache', function (Blueprint $table) {
            $table->dropColumn(['buy_i_volume', 'buy_count_i', 'sell_i_volume', 'sell_count_i']);
        });
    }
};
