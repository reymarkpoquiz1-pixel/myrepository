<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/utils.php';
require_once __DIR__ . '/../lib/crypto.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    require_auth();
    $page = int_from_get('page', 1, 1, 100000);
    $perPage = int_from_get('per_page', 10, 1, 100);
    $sortBy = str_from_get('sort_by', 'id');
    $sortDir = strtolower(str_from_get('sort_dir', 'desc') ?? 'desc') === 'asc' ? 'asc' : 'desc';

    $allowedSort = ['id','record_type','primary_name','registry_no','date_of_event'];
    if (!in_array($sortBy, $allowedSort, true)) $sortBy = 'id';

    $type = str_from_get('type');
    $q = str_from_get('q');
    $df = str_from_get('date_from');
    $dt = str_from_get('date_to');

    $where = ['deleted_at IS NULL'];
    $params = [];
    if ($type) { $where[] = 'record_type = :t'; $params[':t'] = $type; }
    if ($q) { $where[] = '(primary_name LIKE :q OR registry_no LIKE :q)'; $params[':q'] = "%$q%"; }
    if ($df) { $where[] = 'date_of_event >= :df'; $params[':df'] = $df; }
    if ($dt) { $where[] = 'date_of_event <= :dt'; $params[':dt'] = $dt; }

    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $count = db()->prepare("SELECT COUNT(*) c FROM records $whereSql");
    $count->execute($params);
    $total = (int)$count->fetchColumn();

    $offset = ($page - 1) * $perPage;

    $stmt = db()->prepare("SELECT r.*, (SELECT COUNT(*) FROM attachments a WHERE a.record_id = r.id) AS attachment_count FROM records r $whereSql ORDER BY $sortBy $sortDir LIMIT :lim OFFSET :off");
    foreach ($params as $k=>$v) { $stmt->bindValue($k, $v); }
    $stmt->bindValue(':lim', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();

    json_response([
        'items' => $items,
        'total' => $total,
        'page' => $page,
        'per_page' => $perPage,
        'total_pages' => (int)ceil($total / $perPage),
        'sort_by' => $sortBy,
        'sort_dir' => $sortDir,
    ]);
}

if ($method === 'POST') {
    require_auth();
    require_csrf();
    $data = json_input();

    $recordType = $data['record_type'] ?? '';
    if (!in_array($recordType, ['birth','marriage','death'], true)) {
        json_response(['error' => 'Invalid record_type'], 422);
    }
    $province = trim((string)($data['province'] ?? ''));
    $municipality = trim((string)($data['municipality'] ?? ''));
    $registryNo = trim((string)($data['registry_no'] ?? ''));
    $primaryName = trim((string)($data['primary_name'] ?? ''));
    if ($primaryName === '') json_response(['error' => 'primary_name required'], 422);
    $dateOfEvent = date_or_null($data['date_of_event'] ?? null);
    $dateRegistered = date_or_null($data['date_registered'] ?? null);

    $details = $data['details_json'] ?? [];
    if (!is_array($details)) $details = [];

    $sensitive = $data['sensitive_json'] ?? [];
    if (!is_array($sensitive)) $sensitive = [];

    $enc = null;
    if (!empty($sensitive)) {
        $crypto = new CryptoService();
        $enc = $crypto->encryptString(json_encode($sensitive));
    }

    $stmt = db()->prepare('INSERT INTO records (record_type, registry_no, province, municipality, primary_name, date_of_event, date_registered, details_json, sensitive_json_enc, created_by) VALUES (:rt, :rn, :pr, :mu, :pn, :doe, :dr, :dj, :se, :uid)');
    $stmt->execute([
        ':rt' => $recordType,
        ':rn' => $registryNo ?: null,
        ':pr' => $province ?: null,
        ':mu' => $municipality ?: null,
        ':pn' => $primaryName,
        ':doe' => $dateOfEvent,
        ':dr' => $dateRegistered,
        ':dj' => !empty($details) ? json_encode($details) : null,
        ':se' => $enc,
        ':uid' => current_user()['id'] ?? null,
    ]);
    $id = (int)db()->lastInsertId();
    audit('create_record', 'record', $id, ['record_type' => $recordType]);

    json_response(['id' => $id]);
}

json_response(['error' => 'Method Not Allowed'], 405);