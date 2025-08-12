<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/uploads.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_auth();
    if (isset($_GET['download'])) {
        $id = (int)$_GET['download'];
        stream_attachment_download($id);
    }
    $recordId = isset($_GET['record_id']) ? (int)$_GET['record_id'] : 0;
    if ($recordId <= 0) json_response(['error' => 'record_id required'], 422);
    $stmt = db()->prepare('SELECT a.* FROM attachments a JOIN records r ON r.id = a.record_id AND r.deleted_at IS NULL WHERE a.record_id = :rid ORDER BY a.id DESC');
    $stmt->execute([':rid' => $recordId]);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $recordId = isset($_GET['record_id']) ? (int)$_GET['record_id'] : 0;
    if ($recordId <= 0) json_response(['error' => 'record_id required'], 422);
    $results = handle_attachments_upload($recordId);
    json_response($results);
}

if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) json_response(['error' => 'id required'], 422);
    if (!delete_attachment($id)) json_response(['error' => 'Not found'], 404);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method Not Allowed'], 405);