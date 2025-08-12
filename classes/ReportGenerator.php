<?php
require_once 'Database.php';
require_once 'Record.php';
require_once 'Attachment.php';
require_once 'ActivityLogger.php';

/**
 * Report Generator class for creating various reports and analytics
 */
class ReportGenerator {
    private $db;
    private $record;
    private $attachment;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->record = new Record();
        $this->attachment = new Attachment();
        $this->logger = new ActivityLogger();
    }
    
    /**
     * Generate comprehensive system report
     */
    public function generateSystemReport($format = 'pdf', $filters = []) {
        try {
            $reportData = [
                'generated_at' => date('Y-m-d H:i:s'),
                'generated_by' => $_SESSION['user_id'] ?? 'System',
                'filters' => $filters,
                'statistics' => $this->getSystemStatistics(),
                'records' => $this->getRecordsData($filters),
                'attachments' => $this->getAttachmentsData($filters),
                'activity_summary' => $this->getActivitySummary($filters)
            ];
            
            if ($format === 'pdf') {
                return $this->generatePdfReport($reportData);
            } else {
                return $this->generateCsvReport($reportData);
            }
            
        } catch (Exception $e) {
            throw new Exception("Report generation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get comprehensive system statistics
     */
    private function getSystemStatistics() {
        try {
            $stats = [];
            
            // Record statistics
            $recordStats = $this->record->getStatistics();
            $stats['records'] = $recordStats;
            
            // Attachment statistics
            $attachmentStats = $this->attachment->getStatistics();
            $stats['attachments'] = $attachmentStats;
            
            // Activity statistics
            $activityStats = $this->logger->getActivitySummary();
            $stats['activity'] = $activityStats;
            
            // Growth statistics (monthly)
            $stats['growth'] = $this->getGrowthStatistics();
            
            return $stats;
            
        } catch (Exception $e) {
            throw new Exception("Failed to generate statistics: " . $e->getMessage());
        }
    }
    
    /**
     * Get growth statistics over time
     */
    private function getGrowthStatistics() {
        try {
            // Monthly record creation for last 12 months
            $monthlyRecords = $this->db->fetchAll("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as count
                FROM records 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ");
            
            // Monthly attachment uploads for last 12 months
            $monthlyAttachments = $this->db->fetchAll("
                SELECT 
                    DATE_FORMAT(uploaded_at, '%Y-%m') as month,
                    COUNT(*) as count,
                    SUM(file_size) as total_size
                FROM attachments 
                WHERE uploaded_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(uploaded_at, '%Y-%m')
                ORDER BY month ASC
            ");
            
            // User activity for last 12 months
            $monthlyActivity = $this->db->fetchAll("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(*) as count
                FROM activity_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month ASC
            ");
            
            return [
                'monthly_records' => $monthlyRecords,
                'monthly_attachments' => $monthlyAttachments,
                'monthly_activity' => $monthlyActivity
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to generate growth statistics: " . $e->getMessage());
        }
    }
    
    /**
     * Get records data for reporting
     */
    private function getRecordsData($filters = []) {
        try {
            // Apply date filters if provided
            if (!empty($filters['date_from']) || !empty($filters['date_to'])) {
                $filters['created_from'] = $filters['date_from'] ?? null;
                $filters['created_to'] = $filters['date_to'] ?? null;
            }
            
            $results = $this->record->search($filters, 1, 10000); // Get up to 10,000 records
            
            return [
                'total_count' => $results['total'],
                'records' => $results['records']
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get records data: " . $e->getMessage());
        }
    }
    
    /**
     * Get attachments data for reporting
     */
    private function getAttachmentsData($filters = []) {
        try {
            $attachmentFilters = [];
            
            if (!empty($filters['date_from'])) {
                $attachmentFilters['uploaded_from'] = $filters['date_from'];
            }
            if (!empty($filters['date_to'])) {
                $attachmentFilters['uploaded_to'] = $filters['date_to'];
            }
            
            $results = $this->attachment->search($attachmentFilters, 1, 10000);
            
            return [
                'total_count' => $results['total'],
                'attachments' => $results['attachments']
            ];
            
        } catch (Exception $e) {
            throw new Exception("Failed to get attachments data: " . $e->getMessage());
        }
    }
    
    /**
     * Get activity summary for reporting
     */
    private function getActivitySummary($filters = []) {
        try {
            $dateFrom = $filters['date_from'] ?? null;
            $dateTo = $filters['date_to'] ?? null;
            
            return $this->logger->getActivitySummary($dateFrom, $dateTo);
            
        } catch (Exception $e) {
            throw new Exception("Failed to get activity summary: " . $e->getMessage());
        }
    }
    
    /**
     * Generate CSV report
     */
    private function generateCsvReport($reportData) {
        try {
            $csvData = [];
            
            // Report header
            $csvData[] = ['Archive System Report'];
            $csvData[] = ['Generated on: ' . $reportData['generated_at']];
            $csvData[] = [''];
            
            // System Statistics
            $csvData[] = ['SYSTEM STATISTICS'];
            $csvData[] = ['Category', 'Metric', 'Value'];
            
            // Record statistics
            $recordStats = $reportData['statistics']['records'];
            $csvData[] = ['Records', 'Total Active', $recordStats['total_active']];
            $csvData[] = ['Records', 'Recent (30 days)', $recordStats['recent_count']];
            $csvData[] = ['Records', 'With Attachments', $recordStats['with_attachments']];
            
            // Attachment statistics
            $attachmentStats = $reportData['statistics']['attachments'];
            $csvData[] = ['Attachments', 'Total Files', $attachmentStats['total_attachments']];
            $csvData[] = ['Attachments', 'Storage Used', $attachmentStats['total_size_formatted']];
            $csvData[] = ['Attachments', 'Recent Uploads (30 days)', $attachmentStats['recent_count']];
            
            $csvData[] = [''];
            
            // Records breakdown by status
            $csvData[] = ['RECORDS BY STATUS'];
            $csvData[] = ['Status', 'Count'];
            foreach ($recordStats['status_breakdown'] as $status) {
                $csvData[] = [ucfirst($status['record_status']), $status['count']];
            }
            
            $csvData[] = [''];
            
            // Records breakdown by civil status
            $csvData[] = ['RECORDS BY CIVIL STATUS'];
            $csvData[] = ['Civil Status', 'Count'];
            foreach ($recordStats['civil_status_breakdown'] as $status) {
                $csvData[] = [ucfirst($status['civil_status'] ?? 'Not specified'), $status['count']];
            }
            
            $csvData[] = [''];
            
            // File types breakdown
            $csvData[] = ['ATTACHMENTS BY FILE TYPE'];
            $csvData[] = ['File Type', 'Count', 'Total Size (MB)'];
            foreach ($attachmentStats['type_breakdown'] as $type) {
                $sizeInMB = round($type['size'] / 1048576, 2);
                $csvData[] = [strtoupper($type['file_type']), $type['count'], $sizeInMB];
            }
            
            $csvData[] = [''];
            
            // Activity summary
            $csvData[] = ['USER ACTIVITY SUMMARY'];
            $csvData[] = ['Action Type', 'Count'];
            foreach ($reportData['statistics']['activity']['action_counts'] as $action) {
                $csvData[] = [ucfirst($action['action_type']), $action['count']];
            }
            
            $csvData[] = [''];
            
            // Most active users
            $csvData[] = ['MOST ACTIVE USERS'];
            $csvData[] = ['User', 'Activity Count'];
            foreach ($reportData['statistics']['activity']['active_users'] as $user) {
                $userName = $user['first_name'] . ' ' . $user['last_name'] . ' (' . $user['username'] . ')';
                $csvData[] = [$userName, $user['activity_count']];
            }
            
            // If detailed records are requested
            if (!empty($reportData['records']['records'])) {
                $csvData[] = [''];
                $csvData[] = ['DETAILED RECORDS'];
                $csvData[] = [
                    'Record ID', 'First Name', 'Last Name', 'Date of Birth', 'Civil Status',
                    'Gender', 'Phone', 'Email', 'City', 'Country', 'Status', 'Created At', 'Attachments'
                ];
                
                foreach ($reportData['records']['records'] as $record) {
                    $csvData[] = [
                        $record['unique_identifier'],
                        $record['first_name'],
                        $record['last_name'],
                        $record['date_of_birth'],
                        $record['civil_status'],
                        $record['gender'],
                        $record['phone_number'],
                        $record['email_address'],
                        $record['city'],
                        $record['country'],
                        $record['record_status'],
                        $record['created_at'],
                        $record['attachment_count']
                    ];
                }
            }
            
            return $csvData;
            
        } catch (Exception $e) {
            throw new Exception("CSV generation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Generate PDF report (simplified HTML version)
     */
    private function generatePdfReport($reportData) {
        try {
            $html = $this->generateReportHtml($reportData);
            
            // For a complete implementation, you would use a library like TCPDF or mPDF
            // For now, we'll return the HTML that can be converted to PDF by the browser
            return [
                'format' => 'html',
                'content' => $html,
                'filename' => 'archive_report_' . date('Y-m-d_H-i-s') . '.html'
            ];
            
        } catch (Exception $e) {
            throw new Exception("PDF generation failed: " . $e->getMessage());
        }
    }
    
    /**
     * Generate HTML report content
     */
    private function generateReportHtml($reportData) {
        $recordStats = $reportData['statistics']['records'];
        $attachmentStats = $reportData['statistics']['attachments'];
        $activityStats = $reportData['statistics']['activity'];
        
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Archive System Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
                .section { margin-bottom: 30px; }
                .section h2 { color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .stat-card { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                .stat-label { color: #64748b; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                th { background: #f8fafc; font-weight: bold; }
                .chart-placeholder { background: #f8fafc; height: 200px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; }
                @media print {
                    .section { page-break-inside: avoid; }
                    .stats-grid { display: block; }
                    .stat-card { display: inline-block; width: 45%; margin: 10px; vertical-align: top; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Archive Management System Report</h1>
                <p>Generated on: ' . $reportData['generated_at'] . '</p>
            </div>
            
            <div class="section">
                <h2>System Overview</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">' . $recordStats['total_active'] . '</div>
                        <div class="stat-label">Active Records</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">' . $attachmentStats['total_attachments'] . '</div>
                        <div class="stat-label">Total Attachments</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">' . $attachmentStats['total_size_formatted'] . '</div>
                        <div class="stat-label">Storage Used</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">' . $recordStats['recent_count'] . '</div>
                        <div class="stat-label">Recent Records (30 days)</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>Records Breakdown</h2>
                <table>
                    <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                    </tr>';
        
        $totalRecords = array_sum(array_column($recordStats['status_breakdown'], 'count'));
        foreach ($recordStats['status_breakdown'] as $status) {
            $percentage = $totalRecords > 0 ? round(($status['count'] / $totalRecords) * 100, 1) : 0;
            $html .= '<tr>
                        <td>' . ucfirst($status['record_status']) . '</td>
                        <td>' . $status['count'] . '</td>
                        <td>' . $percentage . '%</td>
                      </tr>';
        }
        
        $html .= '</table>
            </div>
            
            <div class="section">
                <h2>Attachments by File Type</h2>
                <table>
                    <tr>
                        <th>File Type</th>
                        <th>Count</th>
                        <th>Total Size</th>
                    </tr>';
        
        foreach ($attachmentStats['type_breakdown'] as $type) {
            $sizeFormatted = $this->formatFileSize($type['size']);
            $html .= '<tr>
                        <td>' . strtoupper($type['file_type']) . '</td>
                        <td>' . $type['count'] . '</td>
                        <td>' . $sizeFormatted . '</td>
                      </tr>';
        }
        
        $html .= '</table>
            </div>
            
            <div class="section">
                <h2>User Activity Summary</h2>
                <table>
                    <tr>
                        <th>Action Type</th>
                        <th>Count</th>
                    </tr>';
        
        foreach ($activityStats['action_counts'] as $action) {
            $html .= '<tr>
                        <td>' . ucfirst($action['action_type']) . '</td>
                        <td>' . $action['count'] . '</td>
                      </tr>';
        }
        
        $html .= '</table>
            </div>
            
            <div class="section">
                <h2>Most Active Users</h2>
                <table>
                    <tr>
                        <th>User</th>
                        <th>Activity Count</th>
                    </tr>';
        
        foreach ($activityStats['active_users'] as $user) {
            $userName = $user['first_name'] . ' ' . $user['last_name'] . ' (' . $user['username'] . ')';
            $html .= '<tr>
                        <td>' . $userName . '</td>
                        <td>' . $user['activity_count'] . '</td>
                      </tr>';
        }
        
        $html .= '</table>
            </div>
        </body>
        </html>';
        
        return $html;
    }
    
    /**
     * Generate daily summary report
     */
    public function generateDailySummary($date = null) {
        try {
            $date = $date ?? date('Y-m-d');
            $nextDate = date('Y-m-d', strtotime($date . ' +1 day'));
            
            $summary = [];
            
            // Records created today
            $recordsToday = $this->db->fetchOne("
                SELECT COUNT(*) as count 
                FROM records 
                WHERE DATE(created_at) = ?
            ", [$date]);
            
            // Attachments uploaded today
            $attachmentsToday = $this->db->fetchOne("
                SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as total_size 
                FROM attachments 
                WHERE DATE(uploaded_at) = ?
            ", [$date]);
            
            // User activity today
            $activityToday = $this->db->fetchAll("
                SELECT action_type, COUNT(*) as count 
                FROM activity_logs 
                WHERE DATE(created_at) = ?
                GROUP BY action_type 
                ORDER BY count DESC
            ", [$date]);
            
            // Most active users today
            $activeUsersToday = $this->db->fetchAll("
                SELECT u.username, u.first_name, u.last_name, COUNT(*) as activity_count 
                FROM activity_logs al 
                JOIN users u ON al.user_id = u.user_id 
                WHERE DATE(al.created_at) = ?
                GROUP BY al.user_id 
                ORDER BY activity_count DESC 
                LIMIT 5
            ", [$date]);
            
            return [
                'date' => $date,
                'records_created' => $recordsToday['count'],
                'attachments_uploaded' => $attachmentsToday['count'],
                'storage_added' => $this->formatFileSize($attachmentsToday['total_size']),
                'activity_breakdown' => $activityToday,
                'active_users' => $activeUsersToday
            ];
            
        } catch (Exception $e) {
            throw new Exception("Daily summary generation failed: " . $e->getMessage());
        }
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
}
?>