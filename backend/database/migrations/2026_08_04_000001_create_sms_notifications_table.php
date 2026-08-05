<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('portfolio_item_id');
            $table->enum('level_type', ['resistance_1', 'resistance_2', 'resistance_3', 'support_1', 'support_2', 'support_3']);
            $table->decimal('price_at_trigger', 12, 2);
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('portfolio_item_id')->references('id')->on('portfolio_items')->cascadeOnDelete();

            $table->index(['portfolio_item_id', 'level_type', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_notifications');
    }
};
