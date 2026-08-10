<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_daily_sms_log', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('portfolio_sms_setting_id');
            $table->date('sent_date');
            $table->timestamp('sent_at');
            $table->timestamps();

            $table->foreign('portfolio_sms_setting_id')->references('id')->on('portfolio_sms_settings')->cascadeOnDelete();
            $table->unique(['portfolio_sms_setting_id', 'sent_date'], 'pdsl_setting_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_daily_sms_log');
    }
};
