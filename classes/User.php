<?php
require_once 'Database.php';
require_once 'ActivityLogger.php';

/**
 * User class for authentication and user management
 */
class User {
    private $db;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new ActivityLogger();
    }
    
    /**
     * Create a new user
     */
    public function create($userData) {
        try {
            // Validate required fields
            $required = ['username', 'email', 'password', 'first_name', 'last_name'];
            foreach ($required as $field) {
                if (empty($userData[$field])) {
                    throw new Exception("Field $field is required");
                }
            }
            
            // Check if username or email already exists
            if ($this->usernameExists($userData['username'])) {
                throw new Exception("Username already exists");
            }
            
            if ($this->emailExists($userData['email'])) {
                throw new Exception("Email already exists");
            }
            
            // Hash password
            $passwordHash = password_hash($userData['password'], PASSWORD_DEFAULT);
            
            $query = "INSERT INTO users (username, email, password_hash, role, first_name, last_name) 
                     VALUES (?, ?, ?, ?, ?, ?)";
            
            $params = [
                $userData['username'],
                $userData['email'],
                $passwordHash,
                $userData['role'] ?? 'user',
                $userData['first_name'],
                $userData['last_name']
            ];
            
            $this->db->execute($query, $params);
            $userId = $this->db->lastInsertId();
            
            // Log activity
            $this->logger->log($userId, null, null, 'create', 'users', null, $userData);
            
            return $userId;
            
        } catch (Exception $e) {
            throw new Exception("User creation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Authenticate user login
     */
    public function login($username, $password, $ipAddress = null, $userAgent = null) {
        try {
            $query = "SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1";
            $user = $this->db->fetchOne($query, [$username, $username]);
            
            if (!$user || !password_verify($password, $user['password_hash'])) {
                throw new Exception("Invalid credentials");
            }
            
            // Update last login
            $this->updateLastLogin($user['user_id']);
            
            // Create session
            $sessionId = $this->createSession($user['user_id'], $ipAddress, $userAgent);
            
            // Log activity
            $this->logger->log($user['user_id'], null, null, 'login', 'users', null, null, $ipAddress, $userAgent);
            
            return [
                'user' => $user,
                'session_id' => $sessionId
            ];
            
        } catch (Exception $e) {
            throw new Exception("Login failed: " . $e->getMessage());
        }
    }
    
    /**
     * Logout user
     */
    public function logout($sessionId, $userId = null) {
        try {
            $query = "DELETE FROM user_sessions WHERE session_id = ?";
            $this->db->execute($query, [$sessionId]);
            
            if ($userId) {
                $this->logger->log($userId, null, null, 'logout', 'users');
            }
            
            return true;
        } catch (Exception $e) {
            throw new Exception("Logout failed: " . $e->getMessage());
        }
    }
    
    /**
     * Validate session
     */
    public function validateSession($sessionId) {
        try {
            $query = "SELECT u.*, s.expires_at 
                     FROM users u 
                     JOIN user_sessions s ON u.user_id = s.user_id 
                     WHERE s.session_id = ? AND s.expires_at > NOW() AND u.is_active = 1";
            
            $result = $this->db->fetchOne($query, [$sessionId]);
            
            if (!$result) {
                return false;
            }
            
            // Extend session
            $this->extendSession($sessionId);
            
            return $result;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get user by ID
     */
    public function getById($userId) {
        $query = "SELECT user_id, username, email, role, first_name, last_name, is_active, created_at, last_login 
                 FROM users WHERE user_id = ?";
        return $this->db->fetchOne($query, [$userId]);
    }
    
    /**
     * Update user
     */
    public function update($userId, $userData, $updatedBy) {
        try {
            $allowedFields = ['username', 'email', 'role', 'first_name', 'last_name', 'is_active'];
            $updateFields = [];
            $params = [];
            
            foreach ($userData as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $updateFields[] = "$field = ?";
                    $params[] = $value;
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("No valid fields to update");
            }
            
            $updateFields[] = "updated_by = ?";
            $params[] = $updatedBy;
            $params[] = $userId;
            
            $query = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE user_id = ?";
            
            $this->db->execute($query, $params);
            
            // Log activity
            $this->logger->log($updatedBy, null, null, 'update', 'users', null, $userData);
            
            return true;
        } catch (Exception $e) {
            throw new Exception("User update failed: " . $e->getMessage());
        }
    }
    
    /**
     * Change password
     */
    public function changePassword($userId, $currentPassword, $newPassword) {
        try {
            $user = $this->getById($userId);
            if (!$user) {
                throw new Exception("User not found");
            }
            
            $query = "SELECT password_hash FROM users WHERE user_id = ?";
            $result = $this->db->fetchOne($query, [$userId]);
            
            if (!password_verify($currentPassword, $result['password_hash'])) {
                throw new Exception("Current password is incorrect");
            }
            
            $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $query = "UPDATE users SET password_hash = ? WHERE user_id = ?";
            $this->db->execute($query, [$newPasswordHash, $userId]);
            
            // Log activity
            $this->logger->log($userId, null, null, 'update', 'users', null, ['password_changed' => true]);
            
            return true;
        } catch (Exception $e) {
            throw new Exception("Password change failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get all users with pagination
     */
    public function getAll($page = 1, $limit = 25, $search = '') {
        try {
            $offset = ($page - 1) * $limit;
            
            $whereClause = "";
            $params = [];
            
            if (!empty($search)) {
                $whereClause = "WHERE username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?";
                $searchTerm = "%$search%";
                $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
            }
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM users $whereClause";
            $totalResult = $this->db->fetchOne($countQuery, $params);
            $total = $totalResult['total'];
            
            // Get users
            $query = "SELECT user_id, username, email, role, first_name, last_name, is_active, created_at, last_login 
                     FROM users $whereClause 
                     ORDER BY created_at DESC 
                     LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $users = $this->db->fetchAll($query, $params);
            
            return [
                'users' => $users,
                'total' => $total,
                'page' => $page,
                'pages' => ceil($total / $limit)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve users: " . $e->getMessage());
        }
    }
    
    /**
     * Check if username exists
     */
    private function usernameExists($username) {
        $query = "SELECT COUNT(*) as count FROM users WHERE username = ?";
        $result = $this->db->fetchOne($query, [$username]);
        return $result['count'] > 0;
    }
    
    /**
     * Check if email exists
     */
    private function emailExists($email) {
        $query = "SELECT COUNT(*) as count FROM users WHERE email = ?";
        $result = $this->db->fetchOne($query, [$email]);
        return $result['count'] > 0;
    }
    
    /**
     * Update last login timestamp
     */
    private function updateLastLogin($userId) {
        $query = "UPDATE users SET last_login = NOW() WHERE user_id = ?";
        $this->db->execute($query, [$userId]);
    }
    
    /**
     * Create user session
     */
    private function createSession($userId, $ipAddress = null, $userAgent = null) {
        $sessionId = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 1 hour
        
        $query = "INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent, expires_at) 
                 VALUES (?, ?, ?, ?, ?)";
        
        $this->db->execute($query, [$sessionId, $userId, $ipAddress, $userAgent, $expiresAt]);
        
        return $sessionId;
    }
    
    /**
     * Extend session expiration
     */
    private function extendSession($sessionId) {
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // Extend by 1 hour
        $query = "UPDATE user_sessions SET expires_at = ? WHERE session_id = ?";
        $this->db->execute($query, [$expiresAt, $sessionId]);
    }
}
?>