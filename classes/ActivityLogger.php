<?php
require_once 'Database.php';

/**
 * Activity Logger class for tracking user actions and system activities
 */
class ActivityLogger {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Log user activity
     */
    public function log($userId, $recordId = null, $attachmentId = null, $actionType, $tableName = null, 
                       $oldValues = null, $newValues = null, $ipAddress = null, $userAgent = null) {
        try {
            $query = "INSERT INTO activity_logs (user_id, record_id, attachment_id, action_type, table_name, 
                                               old_values, new_values, ip_address, user_agent) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $userId,
                $recordId,
                $attachmentId,
                $actionType,
                $tableName,
                $oldValues ? json_encode($oldValues) : null,
                $newValues ? json_encode($newValues) : null,
                $ipAddress,
                $userAgent
            ];
            
            $this->db->execute($query, $params);
            
            return $this->db->lastInsertId();
            
        } catch (Exception $e) {
            // Log errors but don't throw exceptions to avoid breaking main functionality
            error_log("Activity logging failed: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get activity logs with filtering and pagination
     */
    public function getLogs($filters = [], $page = 1, $limit = 50) {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];
            
            // Build WHERE clause based on filters
            if (!empty($filters['user_id'])) {
                $whereConditions[] = "al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['record_id'])) {
                $whereConditions[] = "al.record_id = ?";
                $params[] = $filters['record_id'];
            }
            
            if (!empty($filters['action_type'])) {
                $whereConditions[] = "al.action_type = ?";
                $params[] = $filters['action_type'];
            }
            
            if (!empty($filters['table_name'])) {
                $whereConditions[] = "al.table_name = ?";
                $params[] = $filters['table_name'];
            }
            
            if (!empty($filters['date_from'])) {
                $whereConditions[] = "al.created_at >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $whereConditions[] = "al.created_at <= ?";
                $params[] = $filters['date_to'];
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM activity_logs al $whereClause";
            $totalResult = $this->db->fetchOne($countQuery, $params);
            $total = $totalResult['total'];
            
            // Get logs with user information
            $query = "SELECT al.*, u.username, u.first_name, u.last_name, 
                            r.unique_identifier, r.first_name as record_first_name, r.last_name as record_last_name
                     FROM activity_logs al 
                     LEFT JOIN users u ON al.user_id = u.user_id 
                     LEFT JOIN records r ON al.record_id = r.record_id 
                     $whereClause 
                     ORDER BY al.created_at DESC 
                     LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $logs = $this->db->fetchAll($query, $params);
            
            // Decode JSON values
            foreach ($logs as &$log) {
                $log['old_values'] = $log['old_values'] ? json_decode($log['old_values'], true) : null;
                $log['new_values'] = $log['new_values'] ? json_decode($log['new_values'], true) : null;
            }
            
            return [
                'logs' => $logs,
                'total' => $total,
                'page' => $page,
                'pages' => ceil($total / $limit)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve activity logs: " . $e->getMessage());
        }
    }
    
    /**
     * Get activity summary statistics
     */
    public function getActivitySummary($dateFrom = null, $dateTo = null) {
        try {
            $whereClause = "";
            $params = [];
            
            if ($dateFrom && $dateTo) {
                $whereClause = "WHERE created_at BETWEEN ? AND ?";
                $params = [$dateFrom, $dateTo];
            }
            
            // Get activity counts by action type
            $query = "SELECT action_type, COUNT(*) as count 
                     FROM activity_logs $whereClause 
                     GROUP BY action_type 
                     ORDER BY count DESC";
            
            $actionCounts = $this->db->fetchAll($query, $params);
            
            // Get most active users
            $query = "SELECT u.username, u.first_name, u.last_name, COUNT(*) as activity_count 
                     FROM activity_logs al 
                     JOIN users u ON al.user_id = u.user_id 
                     $whereClause 
                     GROUP BY al.user_id 
                     ORDER BY activity_count DESC 
                     LIMIT 10";
            
            $activeUsers = $this->db->fetchAll($query, $params);
            
            // Get daily activity for the last 30 days
            $query = "SELECT DATE(created_at) as date, COUNT(*) as count 
                     FROM activity_logs 
                     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
                     GROUP BY DATE(created_at) 
                     ORDER BY date DESC";
            
            $dailyActivity = $this->db->fetchAll($query);
            
            return [
                'action_counts' => $actionCounts,
                'active_users' => $activeUsers,
                'daily_activity' => $dailyActivity
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve activity summary: " . $e->getMessage());
        }
    }
    
    /**
     * Clean old logs (for maintenance)
     */
    public function cleanOldLogs($daysToKeep = 90) {
        try {
            $query = "DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)";
            $stmt = $this->db->execute($query, [$daysToKeep]);
            
            return $stmt->rowCount();
            
        } catch (Exception $e) {
            throw new Exception("Failed to clean old logs: " . $e->getMessage());
        }
    }
    
    /**
     * Export activity logs to CSV
     */
    public function exportToCsv($filters = []) {
        try {
            $logs = $this->getLogs($filters, 1, 10000); // Get up to 10,000 records
            
            $csvData = [];
            $csvData[] = [
                'Date/Time', 'User', 'Action', 'Table', 'Record ID', 'IP Address', 'Details'
            ];
            
            foreach ($logs['logs'] as $log) {
                $details = '';
                if ($log['new_values']) {
                    $details = 'New: ' . json_encode($log['new_values']);
                }
                if ($log['old_values']) {
                    $details .= ($details ? ' | ' : '') . 'Old: ' . json_encode($log['old_values']);
                }
                
                $csvData[] = [
                    $log['created_at'],
                    $log['username'] . ' (' . $log['first_name'] . ' ' . $log['last_name'] . ')',
                    $log['action_type'],
                    $log['table_name'],
                    $log['record_id'] ? $log['unique_identifier'] : '',
                    $log['ip_address'],
                    $details
                ];
            }
            
            return $csvData;
            
        } catch (Exception $e) {
            throw new Exception("Failed to export activity logs: " . $e->getMessage());
        }
    }
}
?>