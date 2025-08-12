<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/utils.php';

require_auth();

$fmt = strtolower(str_from_get('format', 'csv') ?? 'csv');
$type = str_from_get('type');
$df = str_from_get('date_from');
$dt = str_from_get('date_to');

$where = ['deleted_at IS NULL'];
$params = [];
if ($type) { $where[] = 'record_type = :t'; $params[':t'] = $type; }
if ($df) { $where[] = 'date_of_event >= :df'; $params[':df'] = $df; }
if ($dt) { $where[] = 'date_of_event <= :dt'; $params[':dt'] = $dt; }
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$sql = "SELECT r.id, r.record_type, r.primary_name, r.registry_no, r.date_of_event, r.date_registered,
        (SELECT COUNT(*) FROM attachments a WHERE a.record_id = r.id) AS attachment_count
        FROM records r $whereSql ORDER BY r.id DESC";
$stmt = db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

audit('export_report', 'report', null, ['format' => $fmt, 'count' => count($rows)]);

if ($fmt === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="records_report.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['ID','Type','Name','Registry No','Date','Date Registered','Attachments']);
    foreach ($rows as $r) {
        fputcsv($out, [$r['id'], $r['record_type'], $r['primary_name'], $r['registry_no'], $r['date_of_event'], $r['date_registered'], $r['attachment_count']]);
    }
    fclose($out);
    exit;
}

if ($fmt === 'pdf') {
    require_once __DIR__ . '/../vendor/fpdf/fpdf.php';
    $pdf = new FPDF('L', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 10, 'Records Report', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 10);

    $headers = ['ID','Type','Name','Registry No','Date','Date Registered','Attachments'];
    $widths = [20, 25, 100, 40, 30, 35, 25];

    foreach ($headers as $i => $h) {
        $pdf->Cell($widths[$i], 8, $h, 1, 0, 'C');
    }
    $pdf->Ln();

    foreach ($rows as $r) {
        $pdf->Cell($widths[0], 8, (string)$r['id'], 1);
        $pdf->Cell($widths[1], 8, $r['record_type'], 1);
        $pdf->Cell($widths[2], 8, mb_strimwidth($r['primary_name'], 0, 48, '...'), 1);
        $pdf->Cell($widths[3], 8, (string)($r['registry_no'] ?? ''), 1);
        $pdf->Cell($widths[4], 8, (string)($r['date_of_event'] ?? ''), 1);
        $pdf->Cell($widths[5], 8, (string)($r['date_registered'] ?? ''), 1);
        $pdf->Cell($widths[6], 8, (string)$r['attachment_count'], 1);
        $pdf->Ln();
    }

    $pdf->Output('D', 'records_report.pdf');
    exit;
}

json_response(['error' => 'Unsupported format'], 422);