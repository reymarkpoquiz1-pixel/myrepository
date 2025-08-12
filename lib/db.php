<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';

class Database {
    private static ?PDO $pdo = null;

    public static function connection(): PDO {
        if (self::$pdo === null) {
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', '3306');
            $db = env('DB_NAME', 'civil_registry');
            $user = env('DB_USER', 'root');
            $pass = env('DB_PASS', '');
            $charset = env('DB_CHARSET', 'utf8mb4');
            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            self::$pdo = new PDO($dsn, $user, $pass, $options);
        }
        return self::$pdo;
    }
}

function db(): PDO { return Database::connection(); }