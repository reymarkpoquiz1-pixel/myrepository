<?php
/**
 * Database Configuration
 */
class DatabaseConfig {
    private const HOST = 'localhost';
    private const DB_NAME = 'archiving_system';
    private const USERNAME = 'root';
    private const PASSWORD = '';
    private const CHARSET = 'utf8mb4';
    
    // Encryption key for sensitive data (change this in production)
    public const ENCRYPTION_KEY = 'your-secret-encryption-key-here-change-in-production';
    
    public static function getConnection() {
        try {
            $dsn = "mysql:host=" . self::HOST . ";dbname=" . self::DB_NAME . ";charset=" . self::CHARSET;
            $pdo = new PDO($dsn, self::USERNAME, self::PASSWORD, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public static function createDatabase() {
        try {
            $dsn = "mysql:host=" . self::HOST . ";charset=" . self::CHARSET;
            $pdo = new PDO($dsn, self::USERNAME, self::PASSWORD);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS " . self::DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            return true;
        } catch (PDOException $e) {
            throw new Exception("Database creation failed: " . $e->getMessage());
        }
    }
}
?>