<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/crypto.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

function uploads_base_dir(): string {
    $dir = dirname(__DIR__) . '/storage/uploads';
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    return realpath($dir) ?: $dir;
}

function allowed_mimes(): array {
    $list = env('ALLOWED_MIME', 'application/pdf');
    return array_values(array_filter(array_map('trim', explode(',', $list))));
}

function max_upload_bytes(): int {
    $mb = (int)env('UPLOAD_MAX_MB', '50');
    return $mb * 1024 * 1024;
}

function handle_attachments_upload(int $recordId): array {
    require_role(['admin', 'user']);
    require_csrf();

    if (!isset($_FILES['files'])) {
        json_response(['error' => 'No files uploaded'], 400);
    }

    $files = $_FILES['files'];
    $count = is_array($files['name']) ? count($files['name']) : 0;
    $results = [];
    $crypto = new CryptoService();

    for ($i = 0; $i < $count; $i++) {
        $name = $files['name'][$i];
        $type = $files['type'][$i];
        $tmp = $files['tmp_name'][$i];
        $err = $files['error'][$i];
        $size = (int)$files['size'][$i];

        if ($err !== UPLOAD_ERR_OK) {
            $results[] = ['name' => $name, 'status' => 'error', 'message' => 'Upload error ' . $err];
            continue;
        }
        if ($size > max_upload_bytes()) {
            $results[] = ['name' => $name, 'status' => 'error', 'message' => 'File too large'];
            continue;
        }
        if (!in_array($type, allowed_mimes(), true)) {
            $results[] = ['name' => $name, 'status' => 'error', 'message' => 'Unsupported MIME type'];
            continue;
        }

        $safeName = sanitize_filename($name);
        $storedName = bin2hex(random_bytes(16)) . '.bin';
        $destPath = uploads_base_dir() . '/' . $storedName;
        $crypto->encryptFile($tmp, $destPath);

        $sha256 = hash_file('sha256', $destPath);

        $stmt = db()->prepare('INSERT INTO attachments (record_id, file_name, stored_name, mime_type, file_size_bytes, sha256, uploaded_by) VALUES (:rid, :fn, :sn, :mt, :sz, :h, :uid)');
        $stmt->execute([
            ':rid' => $recordId,
            ':fn' => $safeName,
            ':sn' => $storedName,
            ':mt' => $type,
            ':sz' => $size,
            ':h' => $sha256,
            ':uid' => current_user()['id'] ?? null,
        ]);
        $attachId = (int)db()->lastInsertId();
        audit('add_attachment', 'attachment', $attachId, ['record_id' => $recordId, 'file_name' => $safeName]);

        $results[] = ['name' => $safeName, 'status' => 'ok', 'id' => $attachId];
    }
    return $results;
}

function stream_attachment_download(int $attachmentId): void {
    require_auth();
    $stmt = db()->prepare('SELECT a.*, r.record_type FROM attachments a JOIN records r ON r.id = a.record_id WHERE a.id = :id');
    $stmt->execute([':id' => $attachmentId]);
    $row = $stmt->fetch();
    if (!$row) {
        http_response_code(404);
        echo 'Not found';
        exit;
    }

    $path = uploads_base_dir() . '/' . $row['stored_name'];
    if (!is_file($path)) {
        http_response_code(404);
        echo 'Not found';
        exit;
    }

    $tmp = tempnam(sys_get_temp_dir(), 'dec_');
    $crypto = new CryptoService();
    $crypto->decryptFile($path, $tmp);

    header('Content-Type: ' . $row['mime_type']);
    header('Content-Disposition: attachment; filename="' . $row['file_name'] . '"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp);
    unlink($tmp);

    audit('download_attachment', 'attachment', $attachmentId, ['record_id' => (int)$row['record_id']]);
    exit;
}

function delete_attachment(int $attachmentId): bool {
    require_role(['admin']);
    require_csrf();

    $stmt = db()->prepare('SELECT * FROM attachments WHERE id = :id');
    $stmt->execute([':id' => $attachmentId]);
    $row = $stmt->fetch();
    if (!$row) return false;

    $path = uploads_base_dir() . '/' . $row['stored_name'];
    if (is_file($path)) @unlink($path);

    $del = db()->prepare('DELETE FROM attachments WHERE id = :id');
    $del->execute([':id' => $attachmentId]);

    audit('delete_attachment', 'attachment', $attachmentId, ['record_id' => (int)$row['record_id']]);
    return true;
}