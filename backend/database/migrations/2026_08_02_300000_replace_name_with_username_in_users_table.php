<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->after('id');
        });

        // Copy existing name values to username for existing users
        DB::table('users')->whereNull('username')->update(['username' => DB::raw('name')]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->after('id');
        });

        DB::table('users')->whereNull('name')->update(['name' => DB::raw('username')]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
