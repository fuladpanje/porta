<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'sms_notifications';

        // The original index also backs the portfolio_item_id foreign key.
        // It must stay in place while the column is changed to nullable;
        // dropping it first makes a fresh MySQL/InnoDB install fail with
        // error 1553 ("needed in a foreign key constraint").
        DB::statement("ALTER TABLE {$tableName} MODIFY portfolio_item_id BIGINT UNSIGNED NULL");
        DB::statement("ALTER TABLE {$tableName} MODIFY sent_at DATETIME NOT NULL");

        $indexes = DB::select("SHOW INDEX FROM {$tableName}");
        $indexNames = array_unique(array_map(fn($i) => $i->Key_name, $indexes));
        if (!in_array('sms_cooldown_index', $indexNames, true)) {
            DB::statement("CREATE INDEX sms_cooldown_index ON {$tableName} (user_id, symbol, level_type, sent_at)");
        }
    }

    public function down(): void
    {
        $tableName = 'sms_notifications';

        $indexes = DB::select("SHOW INDEX FROM {$tableName}");
        $indexNames = array_unique(array_map(fn($i) => $i->Key_name, $indexes));
        if (in_array('sms_cooldown_index', $indexNames, true)) {
            DB::statement("DROP INDEX sms_cooldown_index ON {$tableName}");
        }
        DB::statement("ALTER TABLE {$tableName} MODIFY portfolio_item_id BIGINT UNSIGNED NOT NULL");
        DB::statement("ALTER TABLE {$tableName} MODIFY sent_at TIMESTAMP NOT NULL");
        DB::statement("ALTER TABLE {$tableName} ADD INDEX portfolio_item_id_level_type_sent_at_index (portfolio_item_id, level_type, sent_at)");
    }
};
