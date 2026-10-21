<?php
/**
 * Studio Gear Manager — Lizenz-Server für den Code-Generator
 *
 * Speichert die vergebenen Pro-Lizenzen zentral auf dem Server, damit der
 * Code-Generator auf mehreren Geräten (Rechner, Handy, Tablet) dieselbe Liste nutzt.
 * Der Server vergibt die Seed-Nummern selbst → zwei Geräte können nie denselben Code erzeugen.
 *
 * EINRICHTUNG: unten ein eigenes Passwort bei $ADMIN_PASSWORD eintragen (mind. 10 Zeichen).
 */

// ── Einstellungen ──────────────────────────────────────────
$ADMIN_PASSWORD = '';                          // ← HIER eigenes Passwort eintragen (mind. 10 Zeichen)
$LICENSE_SECRET = 'SGMP-v1-4e7b2d19-pro';      // muss LICENSE_SECRET in app.js entsprechen
$DONOR_SECRET   = 'SGM-v1-8f3a9c21-donor';     // muss DONOR_SECRET in app.js entsprechen
$KEEP_BACKUPS   = 60;                          // so viele automatische Sicherungen aufheben
$MAX_FAILS      = 8;                           // Fehlversuche pro IP …
$LOCK_MINUTES   = 15;                          // … danach so lange gesperrt
// ───────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
// Erlaubt auch eine lokal geöffnete codegenerator.html (file://) — geschützt durch das Passwort
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-SGM-Auth');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

function out($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail($code, $msg, $extra = []) { out(array_merge(['ok' => false, 'error' => $msg], $extra), $code); }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'method');
if (strlen($ADMIN_PASSWORD) < 10) fail(503, 'not_configured');

// ── Speicherort: PHP-Dateien mit Sperrzeile → auch ohne .htaccess (nginx) nicht abrufbar ──
$DIR = __DIR__ . '/licdata';
$BACKUP_DIR = "$DIR/backups";
$FILE = "$DIR/licenses.json.php";
$GUARD = "<?php http_response_code(404); exit; ?>\n";
foreach ([$DIR, $BACKUP_DIR] as $d) {
  if (!is_dir($d)) @mkdir($d, 0750, true);
  if (!file_exists("$d/.htaccess")) @file_put_contents("$d/.htaccess", "Require all denied\nDeny from all\n");
  if (!file_exists("$d/index.html")) @file_put_contents("$d/index.html", '');
}
if (!is_writable($DIR)) fail(500, 'not_writable');

// ── Brute-Force-Schutz ──
$ipHash = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $LICENSE_SECRET), 0, 16);
$failFile = "$DIR/fails.json.php";
function readGuarded($f, $guard) { if (!file_exists($f)) return null; $raw = @file_get_contents($f); if ($raw === false) return null; if (strpos($raw, $guard) === 0) $raw = substr($raw, strlen($guard)); return json_decode($raw, true); }
function writeGuarded($f, $guard, $data) { return @file_put_contents($f, $guard . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) !== false; }
$fails = readGuarded($failFile, $GUARD) ?: [];
$now = time();
foreach ($fails as $k => $v) if (($v['t'] ?? 0) < $now - $LOCK_MINUTES * 60) unset($fails[$k]);
if (($fails[$ipHash]['n'] ?? 0) >= $MAX_FAILS) fail(429, 'locked', ['minutes' => $LOCK_MINUTES]);

$auth = $_SERVER['HTTP_X_SGM_AUTH'] ?? '';
if (!hash_equals($ADMIN_PASSWORD, (string)$auth)) {
  usleep(400000);
  $fails[$ipHash] = ['n' => ($fails[$ipHash]['n'] ?? 0) + 1, 't' => $now];
  writeGuarded($failFile, $GUARD, $fails);
  fail(401, 'auth', ['remaining' => max(0, $MAX_FAILS - $fails[$ipHash]['n'])]);
}
if (isset($fails[$ipHash])) { unset($fails[$ipHash]); writeGuarded($failFile, $GUARD, $fails); }

// ── Lizenz-Logik (identisch zu app.js / codegenerator.html) ──
function licCode($seed, $secret) {
  $base  = strtoupper(substr(hash('sha256', $secret . 'seed-' . $seed), 0, 8));
  $check = strtoupper(substr(hash('sha256', $secret . $base), 0, 4));
  return 'SGMP-' . substr($base, 0, 4) . '-' . substr($base, 4, 4) . '-' . $check;
}
function licValid($code, $secret) {
  $c = preg_replace('/[^A-Z0-9]/', '', strtoupper($code));
  if (strlen($c) !== 16 || strpos($c, 'SGMP') !== 0) return false;
  return strtoupper(substr(hash('sha256', $secret . substr($c, 4, 8)), 0, 4)) === substr($c, 12, 4);
}
function clean($v, $max) { return trim(mb_substr(strip_tags((string)$v), 0, $max)); }
function cleanDate($v) { $v = (string)$v; return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : date('Y-m-d'); }
function nextSeed($list) { $m = 0; foreach ($list as $l) $m = max($m, (int)($l['seed'] ?? 0)); return $m + 1; }

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) fail(400, 'json');
$action = (string)($data['action'] ?? 'list');

// Datei exklusiv sperren, solange gelesen und geschrieben wird
$lock = fopen("$DIR/.lock", 'c');
flock($lock, LOCK_EX);
$list = readGuarded($FILE, $GUARD);
if (!is_array($list)) $list = [];

function saveList($list) {
  global $FILE, $GUARD, $BACKUP_DIR, $KEEP_BACKUPS;
  if (file_exists($FILE)) {
    @copy($FILE, "$BACKUP_DIR/licenses-" . date('Ymd-His') . '-' . substr(bin2hex(random_bytes(2)), 0, 4) . '.json.php');
    $old = glob("$BACKUP_DIR/licenses-*.json.php") ?: [];
    sort($old);
    while (count($old) > $KEEP_BACKUPS) @unlink(array_shift($old));
  }
  if (!writeGuarded($FILE, $GUARD, array_values($list))) fail(500, 'store');
}
function reply($list, $extra = []) {
  global $LICENSE_SECRET, $DONOR_SECRET;
  out(array_merge([
    'ok' => true,
    'licenses' => array_values($list),
    'nextSeed' => nextSeed($list),
    'licenseSecret' => $LICENSE_SECRET,
    'donorSecret' => $DONOR_SECRET,
    'serverTime' => date('c'),
  ], $extra));
}

switch ($action) {
  case 'list':
    reply($list);

  case 'add':
    $used = [];
    foreach ($list as $l) { $used[(int)($l['seed'] ?? 0)] = true; $usedCodes[$l['code']] = true; }
    $seed = max(1, (int)($data['seed'] ?? 0));
    if (isset($used[$seed])) $seed = nextSeed($list);       // Seed schon vergeben (anderes Gerät) → nächster freier
    $code = licCode($seed, $LICENSE_SECRET);
    while (isset($usedCodes[$code])) { $seed++; $code = licCode($seed, $LICENSE_SECRET); }
    $entry = [
      'firstName' => clean($data['firstName'] ?? '', 80),
      'lastName'  => clean($data['lastName'] ?? '', 80),
      'email'     => clean($data['email'] ?? '', 160),
      'code'      => $code,
      'date'      => cleanDate($data['date'] ?? ''),
      'seed'      => $seed,
      'createdAt' => date('c'),
      'device'    => clean($data['device'] ?? '', 40),
    ];
    $list[] = $entry;
    saveList($list);
    reply($list, ['entry' => $entry, 'seedChanged' => $seed !== (int)($data['seed'] ?? 0)]);

  case 'update':
    $code = strtoupper((string)($data['code'] ?? ''));
    foreach ($list as &$l) {
      if ($l['code'] === $code) {
        foreach (['firstName' => 80, 'lastName' => 80, 'email' => 160] as $f => $max) if (isset($data[$f])) $l[$f] = clean($data[$f], $max);
        if (isset($data['date'])) $l['date'] = cleanDate($data['date']);
        $l['updatedAt'] = date('c');
        unset($l); saveList($list); reply($list);
      }
    }
    unset($l);
    fail(404, 'not_found');

  case 'delete':
    $code = strtoupper((string)($data['code'] ?? ''));
    $before = count($list);
    $list = array_values(array_filter($list, fn($l) => $l['code'] !== $code));
    if (count($list) === $before) fail(404, 'not_found');
    saveList($list);
    reply($list);

  case 'merge':
    $incoming = $data['licenses'] ?? [];
    if (!is_array($incoming)) fail(400, 'licenses');
    $known = [];
    foreach ($list as $l) $known[$l['code']] = true;
    $added = 0; $invalid = 0;
    foreach (array_slice($incoming, 0, 5000) as $in) {
      $code = strtoupper(clean($in['code'] ?? '', 19));
      if (isset($known[$code])) continue;
      if (!licValid($code, $LICENSE_SECRET)) { $invalid++; continue; }
      $seed = (int)($in['seed'] ?? 0);
      if (!$seed || licCode($seed, $LICENSE_SECRET) !== $code) {   // Seed aus dem Code zurückrechnen
        $seed = 0;
        for ($s = 1; $s <= 30000; $s++) if (licCode($s, $LICENSE_SECRET) === $code) { $seed = $s; break; }
      }
      $list[] = [
        'firstName' => clean($in['firstName'] ?? '', 80),
        'lastName'  => clean($in['lastName'] ?? '', 80),
        'email'     => clean($in['email'] ?? '', 160),
        'code'      => $code,
        'date'      => cleanDate($in['date'] ?? ''),
        'seed'      => $seed,
        'createdAt' => clean($in['createdAt'] ?? date('c'), 40),
      ];
      $known[$code] = true; $added++;
    }
    if ($added) saveList($list);
    reply($list, ['added' => $added, 'invalid' => $invalid]);

  case 'clear':
    if (($data['confirm'] ?? '') !== 'ALLE LÖSCHEN') fail(400, 'confirm');
    saveList([]);                                            // vorherige Liste liegt danach in backups/
    reply([]);

  case 'backups':
    $files = glob("$BACKUP_DIR/licenses-*.json.php") ?: [];
    rsort($files);
    out(['ok' => true, 'backups' => array_map(fn($f) => ['name' => basename($f, '.json.php'), 'size' => filesize($f)], array_slice($files, 0, 30))]);

  case 'restore':
    $name = preg_replace('/[^a-z0-9\-]/i', '', (string)($data['name'] ?? ''));
    $restored = readGuarded("$BACKUP_DIR/$name.json.php", $GUARD);
    if (!is_array($restored)) fail(404, 'not_found');
    saveList($restored);
    reply($restored);

  default:
    fail(400, 'action');
}
