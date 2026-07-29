<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('portfolio_id')->constrained()->cascadeOnDelete();
            $table->string('symbol');
            $table->decimal('buy_price', 12, 2);
            $table->decimal('quantity', 12, 4);
            $table->decimal('sell_price', 12, 2)->nullable();
            $table->decimal('resistance_1', 12, 2)->nullable();
            $table->decimal('resistance_2', 12, 2)->nullable();
            $table->decimal('resistance_3', 12, 2)->nullable();
            $table->decimal('support_1', 12, 2)->nullable();
            $table->decimal('support_2', 12, 2)->nullable();
            $table->decimal('support_3', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_items');
    }
};