<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/ReportGenerator.php';

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$reportGenerator = new ReportGenerator();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'system-report':
                        handleSystemReport($reportGenerator, $_GET);
                        break;
                    case 'daily-summary':
                        handleDailySummary($reportGenerator, $_GET);
                        break;
                    case 'export-csv':
                        handleExportCsv($reportGenerator, $_GET);
                        break;
                    case 'export-html':
                        handleExportHtml($reportGenerator, $_GET);
                        break;
                    default:
                        throw new Exception('Invalid action');
                }
            } else {
                throw new Exception('No action specified');
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (isset($input['action'])) {
                switch ($input['action']) {
                    case 'generate-report':
                        handleGenerateReport($reportGenerator, $input);
                        break;
                    default:
                        throw new Exception('Invalid action');
                }
            } else {
                throw new Exception('No action specified');
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleSystemReport($reportGenerator, $params) {
    try {
        $filters = [];
        
        if (!empty($params['date_from'])) {
            $filters['date_from'] = $params['date_from'];
        }
        if (!empty($params['date_to'])) {
            $filters['date_to'] = $params['date_to'];
        }
        if (!empty($params['status'])) {
            $filters['record_status'] = $params['status'];
        }
        if (!empty($params['include_records'])) {
            $filters['include_records'] = true;
        }
        
        $format = $params['format'] ?? 'json';
        
        if ($format === 'json') {
            $report = $reportGenerator->generateSystemReport('csv', $filters);
            
            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'report' => $report
            ]);
        } else {
            // For file downloads, handle in respective export functions
            if ($format === 'csv') {
                handleExportCsv($reportGenerator, $params);
            } else {
                handleExportHtml($reportGenerator, $params);
            }
        }
        
    } catch (Exception $e) {
        throw new Exception("System report generation failed: " . $e->getMessage());
    }
}

function handleDailySummary($reportGenerator, $params) {
    try {
        $date = $params['date'] ?? null;
        $summary = $reportGenerator->generateDailySummary($date);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'summary' => $summary
        ]);
        
    } catch (Exception $e) {
        throw new Exception("Daily summary generation failed: " . $e->getMessage());
    }
}

function handleExportCsv($reportGenerator, $params) {
    try {
        $filters = buildFilters($params);
        $csvData = $reportGenerator->generateSystemReport('csv', $filters);
        
        // Set headers for CSV download
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="archive_report_' . date('Y-m-d_H-i-s') . '.csv"');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        $output = fopen('php://output', 'w');
        
        foreach ($csvData as $row) {
            fputcsv($output, $row);
        }
        
        fclose($output);
        exit;
        
    } catch (Exception $e) {
        throw new Exception("CSV export failed: " . $e->getMessage());
    }
}

function handleExportHtml($reportGenerator, $params) {
    try {
        $filters = buildFilters($params);
        $report = $reportGenerator->generateSystemReport('pdf', $filters);
        
        // Set headers for HTML download
        header('Content-Type: text/html');
        header('Content-Disposition: attachment; filename="' . $report['filename'] . '"');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        
        echo $report['content'];
        exit;
        
    } catch (Exception $e) {
        throw new Exception("HTML export failed: " . $e->getMessage());
    }
}

function handleGenerateReport($reportGenerator, $input) {
    try {
        $filters = $input['filters'] ?? [];
        $format = $input['format'] ?? 'json';
        
        $report = $reportGenerator->generateSystemReport($format, $filters);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'message' => 'Report generated successfully',
            'report' => $report
        ]);
        
    } catch (Exception $e) {
        throw new Exception("Report generation failed: " . $e->getMessage());
    }
}

function buildFilters($params) {
    $filters = [];
    
    if (!empty($params['date_from'])) {
        $filters['date_from'] = $params['date_from'];
    }
    if (!empty($params['date_to'])) {
        $filters['date_to'] = $params['date_to'];
    }
    if (!empty($params['status'])) {
        $filters['record_status'] = $params['status'];
    }
    if (!empty($params['civil_status'])) {
        $filters['civil_status'] = $params['civil_status'];
    }
    if (!empty($params['gender'])) {
        $filters['gender'] = $params['gender'];
    }
    if (!empty($params['include_records'])) {
        $filters['include_records'] = true;
    }
    
    return $filters;
}
?>