<?php
require_once '../config/database.php';

/**
 * Database connection and utility class
 */
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        $this->connection = DatabaseConfig::getConnection();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Execute a prepared statement with parameters
     */
    public function execute($query, $params = []) {
        try {
            $stmt = $this->connection->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Database error: " . $e->getMessage());
            throw new Exception("Database operation failed");
        }
    }
    
    /**
     * Fetch single row
     */
    public function fetchOne($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetch();
    }
    
    /**
     * Fetch all rows
     */
    public function fetchAll($query, $params = []) {
        $stmt = $this->execute($query, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Get last insert ID
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    /**
     * Begin transaction
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Commit transaction
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback transaction
     */
    public function rollback() {
        return $this->connection->rollback();
    }
    
    /**
     * Check if table exists
     */
    public function tableExists($tableName) {
        $query = "SHOW TABLES LIKE ?";
        $result = $this->fetchOne($query, [$tableName]);
        return !empty($result);
    }
    
    /**
     * Encrypt sensitive data
     */
    public static function encrypt($data) {
        $key = DatabaseConfig::ENCRYPTION_KEY;
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt sensitive data
     */
    public static function decrypt($encryptedData) {
        $key = DatabaseConfig::ENCRYPTION_KEY;
        $data = base64_decode($encryptedData);
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv);
    }
}
?>