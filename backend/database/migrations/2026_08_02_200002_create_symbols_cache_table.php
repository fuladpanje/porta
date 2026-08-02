<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('symbols_cache', function (Blueprint $table) {
            $table->id();
            $table->string('isin', 50)->unique();
            $table->string('symbol', 255);
            $table->string('full_name', 500);
            $table->decimal('last_price', 12, 2)->nullable();
            $table->decimal('pe', 12, 2)->nullable();
            $table->decimal('price_change_percent', 8, 2)->nullable();
            $table->decimal('price_change', 12, 2)->nullable();
            $table->string('sector', 255)->nullable();
            $table->timestamp('last_updated_at')->nullable();
            $table->timestamps();

            $table->index('symbol');
            $table->index('full_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('symbols_cache');
    }
};
