<?php
/**
 * Studio Gear Manager — Besucher-Zähler
 * GET ?uid=UUID&type=free|pro
 * Speichert eindeutige UUIDs getrennt nach Free/Pro
 * Gibt {"unique": N, "free": F, "pro": P} zurück
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$readonly = isset($_GET['readonly']) && $_GET['readonly'] === '1';
$uid      = isset($_GET['uid'])  ? preg_replace('/[^a-f0-9-]/', '', substr($_GET['uid'], 0, 36)) : '';
$type     = isset($_GET['type']) && $_GET['type'] === 'pro' ? 'pro' : 'free';

function loadIds($file) {
  if (!file_exists($file)) return [];
  return array_values(array_filter(
    array_map('trim', file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)),
    fn($line) => preg_match('/^[a-f0-9-]{36}$/', $line)
  ));
}

function saveId($file, $uid) {
  $ids = loadIds($file);
  if ($uid && strlen($uid) === 36 && !in_array($uid, $ids, true)) {
    $ids[] = $uid;
    file_put_contents($file, implode("\n", $ids) . "\n", LOCK_EX);
  }
}

$fileAll  = __DIR__ . '/visitor_ids.txt';
$fileFree = __DIR__ . '/visitor_ids_free.txt';
$filePro  = __DIR__ . '/visitor_ids_pro.txt';

if (!$readonly) {
  saveId($fileAll, $uid);
  if ($type === 'pro') {
    saveId($filePro, $uid);
  } else {
    saveId($fileFree, $uid);
  }
}

echo json_encode([
  'unique' => count(loadIds($fileAll)),
  'free'   => count(loadIds($fileFree)),
  'pro'    => count(loadIds($filePro)),
]);
