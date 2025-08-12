<?php
require_once 'Database.php';
require_once 'ActivityLogger.php';

/**
 * Record class for managing record CRUD operations
 */
class Record {
    private $db;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new ActivityLogger();
    }
    
    /**
     * Create a new record
     */
    public function create($recordData, $createdBy) {
        try {
            $this->db->beginTransaction();
            
            // Validate required fields
            $required = ['first_name', 'last_name'];
            foreach ($required as $field) {
                if (empty($recordData[$field])) {
                    throw new Exception("Field $field is required");
                }
            }
            
            // Prepare fields for insertion
            $fields = [
                'first_name', 'last_name', 'middle_name', 'date_of_birth', 'civil_status',
                'gender', 'nationality', 'address_line1', 'address_line2', 'city',
                'state_province', 'postal_code', 'country', 'phone_number', 'email_address',
                'emergency_contact_name', 'emergency_contact_phone', 'notes'
            ];
            
            $insertFields = [];
            $placeholders = [];
            $params = [];
            
            foreach ($fields as $field) {
                if (isset($recordData[$field])) {
                    $insertFields[] = $field;
                    $placeholders[] = '?';
                    
                    // Encrypt sensitive data
                    if (in_array($field, ['phone_number', 'email_address', 'emergency_contact_phone'])) {
                        $params[] = Database::encrypt($recordData[$field]);
                    } else {
                        $params[] = $recordData[$field];
                    }
                }
            }
            
            // Add metadata fields
            $insertFields[] = 'created_by';
            $placeholders[] = '?';
            $params[] = $createdBy;
            
            $query = "INSERT INTO records (" . implode(', ', $insertFields) . ") 
                     VALUES (" . implode(', ', $placeholders) . ")";
            
            $this->db->execute($query, $params);
            $recordId = $this->db->lastInsertId();
            
            // Get the generated unique identifier
            $record = $this->getById($recordId);
            
            $this->db->commit();
            
            // Log activity
            $this->logger->log($createdBy, $recordId, null, 'create', 'records', null, $recordData);
            
            return $record;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception("Record creation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get record by ID
     */
    public function getById($recordId, $userId = null) {
        try {
            $query = "SELECT * FROM records WHERE record_id = ? AND record_status != 'deleted'";
            $record = $this->db->fetchOne($query, [$recordId]);
            
            if (!$record) {
                throw new Exception("Record not found");
            }
            
            // Decrypt sensitive data
            $sensitiveFields = ['phone_number', 'email_address', 'emergency_contact_phone'];
            foreach ($sensitiveFields as $field) {
                if (!empty($record[$field])) {
                    $record[$field] = Database::decrypt($record[$field]);
                }
            }
            
            // Log read activity if user is provided
            if ($userId) {
                $this->logger->log($userId, $recordId, null, 'read', 'records');
            }
            
            return $record;
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve record: " . $e->getMessage());
        }
    }
    
    /**
     * Get record by unique identifier
     */
    public function getByUniqueId($uniqueId, $userId = null) {
        try {
            $query = "SELECT * FROM records WHERE unique_identifier = ? AND record_status != 'deleted'";
            $record = $this->db->fetchOne($query, [$uniqueId]);
            
            if (!$record) {
                throw new Exception("Record not found");
            }
            
            // Decrypt sensitive data
            $sensitiveFields = ['phone_number', 'email_address', 'emergency_contact_phone'];
            foreach ($sensitiveFields as $field) {
                if (!empty($record[$field])) {
                    $record[$field] = Database::decrypt($record[$field]);
                }
            }
            
            // Log read activity if user is provided
            if ($userId) {
                $this->logger->log($userId, $record['record_id'], null, 'read', 'records');
            }
            
            return $record;
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve record: " . $e->getMessage());
        }
    }
    
    /**
     * Update record
     */
    public function update($recordId, $recordData, $updatedBy) {
        try {
            $this->db->beginTransaction();
            
            // Get existing record for logging
            $oldRecord = $this->getById($recordId);
            
            // Prepare fields for update
            $fields = [
                'first_name', 'last_name', 'middle_name', 'date_of_birth', 'civil_status',
                'gender', 'nationality', 'address_line1', 'address_line2', 'city',
                'state_province', 'postal_code', 'country', 'phone_number', 'email_address',
                'emergency_contact_name', 'emergency_contact_phone', 'notes', 'record_status'
            ];
            
            $updateFields = [];
            $params = [];
            
            foreach ($fields as $field) {
                if (isset($recordData[$field])) {
                    $updateFields[] = "$field = ?";
                    
                    // Encrypt sensitive data
                    if (in_array($field, ['phone_number', 'email_address', 'emergency_contact_phone'])) {
                        $params[] = Database::encrypt($recordData[$field]);
                    } else {
                        $params[] = $recordData[$field];
                    }
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("No valid fields to update");
            }
            
            // Add metadata
            $updateFields[] = "updated_by = ?";
            $params[] = $updatedBy;
            $params[] = $recordId;
            
            $query = "UPDATE records SET " . implode(', ', $updateFields) . " WHERE record_id = ?";
            
            $this->db->execute($query, $params);
            
            $this->db->commit();
            
            // Log activity
            $this->logger->log($updatedBy, $recordId, null, 'update', 'records', $oldRecord, $recordData);
            
            return $this->getById($recordId);
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception("Record update failed: " . $e->getMessage());
        }
    }
    
    /**
     * Delete record (soft delete)
     */
    public function delete($recordId, $deletedBy) {
        try {
            $this->db->beginTransaction();
            
            // Get existing record for logging
            $oldRecord = $this->getById($recordId);
            
            $query = "UPDATE records SET record_status = 'deleted', updated_by = ? WHERE record_id = ?";
            $this->db->execute($query, [$deletedBy, $recordId]);
            
            $this->db->commit();
            
            // Log activity
            $this->logger->log($deletedBy, $recordId, null, 'delete', 'records', $oldRecord, null);
            
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception("Record deletion failed: " . $e->getMessage());
        }
    }
    
    /**
     * Search and filter records with pagination
     */
    public function search($filters = [], $page = 1, $limit = 25, $sortBy = 'created_at', $sortOrder = 'DESC') {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = ["record_status != 'deleted'"];
            $params = [];
            
            // Build WHERE clause based on filters
            if (!empty($filters['search'])) {
                $searchTerm = "%{$filters['search']}%";
                $whereConditions[] = "(first_name LIKE ? OR last_name LIKE ? OR middle_name LIKE ? OR unique_identifier LIKE ?)";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if (!empty($filters['first_name'])) {
                $whereConditions[] = "first_name LIKE ?";
                $params[] = "%{$filters['first_name']}%";
            }
            
            if (!empty($filters['last_name'])) {
                $whereConditions[] = "last_name LIKE ?";
                $params[] = "%{$filters['last_name']}%";
            }
            
            if (!empty($filters['unique_identifier'])) {
                $whereConditions[] = "unique_identifier = ?";
                $params[] = $filters['unique_identifier'];
            }
            
            if (!empty($filters['civil_status'])) {
                $whereConditions[] = "civil_status = ?";
                $params[] = $filters['civil_status'];
            }
            
            if (!empty($filters['gender'])) {
                $whereConditions[] = "gender = ?";
                $params[] = $filters['gender'];
            }
            
            if (!empty($filters['date_of_birth_from'])) {
                $whereConditions[] = "date_of_birth >= ?";
                $params[] = $filters['date_of_birth_from'];
            }
            
            if (!empty($filters['date_of_birth_to'])) {
                $whereConditions[] = "date_of_birth <= ?";
                $params[] = $filters['date_of_birth_to'];
            }
            
            if (!empty($filters['created_from'])) {
                $whereConditions[] = "created_at >= ?";
                $params[] = $filters['created_from'];
            }
            
            if (!empty($filters['created_to'])) {
                $whereConditions[] = "created_at <= ?";
                $params[] = $filters['created_to'];
            }
            
            if (!empty($filters['record_status'])) {
                // Override the default status filter if explicitly provided
                $whereConditions = array_filter($whereConditions, function($condition) {
                    return strpos($condition, 'record_status') === false;
                });
                $whereConditions[] = "record_status = ?";
                $params[] = $filters['record_status'];
            }
            
            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            // Validate sort parameters
            $allowedSortFields = [
                'unique_identifier', 'first_name', 'last_name', 'date_of_birth', 
                'created_at', 'updated_at', 'civil_status', 'gender'
            ];
            
            if (!in_array($sortBy, $allowedSortFields)) {
                $sortBy = 'created_at';
            }
            
            if (!in_array(strtoupper($sortOrder), ['ASC', 'DESC'])) {
                $sortOrder = 'DESC';
            }
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM records $whereClause";
            $totalResult = $this->db->fetchOne($countQuery, $params);
            $total = $totalResult['total'];
            
            // Get records
            $query = "SELECT r.*, u.username as created_by_username, 
                            uu.username as updated_by_username,
                            (SELECT COUNT(*) FROM attachments WHERE record_id = r.record_id) as attachment_count
                     FROM records r 
                     LEFT JOIN users u ON r.created_by = u.user_id 
                     LEFT JOIN users uu ON r.updated_by = uu.user_id 
                     $whereClause 
                     ORDER BY $sortBy $sortOrder 
                     LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $records = $this->db->fetchAll($query, $params);
            
            // Decrypt sensitive data for display
            foreach ($records as &$record) {
                $sensitiveFields = ['phone_number', 'email_address', 'emergency_contact_phone'];
                foreach ($sensitiveFields as $field) {
                    if (!empty($record[$field])) {
                        $record[$field] = Database::decrypt($record[$field]);
                    }
                }
            }
            
            return [
                'records' => $records,
                'total' => $total,
                'page' => $page,
                'pages' => ceil($total / $limit),
                'limit' => $limit
            ];
            
        } catch (Exception $e) {
            throw new Exception("Record search failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get records statistics
     */
    public function getStatistics() {
        try {
            // Total records
            $totalQuery = "SELECT COUNT(*) as count FROM records WHERE record_status = 'active'";
            $total = $this->db->fetchOne($totalQuery)['count'];
            
            // Records by status
            $statusQuery = "SELECT record_status, COUNT(*) as count FROM records GROUP BY record_status";
            $statusCounts = $this->db->fetchAll($statusQuery);
            
            // Records by civil status
            $civilQuery = "SELECT civil_status, COUNT(*) as count FROM records WHERE record_status = 'active' GROUP BY civil_status";
            $civilCounts = $this->db->fetchAll($civilQuery);
            
            // Records by gender
            $genderQuery = "SELECT gender, COUNT(*) as count FROM records WHERE record_status = 'active' GROUP BY gender";
            $genderCounts = $this->db->fetchAll($genderQuery);
            
            // Recent records (last 30 days)
            $recentQuery = "SELECT COUNT(*) as count FROM records WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND record_status = 'active'";
            $recentCount = $this->db->fetchOne($recentQuery)['count'];
            
            // Records with attachments
            $attachmentQuery = "SELECT COUNT(DISTINCT r.record_id) as count FROM records r 
                               JOIN attachments a ON r.record_id = a.record_id 
                               WHERE r.record_status = 'active'";
            $withAttachments = $this->db->fetchOne($attachmentQuery)['count'];
            
            return [
                'total_active' => $total,
                'status_breakdown' => $statusCounts,
                'civil_status_breakdown' => $civilCounts,
                'gender_breakdown' => $genderCounts,
                'recent_count' => $recentCount,
                'with_attachments' => $withAttachments
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve statistics: " . $e->getMessage());
        }
    }
    
    /**
     * Export records to CSV
     */
    public function exportToCsv($filters = []) {
        try {
            $results = $this->search($filters, 1, 10000); // Get up to 10,000 records
            
            $csvData = [];
            $csvData[] = [
                'Record ID', 'First Name', 'Last Name', 'Middle Name', 'Date of Birth',
                'Civil Status', 'Gender', 'Nationality', 'Address Line 1', 'Address Line 2',
                'City', 'State/Province', 'Postal Code', 'Country', 'Phone Number',
                'Email Address', 'Emergency Contact Name', 'Emergency Contact Phone',
                'Notes', 'Status', 'Created At', 'Updated At', 'Attachments'
            ];
            
            foreach ($results['records'] as $record) {
                $csvData[] = [
                    $record['unique_identifier'],
                    $record['first_name'],
                    $record['last_name'],
                    $record['middle_name'],
                    $record['date_of_birth'],
                    $record['civil_status'],
                    $record['gender'],
                    $record['nationality'],
                    $record['address_line1'],
                    $record['address_line2'],
                    $record['city'],
                    $record['state_province'],
                    $record['postal_code'],
                    $record['country'],
                    $record['phone_number'],
                    $record['email_address'],
                    $record['emergency_contact_name'],
                    $record['emergency_contact_phone'],
                    $record['notes'],
                    $record['record_status'],
                    $record['created_at'],
                    $record['updated_at'],
                    $record['attachment_count']
                ];
            }
            
            return $csvData;
            
        } catch (Exception $e) {
            throw new Exception("Failed to export records: " . $e->getMessage());
        }
    }
}
?>