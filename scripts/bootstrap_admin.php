<?php
require_once __DIR__ . '/../lib/db.php';

$options = getopt('', ['username:', 'password:', 'role::']);
$username = $options['username'] ?? null;
$password = $options['password'] ?? null;
$role = $options['role'] ?? 'admin';

if (!$username || !$password) {
    fwrite(STDERR, "Usage: php scripts/bootstrap_admin.php --username <u> --password <p> [--role admin|user]\n");
    exit(1);
}
if (!in_array($role, ['admin','user'], true)) {
    fwrite(STDERR, "Invalid role. Use admin or user.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = db()->prepare('INSERT INTO users (username, password_hash, role) VALUES (:u, :p, :r)');
try {
    $stmt->execute([':u' => $username, ':p' => $hash, ':r' => $role]);
    echo "User created: $username ($role)\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Failed: ' . $e->getMessage() . "\n");
    exit(1);
}