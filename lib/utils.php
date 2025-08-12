<?php
declare(strict_types=1);

function int_from_get(string $key, int $default, int $min = 1, int $max = 1000): int {
    $v = isset($_GET[$key]) ? (int)$_GET[$key] : $default;
    $v = max($min, min($v, $max));
    return $v;
}

function str_from_get(string $key, ?string $default = null): ?string {
    if (!isset($_GET[$key])) return $default;
    $v = trim((string)$_GET[$key]);
    return $v === '' ? $default : $v;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function sanitize_filename(string $name): string {
    $name = preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
    return trim($name, '_');
}

function now(): string { return date('Y-m-d H:i:s'); }

function date_or_null(?string $s): ?string {
    if (!$s) return null;
    $t = strtotime($s);
    return $t ? date('Y-m-d', $t) : null;
}