<?php
try {
    $pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=porta", "root", "");
    $stmt = $pdo->query("DESCRIBE users");
    foreach ($stmt as $row) {
        echo $row[0] . ": " . $row[1] . "\n";
    }
} catch (Exception $e) {
    echo "DB error: " . $e->getMessage();
}
