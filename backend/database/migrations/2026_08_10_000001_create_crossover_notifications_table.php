<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crossover_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('symbol', 20)->index();
            $table->string('level_type', 20);
            $table->decimal('level_value', 12, 2);
            $table->decimal('price_at_trigger', 12, 2);
            $table->decimal('old_price', 12, 2)->nullable();
            $table->string('direction', 10);
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->index(['user_id', 'detected_at']);
            $table->index(['user_id', 'symbol']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crossover_notifications');
    }
};
