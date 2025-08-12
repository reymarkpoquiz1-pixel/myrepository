<?php
require_once 'Database.php';
require_once 'ActivityLogger.php';

/**
 * Attachment class for handling file uploads and attachment management
 */
class Attachment {
    private $db;
    private $logger;
    private $uploadPath;
    private $allowedTypes;
    private $maxFileSize;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new ActivityLogger();
        $this->uploadPath = '../uploads/';
        $this->allowedTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'];
        $this->maxFileSize = 104857600; // 100MB
        
        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }
    
    /**
     * Upload and attach file to a record
     */
    public function upload($recordId, $fileData, $uploadedBy, $description = '') {
        try {
            $this->db->beginTransaction();
            
            // Validate file
            $this->validateFile($fileData);
            
            // Generate unique filename
            $originalName = $fileData['name'];
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $storedName = uniqid() . '_' . time() . '.' . $extension;
            $filePath = $this->uploadPath . $storedName;
            
            // Move uploaded file
            if (!move_uploaded_file($fileData['tmp_name'], $filePath)) {
                throw new Exception("Failed to upload file");
            }
            
            // Insert attachment record
            $query = "INSERT INTO attachments (record_id, original_filename, stored_filename, file_path, 
                                             file_type, file_size, mime_type, description, uploaded_by) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $params = [
                $recordId,
                $originalName,
                $storedName,
                $filePath,
                $extension,
                $fileData['size'],
                $fileData['type'],
                $description,
                $uploadedBy
            ];
            
            $this->db->execute($query, $params);
            $attachmentId = $this->db->lastInsertId();
            
            $this->db->commit();
            
            // Log activity
            $this->logger->log($uploadedBy, $recordId, $attachmentId, 'create', 'attachments', null, [
                'filename' => $originalName,
                'size' => $fileData['size']
            ]);
            
            return $this->getById($attachmentId);
            
        } catch (Exception $e) {
            $this->db->rollback();
            // Clean up file if database operation failed
            if (isset($filePath) && file_exists($filePath)) {
                unlink($filePath);
            }
            throw new Exception("File upload failed: " . $e->getMessage());
        }
    }
    
    /**
     * Upload multiple files at once
     */
    public function uploadMultiple($recordId, $filesData, $uploadedBy, $descriptions = []) {
        try {
            $uploadedFiles = [];
            $errors = [];
            
            for ($i = 0; $i < count($filesData['name']); $i++) {
                $fileData = [
                    'name' => $filesData['name'][$i],
                    'type' => $filesData['type'][$i],
                    'tmp_name' => $filesData['tmp_name'][$i],
                    'error' => $filesData['error'][$i],
                    'size' => $filesData['size'][$i]
                ];
                
                $description = isset($descriptions[$i]) ? $descriptions[$i] : '';
                
                try {
                    $attachment = $this->upload($recordId, $fileData, $uploadedBy, $description);
                    $uploadedFiles[] = $attachment;
                } catch (Exception $e) {
                    $errors[] = "Failed to upload {$fileData['name']}: " . $e->getMessage();
                }
            }
            
            return [
                'uploaded' => $uploadedFiles,
                'errors' => $errors
            ];
            
        } catch (Exception $e) {
            throw new Exception("Multiple file upload failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get attachment by ID
     */
    public function getById($attachmentId) {
        try {
            $query = "SELECT a.*, r.unique_identifier, u.username as uploaded_by_username 
                     FROM attachments a 
                     LEFT JOIN records r ON a.record_id = r.record_id 
                     LEFT JOIN users u ON a.uploaded_by = u.user_id 
                     WHERE a.attachment_id = ?";
            
            $attachment = $this->db->fetchOne($query, [$attachmentId]);
            
            if (!$attachment) {
                throw new Exception("Attachment not found");
            }
            
            return $attachment;
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve attachment: " . $e->getMessage());
        }
    }
    
    /**
     * Get all attachments for a record
     */
    public function getByRecordId($recordId) {
        try {
            $query = "SELECT a.*, u.username as uploaded_by_username 
                     FROM attachments a 
                     LEFT JOIN users u ON a.uploaded_by = u.user_id 
                     WHERE a.record_id = ? 
                     ORDER BY a.uploaded_at DESC";
            
            $attachments = $this->db->fetchAll($query, [$recordId]);
            
            // Add file existence check and file size formatting
            foreach ($attachments as &$attachment) {
                $attachment['file_exists'] = file_exists($attachment['file_path']);
                $attachment['file_size_formatted'] = $this->formatFileSize($attachment['file_size']);
            }
            
            return $attachments;
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve attachments: " . $e->getMessage());
        }
    }
    
    /**
     * Update attachment description
     */
    public function updateDescription($attachmentId, $description, $updatedBy) {
        try {
            $oldAttachment = $this->getById($attachmentId);
            
            $query = "UPDATE attachments SET description = ? WHERE attachment_id = ?";
            $this->db->execute($query, [$description, $attachmentId]);
            
            // Log activity
            $this->logger->log($updatedBy, $oldAttachment['record_id'], $attachmentId, 'update', 'attachments', 
                             ['description' => $oldAttachment['description']], 
                             ['description' => $description]);
            
            return $this->getById($attachmentId);
            
        } catch (Exception $e) {
            throw new Exception("Failed to update attachment: " . $e->getMessage());
        }
    }
    
    /**
     * Delete attachment
     */
    public function delete($attachmentId, $deletedBy) {
        try {
            $this->db->beginTransaction();
            
            $attachment = $this->getById($attachmentId);
            
            // Delete file from filesystem
            if (file_exists($attachment['file_path'])) {
                unlink($attachment['file_path']);
            }
            
            // Delete database record
            $query = "DELETE FROM attachments WHERE attachment_id = ?";
            $this->db->execute($query, [$attachmentId]);
            
            $this->db->commit();
            
            // Log activity
            $this->logger->log($deletedBy, $attachment['record_id'], $attachmentId, 'delete', 'attachments', $attachment, null);
            
            return true;
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw new Exception("Failed to delete attachment: " . $e->getMessage());
        }
    }
    
    /**
     * Download attachment
     */
    public function download($attachmentId, $userId) {
        try {
            $attachment = $this->getById($attachmentId);
            
            if (!file_exists($attachment['file_path'])) {
                throw new Exception("File not found on server");
            }
            
            // Log download activity
            $this->logger->log($userId, $attachment['record_id'], $attachmentId, 'download', 'attachments');
            
            // Set headers for file download
            header('Content-Type: ' . $attachment['mime_type']);
            header('Content-Disposition: attachment; filename="' . $attachment['original_filename'] . '"');
            header('Content-Length: ' . filesize($attachment['file_path']));
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            
            // Output file
            readfile($attachment['file_path']);
            exit;
            
        } catch (Exception $e) {
            throw new Exception("Download failed: " . $e->getMessage());
        }
    }
    
    /**
     * View attachment (inline display)
     */
    public function view($attachmentId, $userId) {
        try {
            $attachment = $this->getById($attachmentId);
            
            if (!file_exists($attachment['file_path'])) {
                throw new Exception("File not found on server");
            }
            
            // Log view activity
            $this->logger->log($userId, $attachment['record_id'], $attachmentId, 'read', 'attachments');
            
            // Set headers for inline viewing
            header('Content-Type: ' . $attachment['mime_type']);
            header('Content-Disposition: inline; filename="' . $attachment['original_filename'] . '"');
            header('Content-Length: ' . filesize($attachment['file_path']));
            
            // Output file
            readfile($attachment['file_path']);
            exit;
            
        } catch (Exception $e) {
            throw new Exception("View failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get attachment statistics
     */
    public function getStatistics() {
        try {
            // Total attachments
            $totalQuery = "SELECT COUNT(*) as count FROM attachments";
            $total = $this->db->fetchOne($totalQuery)['count'];
            
            // Total storage size
            $sizeQuery = "SELECT SUM(file_size) as total_size FROM attachments";
            $totalSize = $this->db->fetchOne($sizeQuery)['total_size'] ?? 0;
            
            // Attachments by file type
            $typeQuery = "SELECT file_type, COUNT(*) as count, SUM(file_size) as size 
                         FROM attachments 
                         GROUP BY file_type 
                         ORDER BY count DESC";
            $typeBreakdown = $this->db->fetchAll($typeQuery);
            
            // Recent uploads (last 30 days)
            $recentQuery = "SELECT COUNT(*) as count FROM attachments 
                           WHERE uploaded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
            $recentCount = $this->db->fetchOne($recentQuery)['count'];
            
            // Most active uploaders
            $uploaderQuery = "SELECT u.username, u.first_name, u.last_name, COUNT(*) as upload_count 
                             FROM attachments a 
                             JOIN users u ON a.uploaded_by = u.user_id 
                             GROUP BY a.uploaded_by 
                             ORDER BY upload_count DESC 
                             LIMIT 10";
            $topUploaders = $this->db->fetchAll($uploaderQuery);
            
            return [
                'total_attachments' => $total,
                'total_size' => $totalSize,
                'total_size_formatted' => $this->formatFileSize($totalSize),
                'type_breakdown' => $typeBreakdown,
                'recent_count' => $recentCount,
                'top_uploaders' => $topUploaders
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to retrieve attachment statistics: " . $e->getMessage());
        }
    }
    
    /**
     * Search attachments
     */
    public function search($filters = [], $page = 1, $limit = 25) {
        try {
            $offset = ($page - 1) * $limit;
            $whereConditions = [];
            $params = [];
            
            if (!empty($filters['record_id'])) {
                $whereConditions[] = "a.record_id = ?";
                $params[] = $filters['record_id'];
            }
            
            if (!empty($filters['filename'])) {
                $whereConditions[] = "a.original_filename LIKE ?";
                $params[] = "%{$filters['filename']}%";
            }
            
            if (!empty($filters['file_type'])) {
                $whereConditions[] = "a.file_type = ?";
                $params[] = $filters['file_type'];
            }
            
            if (!empty($filters['uploaded_from'])) {
                $whereConditions[] = "a.uploaded_at >= ?";
                $params[] = $filters['uploaded_from'];
            }
            
            if (!empty($filters['uploaded_to'])) {
                $whereConditions[] = "a.uploaded_at <= ?";
                $params[] = $filters['uploaded_to'];
            }
            
            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM attachments a $whereClause";
            $totalResult = $this->db->fetchOne($countQuery, $params);
            $total = $totalResult['total'];
            
            // Get attachments
            $query = "SELECT a.*, r.unique_identifier, r.first_name, r.last_name, 
                            u.username as uploaded_by_username
                     FROM attachments a 
                     LEFT JOIN records r ON a.record_id = r.record_id 
                     LEFT JOIN users u ON a.uploaded_by = u.user_id 
                     $whereClause 
                     ORDER BY a.uploaded_at DESC 
                     LIMIT ? OFFSET ?";
            
            $params[] = $limit;
            $params[] = $offset;
            
            $attachments = $this->db->fetchAll($query, $params);
            
            // Format file sizes
            foreach ($attachments as &$attachment) {
                $attachment['file_size_formatted'] = $this->formatFileSize($attachment['file_size']);
                $attachment['file_exists'] = file_exists($attachment['file_path']);
            }
            
            return [
                'attachments' => $attachments,
                'total' => $total,
                'page' => $page,
                'pages' => ceil($total / $limit)
            ];
            
        } catch (Exception $e) {
            throw new Exception("Attachment search failed: " . $e->getMessage());
        }
    }
    
    /**
     * Validate uploaded file
     */
    private function validateFile($fileData) {
        // Check for upload errors
        if ($fileData['error'] !== UPLOAD_ERR_OK) {
            switch ($fileData['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    throw new Exception("File is too large");
                case UPLOAD_ERR_PARTIAL:
                    throw new Exception("File was only partially uploaded");
                case UPLOAD_ERR_NO_FILE:
                    throw new Exception("No file was uploaded");
                default:
                    throw new Exception("File upload error");
            }
        }
        
        // Check file size
        if ($fileData['size'] > $this->maxFileSize) {
            throw new Exception("File size exceeds maximum allowed size of " . $this->formatFileSize($this->maxFileSize));
        }
        
        // Check file type
        $extension = strtolower(pathinfo($fileData['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->allowedTypes)) {
            throw new Exception("File type not allowed. Allowed types: " . implode(', ', $this->allowedTypes));
        }
        
        // Additional security checks
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($fileData['tmp_name']);
        
        // Basic MIME type validation (you can expand this)
        $allowedMimes = [
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg', 'image/png', 'image/gif', 'text/plain'
        ];
        
        if (!in_array($mimeType, $allowedMimes)) {
            throw new Exception("Invalid file format detected");
        }
        
        return true;
    }
    
    /**
     * Format file size in human readable format
     */
    private function formatFileSize($bytes) {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }
    
    /**
     * Clean up orphaned files
     */
    public function cleanupOrphanedFiles() {
        try {
            $cleanedCount = 0;
            
            if (is_dir($this->uploadPath)) {
                $files = scandir($this->uploadPath);
                
                foreach ($files as $file) {
                    if ($file === '.' || $file === '..') continue;
                    
                    $filePath = $this->uploadPath . $file;
                    
                    // Check if file exists in database
                    $query = "SELECT COUNT(*) as count FROM attachments WHERE stored_filename = ?";
                    $result = $this->db->fetchOne($query, [$file]);
                    
                    if ($result['count'] == 0) {
                        unlink($filePath);
                        $cleanedCount++;
                    }
                }
            }
            
            return $cleanedCount;
            
        } catch (Exception $e) {
            throw new Exception("Cleanup failed: " . $e->getMessage());
        }
    }
}
?>