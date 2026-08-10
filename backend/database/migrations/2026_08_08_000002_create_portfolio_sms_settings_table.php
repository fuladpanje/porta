<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_sms_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('portfolio_id');
            $table->boolean('enabled')->default(false);
            $table->time('send_time')->default('17:00');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('portfolio_id')->references('id')->on('portfolios')->cascadeOnDelete();
            $table->unique(['user_id', 'portfolio_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_sms_settings');
    }
};
