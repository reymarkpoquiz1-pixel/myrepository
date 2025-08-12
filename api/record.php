<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/utils.php';
require_once __DIR__ . '/../lib/crypto.php';

require_auth();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) json_response(['error' => 'Invalid id'], 422);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->prepare('SELECT * FROM records WHERE id = :id AND deleted_at IS NULL');
    $stmt->execute([':id' => $id]);
    $rec = $stmt->fetch();
    if (!$rec) json_response(['error' => 'Not found'], 404);

    if (!empty($rec['sensitive_json_enc'])) {
        try {
            $crypto = new CryptoService();
            $rec['sensitive_json'] = json_decode($crypto->decryptString($rec['sensitive_json_enc']), true);
        } catch (Throwable $e) { $rec['sensitive_json'] = null; }
    } else {
        $rec['sensitive_json'] = null;
    }
    json_response($rec);
}

if ($method === 'PUT') {
    require_csrf();
    $data = json_input();

    $fields = [];
    $params = [':id' => $id];

    foreach (['record_type','registry_no','province','municipality','primary_name'] as $f) {
        if (array_key_exists($f, $data)) { $fields[] = "$f = :$f"; $params[":$f"] = $data[$f] ?: null; }
    }
    foreach (['date_of_event','date_registered'] as $f) {
        if (array_key_exists($f, $data)) { $fields[] = "$f = :$f"; $params[":$f"] = date_or_null($data[$f] ?? null); }
    }
    if (array_key_exists('details_json', $data)) { $fields[] = 'details_json = :dj'; $params[':dj'] = !empty($data['details_json']) ? json_encode($data['details_json']) : null; }
    if (array_key_exists('sensitive_json', $data)) {
        $enc = null; if (!empty($data['sensitive_json'])) { $crypto = new CryptoService(); $enc = $crypto->encryptString(json_encode($data['sensitive_json'])); }
        $fields[] = 'sensitive_json_enc = :se'; $params[':se'] = $enc;
    }

    if (empty($fields)) json_response(['error' => 'No fields to update'], 422);

    $sql = 'UPDATE records SET ' . implode(', ', $fields) . ' WHERE id = :id AND deleted_at IS NULL';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);

    audit('update_record', 'record', $id, []);
    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    require_role(['admin']);
    require_csrf();
    $stmt = db()->prepare('UPDATE records SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL');
    $stmt->execute([':id' => $id]);
    audit('delete_record', 'record', $id, []);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method Not Allowed'], 405);