<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/Record.php';

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$record = new Record();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                handleGetRecord($record, $_GET['id']);
            } elseif (isset($_GET['unique_id'])) {
                handleGetRecordByUniqueId($record, $_GET['unique_id']);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'statistics') {
                handleGetStatistics($record);
            } elseif (isset($_GET['action']) && $_GET['action'] === 'export') {
                handleExport($record, $_GET);
            } else {
                handleSearchRecords($record, $_GET);
            }
            break;
            
        case 'POST':
            handleCreateRecord($record, $input);
            break;
            
        case 'PUT':
            if (isset($_GET['id'])) {
                handleUpdateRecord($record, $_GET['id'], $input);
            } else {
                throw new Exception('Record ID is required for update');
            }
            break;
            
        case 'DELETE':
            if (isset($_GET['id'])) {
                handleDeleteRecord($record, $_GET['id']);
            } else {
                throw new Exception('Record ID is required for deletion');
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

function handleGetRecord($record, $recordId) {
    $recordData = $record->getById($recordId, $_SESSION['user_id']);
    
    echo json_encode([
        'success' => true,
        'record' => $recordData
    ]);
}

function handleGetRecordByUniqueId($record, $uniqueId) {
    $recordData = $record->getByUniqueId($uniqueId, $_SESSION['user_id']);
    
    echo json_encode([
        'success' => true,
        'record' => $recordData
    ]);
}

function handleSearchRecords($record, $params) {
    $filters = [];
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 25;
    $sortBy = $params['sort_by'] ?? 'created_at';
    $sortOrder = $params['sort_order'] ?? 'DESC';
    
    // Build filters from query parameters
    if (!empty($params['search'])) {
        $filters['search'] = $params['search'];
    }
    if (!empty($params['first_name'])) {
        $filters['first_name'] = $params['first_name'];
    }
    if (!empty($params['last_name'])) {
        $filters['last_name'] = $params['last_name'];
    }
    if (!empty($params['unique_identifier'])) {
        $filters['unique_identifier'] = $params['unique_identifier'];
    }
    if (!empty($params['civil_status'])) {
        $filters['civil_status'] = $params['civil_status'];
    }
    if (!empty($params['gender'])) {
        $filters['gender'] = $params['gender'];
    }
    if (!empty($params['date_of_birth_from'])) {
        $filters['date_of_birth_from'] = $params['date_of_birth_from'];
    }
    if (!empty($params['date_of_birth_to'])) {
        $filters['date_of_birth_to'] = $params['date_of_birth_to'];
    }
    if (!empty($params['created_from'])) {
        $filters['created_from'] = $params['created_from'];
    }
    if (!empty($params['created_to'])) {
        $filters['created_to'] = $params['created_to'];
    }
    if (!empty($params['record_status'])) {
        $filters['record_status'] = $params['record_status'];
    }
    
    $results = $record->search($filters, $page, $limit, $sortBy, $sortOrder);
    
    echo json_encode([
        'success' => true,
        'data' => $results
    ]);
}

function handleCreateRecord($record, $input) {
    if (empty($input)) {
        throw new Exception('No data provided');
    }
    
    $recordData = $record->create($input, $_SESSION['user_id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Record created successfully',
        'record' => $recordData
    ]);
}

function handleUpdateRecord($record, $recordId, $input) {
    if (empty($input)) {
        throw new Exception('No data provided');
    }
    
    $recordData = $record->update($recordId, $input, $_SESSION['user_id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Record updated successfully',
        'record' => $recordData
    ]);
}

function handleDeleteRecord($record, $recordId) {
    // Check if user has permission to delete
    if ($_SESSION['role'] !== 'admin') {
        throw new Exception('Access denied. Admin privileges required.');
    }
    
    $record->delete($recordId, $_SESSION['user_id']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Record deleted successfully'
    ]);
}

function handleGetStatistics($record) {
    $stats = $record->getStatistics();
    
    echo json_encode([
        'success' => true,
        'statistics' => $stats
    ]);
}

function handleExport($record, $params) {
    // Build filters
    $filters = [];
    if (!empty($params['search'])) $filters['search'] = $params['search'];
    if (!empty($params['first_name'])) $filters['first_name'] = $params['first_name'];
    if (!empty($params['last_name'])) $filters['last_name'] = $params['last_name'];
    if (!empty($params['unique_identifier'])) $filters['unique_identifier'] = $params['unique_identifier'];
    if (!empty($params['civil_status'])) $filters['civil_status'] = $params['civil_status'];
    if (!empty($params['gender'])) $filters['gender'] = $params['gender'];
    if (!empty($params['date_of_birth_from'])) $filters['date_of_birth_from'] = $params['date_of_birth_from'];
    if (!empty($params['date_of_birth_to'])) $filters['date_of_birth_to'] = $params['date_of_birth_to'];
    if (!empty($params['created_from'])) $filters['created_from'] = $params['created_from'];
    if (!empty($params['created_to'])) $filters['created_to'] = $params['created_to'];
    if (!empty($params['record_status'])) $filters['record_status'] = $params['record_status'];
    
    $csvData = $record->exportToCsv($filters);
    
    // Set headers for CSV download
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="records_export_' . date('Y-m-d_H-i-s') . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    foreach ($csvData as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    exit;
}
?>