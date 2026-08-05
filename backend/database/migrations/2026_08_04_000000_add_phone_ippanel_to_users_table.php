<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->text('ippanel_api_key')->nullable()->after('is_admin');
            $table->string('ippanel_sender', 20)->nullable()->after('ippanel_api_key');
            $table->boolean('sms_enabled')->default(false)->after('ippanel_sender');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'ippanel_api_key', 'ippanel_sender', 'sms_enabled']);
        });
    }
};
