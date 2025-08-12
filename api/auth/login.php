<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/db.php';
require_method('POST');
require_csrf();
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim((string)($input['username'] ?? ''));
$password = (string)($input['password'] ?? '');
if ($username === '' || $password === '') {
    json_response(['error' => 'Username and password required'], 422);
}
if (!login($username, $password)) {
    json_response(['error' => 'Invalid credentials'], 401);
}
json_response(['ok' => true]);