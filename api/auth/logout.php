<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/auth.php';
require_method('POST');
require_csrf();
logout();
json_response(['ok' => true]);