<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_item_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('portfolio_item_id')->constrained('portfolio_items')->cascadeOnDelete();
            $table->foreignId('portfolio_id')->constrained('portfolios')->cascadeOnDelete();
            $table->enum('type', ['buy', 'sell'])->default('buy');
            $table->decimal('quantity', 12, 4);
            $table->decimal('price', 12, 2);
            $table->decimal('resulting_quantity', 12, 4)->nullable();
            $table->decimal('resulting_avg_price', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['portfolio_item_id', 'created_at']);
            $table->index('portfolio_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_item_transactions');
    }
};
