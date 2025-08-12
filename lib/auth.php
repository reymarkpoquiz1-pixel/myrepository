<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/db.php';

function csrf_token(): string {
    if (!isset($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void {
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf'] ?? '', $header)) {
        json_response(['error' => 'Invalid CSRF token'], 403);
    }
}

function login(string $username, string $password): bool {
    $stmt = db()->prepare('SELECT id, username, password_hash, role FROM users WHERE username = :u LIMIT 1');
    $stmt->execute([':u' => $username]);
    $row = $stmt->fetch();
    if (!$row) return false;
    if (!password_verify($password, $row['password_hash'])) return false;
    $_SESSION['user'] = [
        'id' => (int)$row['id'],
        'username' => $row['username'],
        'role' => $row['role'],
    ];
    audit('login', 'user', (int)$row['id'], ['username' => $row['username']]);
    return true;
}

function logout(): void {
    $user = current_user();
    if ($user) {
        audit('logout', 'user', (int)$user['id'], []);
    }
    session_destroy();
}

function audit(string $action, string $targetType, ?int $targetId, array $meta = []): void {
    try {
        $stmt = db()->prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, meta, ip_address) VALUES (:uid, :a, :tt, :tid, :m, :ip)');
        $stmt->execute([
            ':uid' => current_user()['id'] ?? null,
            ':a' => $action,
            ':tt' => $targetType,
            ':tid' => $targetId,
            ':m' => json_encode($meta),
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        ]);
    } catch (Throwable $e) {
        if (app_is_dev()) error_log('Audit failed: ' . $e->getMessage());
    }
}