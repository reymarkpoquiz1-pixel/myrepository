<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../classes/Attachment.php';

session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$attachment = new Attachment();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'download':
                        if (isset($_GET['id'])) {
                            handleDownload($attachment, $_GET['id']);
                        } else {
                            throw new Exception('Attachment ID is required');
                        }
                        break;
                    case 'view':
                        if (isset($_GET['id'])) {
                            handleView($attachment, $_GET['id']);
                        } else {
                            throw new Exception('Attachment ID is required');
                        }
                        break;
                    case 'statistics':
                        handleGetStatistics($attachment);
                        break;
                    case 'search':
                        handleSearchAttachments($attachment, $_GET);
                        break;
                    default:
                        throw new Exception('Invalid action');
                }
            } elseif (isset($_GET['id'])) {
                handleGetAttachment($attachment, $_GET['id']);
            } elseif (isset($_GET['record_id'])) {
                handleGetByRecordId($attachment, $_GET['record_id']);
            } else {
                handleSearchAttachments($attachment, $_GET);
            }
            break;
            
        case 'POST':
            if (isset($_GET['action']) && $_GET['action'] === 'upload-multiple') {
                handleUploadMultiple($attachment);
            } else {
                handleUpload($attachment);
            }
            break;
            
        case 'PUT':
            if (isset($_GET['id'])) {
                handleUpdateDescription($attachment, $_GET['id']);
            } else {
                throw new Exception('Attachment ID is required');
            }
            break;
            
        case 'DELETE':
            if (isset($_GET['id'])) {
                handleDeleteAttachment($attachment, $_GET['id']);
            } else {
                throw new Exception('Attachment ID is required');
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

function handleUpload($attachment) {
    if (!isset($_FILES['file']) || !isset($_POST['record_id'])) {
        throw new Exception('File and record ID are required');
    }
    
    $recordId = $_POST['record_id'];
    $description = $_POST['description'] ?? '';
    
    $result = $attachment->upload($recordId, $_FILES['file'], $_SESSION['user_id'], $description);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'File uploaded successfully',
        'attachment' => $result
    ]);
}

function handleUploadMultiple($attachment) {
    if (!isset($_FILES['files']) || !isset($_POST['record_id'])) {
        throw new Exception('Files and record ID are required');
    }
    
    $recordId = $_POST['record_id'];
    $descriptions = isset($_POST['descriptions']) ? json_decode($_POST['descriptions'], true) : [];
    
    $result = $attachment->uploadMultiple($recordId, $_FILES['files'], $_SESSION['user_id'], $descriptions);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Files uploaded',
        'results' => $result
    ]);
}

function handleGetAttachment($attachment, $attachmentId) {
    $attachmentData = $attachment->getById($attachmentId);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'attachment' => $attachmentData
    ]);
}

function handleGetByRecordId($attachment, $recordId) {
    $attachments = $attachment->getByRecordId($recordId);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'attachments' => $attachments
    ]);
}

function handleSearchAttachments($attachment, $params) {
    $filters = [];
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 25;
    
    if (!empty($params['record_id'])) {
        $filters['record_id'] = $params['record_id'];
    }
    if (!empty($params['filename'])) {
        $filters['filename'] = $params['filename'];
    }
    if (!empty($params['file_type'])) {
        $filters['file_type'] = $params['file_type'];
    }
    if (!empty($params['uploaded_from'])) {
        $filters['uploaded_from'] = $params['uploaded_from'];
    }
    if (!empty($params['uploaded_to'])) {
        $filters['uploaded_to'] = $params['uploaded_to'];
    }
    
    $results = $attachment->search($filters, $page, $limit);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'data' => $results
    ]);
}

function handleUpdateDescription($attachment, $attachmentId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['description'])) {
        throw new Exception('Description is required');
    }
    
    $result = $attachment->updateDescription($attachmentId, $input['description'], $_SESSION['user_id']);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Description updated successfully',
        'attachment' => $result
    ]);
}

function handleDeleteAttachment($attachment, $attachmentId) {
    // Check if user has permission to delete
    if ($_SESSION['role'] !== 'admin') {
        // Check if user owns the attachment or the record
        $attachmentData = $attachment->getById($attachmentId);
        if ($attachmentData['uploaded_by'] != $_SESSION['user_id']) {
            throw new Exception('Access denied. You can only delete your own attachments.');
        }
    }
    
    $attachment->delete($attachmentId, $_SESSION['user_id']);
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Attachment deleted successfully'
    ]);
}

function handleDownload($attachment, $attachmentId) {
    // This will handle the file download and exit
    $attachment->download($attachmentId, $_SESSION['user_id']);
}

function handleView($attachment, $attachmentId) {
    // This will handle the file viewing and exit
    $attachment->view($attachmentId, $_SESSION['user_id']);
}

function handleGetStatistics($attachment) {
    $stats = $attachment->getStatistics();
    
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'statistics' => $stats
    ]);
}
?>