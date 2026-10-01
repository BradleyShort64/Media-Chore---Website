<?php
/* ==========================================================================
   Contact form mailer
   Receives the enquiry form (script.js, section 14) and emails it to the
   Media Chore inbox. Runs on the mediachore.co.za host, which already
   handles the domain's mail, so PHP's mail() sends from our own server.
   Replies go straight to the visitor via Reply-To.
   ========================================================================== */

const TO_ADDRESS   = 'info@mediachore.co.za';
const FROM_ADDRESS = 'website@mediachore.co.za';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, bool $ok, string $error = ''): void {
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    exit;
}

/* Strip anything that could break out of a single header or line */
function clean_line(string $value, int $max = 200): string {
    $value = preg_replace('/[\r\n\t\x00-\x1F\x7F]+/', ' ', $value);
    return mb_substr(trim($value), 0, $max);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'Method not allowed');
}

/* Honeypot filled in means a bot: report success, send nothing */
if (!empty($_POST['website'])) {
    respond(200, true);
}

$name    = clean_line((string) ($_POST['name'] ?? ''), 120);
$email   = clean_line((string) ($_POST['email'] ?? ''), 200);
$phone   = clean_line((string) ($_POST['phone'] ?? ''), 60);
$company = clean_line((string) ($_POST['company'] ?? ''), 160);
$budget  = clean_line((string) ($_POST['budget'] ?? ''), 80);
$message = mb_substr(trim(str_replace("\0", '', (string) ($_POST['message'] ?? ''))), 0, 5000);

$needs = $_POST['need'] ?? [];
if (!is_array($needs)) $needs = [$needs];
$needs = array_slice(array_filter(array_map(fn($n) => clean_line((string) $n, 80), $needs)), 0, 10);

/* Same rules as the browser-side checks */
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($message) < 8) {
    respond(422, false, 'Please check your name, email and message.');
}

$lines = [
    "New enquiry from the Media Chore website",
    "",
    "Name:     $name",
    "Email:    $email",
    "Phone:    " . ($phone !== '' ? $phone : '-'),
    "Business: " . ($company !== '' ? $company : '-'),
    "Needs:    " . ($needs ? implode(', ', $needs) : '-'),
    "Budget:   " . ($budget !== '' ? $budget : '-'),
    "",
    "Message:",
    $message,
    "",
    "--",
    "Sent " . date('j M Y, H:i') . " from " . ($_SERVER['HTTP_HOST'] ?? 'the website'),
];
$body = implode("\r\n", $lines);

$subject = '=?UTF-8?B?' . base64_encode("Website enquiry: $name") . '?=';
$headers = implode("\r\n", [
    'From: Media Chore Website <' . FROM_ADDRESS . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$sent = mail(TO_ADDRESS, $subject, $body, $headers, '-f' . FROM_ADDRESS);

if (!$sent) {
    respond(500, false, 'The message could not be sent.');
}
respond(200, true);
