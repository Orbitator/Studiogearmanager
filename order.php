<?php
/**
 * Studio Gear Manager — Pro-Bestellung (manuelle Lizenzvergabe)
 * Empfängt Name + E-Mail aus dem Bestellformular der App,
 * speichert die Bestellung in orders/orders.csv (per .htaccess gesperrt)
 * und schickt dir eine Benachrichtigung per E-Mail.
 */

// ── Einstellungen ──────────────────────────────────────────
$NOTIFY_EMAIL = 'holodeckmusicproject@gmail.com';   // Empfänger der Bestell-Benachrichtigung
$PRICE        = '19 €';
$MAX_PER_HOUR = 5;                                   // Bestellungen pro IP und Stunde (Spam-Schutz)
// ───────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function fail($code, $msg) { http_response_code($code); echo json_encode(['ok' => false, 'error' => $msg]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'method');

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) fail(400, 'json');

// Honeypot: Bots füllen das versteckte Feld aus
if (!empty($data['website'])) { echo json_encode(['ok' => true]); exit; }

$name    = trim(mb_substr(strip_tags((string)($data['name'] ?? '')), 0, 120));
$email   = trim(mb_substr((string)($data['email'] ?? ''), 0, 160));
$accept  = !empty($data['accept']);
$lang    = (($data['lang'] ?? 'de') === 'en') ? 'en' : 'de';
$version = preg_replace('/[^0-9.]/', '', (string)($data['version'] ?? ''));

if ($name === '')                                  fail(422, 'name');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    fail(422, 'email');
if (!$accept)                                      fail(422, 'accept');

// Speicherort vorbereiten und gegen Direktzugriff sperren
$dir = __DIR__ . '/orders';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
if (!file_exists("$dir/.htaccess")) @file_put_contents("$dir/.htaccess", "Require all denied\nDeny from all\n");
if (!file_exists("$dir/index.html")) @file_put_contents("$dir/index.html", '');

// Einfaches Rate-Limit pro IP (nur Hash gespeichert, keine Klartext-IP)
$ipHash = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . date('YmdH')), 0, 16);
$rlFile = "$dir/ratelimit.json";
$rl = file_exists($rlFile) ? (json_decode(@file_get_contents($rlFile), true) ?: []) : [];
$hourKey = date('YmdH');
$rl = array_filter($rl, fn($v, $k) => str_starts_with($k, $hourKey), ARRAY_FILTER_USE_BOTH);
$key = "$hourKey-$ipHash";
$rl[$key] = ($rl[$key] ?? 0) + 1;
@file_put_contents($rlFile, json_encode($rl), LOCK_EX);
if ($rl[$key] > $MAX_PER_HOUR) fail(429, 'rate');

// Bestellung speichern
$orderId = date('Ymd-His') . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
$csvFile = "$dir/orders.csv";
$isNew = !file_exists($csvFile);
$fh = @fopen($csvFile, 'a');
if (!$fh) fail(500, 'store');
flock($fh, LOCK_EX);
if ($isNew) fputcsv($fh, ['Bestell-Nr', 'Datum', 'Name', 'E-Mail', 'Preis', 'Sprache', 'App-Version', 'Status']);
fputcsv($fh, [$orderId, date('Y-m-d H:i'), $name, $email, $PRICE, $lang, $version, 'offen']);
flock($fh, LOCK_UN);
fclose($fh);

// Benachrichtigung an dich
$subject = "=?UTF-8?B?" . base64_encode("Neue Pro-Bestellung: $name") . "?=";
$body = "Neue Bestellung Studio Gear Manager Pro\n\n"
      . "Bestell-Nr: $orderId\n"
      . "Name:       $name\n"
      . "E-Mail:     $email\n"
      . "Preis:      $PRICE\n"
      . "Sprache:    $lang\n"
      . "App:        $version\n\n"
      . "Nächste Schritte: Zahlung anfordern → nach Eingang Lizenz im Code-Generator erzeugen und an $email senden.\n";
$host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
$headers = "From: Studio Gear Manager <noreply@$host>\r\n"
         . "Reply-To: $email\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n";
$mailed = @mail($NOTIFY_EMAIL, $subject, $body, $headers);

echo json_encode(['ok' => true, 'orderId' => $orderId, 'mailed' => (bool)$mailed]);
