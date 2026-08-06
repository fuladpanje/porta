<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_symbol_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('symbol', 20);
            $table->decimal('resistance_1', 12, 2)->nullable();
            $table->decimal('resistance_2', 12, 2)->nullable();
            $table->decimal('support_1', 12, 2)->nullable();
            $table->decimal('support_2', 12, 2)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'symbol']);
            $table->index('symbol');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_symbol_levels');
    }
};
