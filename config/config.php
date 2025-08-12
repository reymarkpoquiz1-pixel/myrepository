<?php
declare(strict_types=1);

// Simple .env loader
function load_env(string $rootPath): array {
    $envPath = $rootPath . '/.env';
    $config = [];
    if (is_file($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) continue;
            $pos = strpos($line, '=');
            if ($pos === false) continue;
            $key = trim(substr($line, 0, $pos));
            $val = trim(substr($line, $pos + 1));
            $config[$key] = $val;
        }
    }
    return $config;
}

$ROOT = dirname(__DIR__);
$ENV = load_env($ROOT);

function env(string $key, ?string $default = null): string {
    global $ENV;
    $val = $ENV[$key] ?? getenv($key);
    if ($val === false || $val === null) {
        return $default ?? '';
    }
    return (string)$val;
}

function app_env(string $key, ?string $default = null): string {
    return env($key, $default);
}

function app_key(): string {
    $key = env('APP_KEY', '');
    if (str_starts_with($key, 'base64:')) {
        return base64_decode(substr($key, 7));
    }
    return $key;
}

function app_is_dev(): bool {
    return strtolower(env('APP_ENV', 'production')) !== 'production';
}

// Session setup
$sessionName = env('SESSION_NAME', 'CRSID');
if (session_status() === PHP_SESSION_NONE) {
    session_name($sessionName);
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'cookie_samesite' => 'Lax',
    ]);
}

function json_response($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        json_response(['error' => 'Method Not Allowed'], 405);
    }
}

function require_auth(): void {
    if (!isset($_SESSION['user'])) {
        json_response(['error' => 'Unauthorized'], 401);
    }
}

function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

function require_role(array $roles): void {
    $user = current_user();
    if (!$user || !in_array($user['role'], $roles, true)) {
        json_response(['error' => 'Forbidden'], 403);
    }
}