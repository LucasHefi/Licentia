<?php
declare(strict_types=1);

const DATA_VERSION = '3.28.0';
const API_VERSION = '1.0.0';

$config = require (is_file(__DIR__ . '/config.php') ? __DIR__ . '/config.php' : __DIR__ . '/config.example.php');
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$sessionPath = __DIR__ . '/var/sessions';
if (!is_dir($sessionPath)) mkdir($sessionPath, 0700, true);
session_save_path($sessionPath);
session_name('licentia_session');
session_set_cookie_params(['lifetime' => 2592000, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
session_start();

function db(): PDO {
    global $config;
    static $pdo;
    if ($pdo) return $pdo;
    if (str_starts_with($config['db_dsn'], 'sqlite:')) {
        $dir = dirname(substr($config['db_dsn'], 7));
        if (!is_dir($dir)) mkdir($dir, 0700, true);
    }
    $pdo = new PDO($config['db_dsn'], $config['db_user'] ?? null, $config['db_password'] ?? null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $id = str_starts_with($config['db_dsn'], 'mysql:') ? 'VARCHAR(64)' : 'TEXT';
    $text = str_starts_with($config['db_dsn'], 'mysql:') ? 'LONGTEXT' : 'TEXT';
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (id $id PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, password_hash VARCHAR(255), provider VARCHAR(32) NOT NULL, provider_id VARCHAR(255), created_at VARCHAR(32) NOT NULL)");
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_state (user_id $id PRIMARY KEY, favorites $text NOT NULL, compare_ids $text NOT NULL, guide_answers $text NOT NULL, history $text NOT NULL, updated_at VARCHAR(32) NOT NULL)");
    return $pdo;
}

function route_path(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    foreach (['/api/', '/v1/', '/mcp'] as $needle) {
        $position = strpos($path, $needle);
        if ($position !== false) return ltrim(substr($path, $position), '/');
    }
    return trim($path, '/');
}

function respond(mixed $data, int $status = 200, bool $public = false): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header($public ? 'Cache-Control: public, max-age=300' : 'Cache-Control: no-store');
    if ($public) header('Access-Control-Allow-Origin: *');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body(): array {
    $value = json_decode(file_get_contents('php://input'), true);
    if (!is_array($value)) respond(['error' => 'Tělo požadavku musí být platný JSON.'], 400);
    return $value;
}

function catalog(): array {
    static $data;
    if (!$data) $data = json_decode(file_get_contents(dirname(__DIR__) . '/data/catalog.json'), true, 512, JSON_THROW_ON_ERROR);
    return $data;
}

function summary(string $id, ?string $type = null): ?array {
    foreach (catalog() as $item) if ($item['id'] === $id && (!$type || $item['type'] === $type)) return $item;
    return null;
}

function license_detail(string $id, string $type): array {
    if (!summary($id, $type)) respond(['error' => 'Neznámý SPDX identifikátor.'], 404, true);
    $folder = $type === 'license' ? 'licenses' : 'exceptions';
    return json_decode(file_get_contents(dirname(__DIR__) . "/data/$folder/" . rawurlencode($id) . '.json'), true, 512, JSON_THROW_ON_ERROR);
}

function user(): ?array {
    if (empty($_SESSION['uid'])) return null;
    $query = db()->prepare('SELECT id,email,name,provider FROM users WHERE id=?');
    $query->execute([$_SESSION['uid']]);
    return $query->fetch() ?: null;
}

function required_user(): array { $value = user(); if (!$value) respond(['error' => 'Přihlášení je vyžadováno.'], 401); return $value; }
function public_user(array $value): array { return ['id' => $value['id'], 'email' => $value['email'], 'name' => $value['name'], 'authSource' => 'licentia', 'providerLabel' => ucfirst($value['provider'] ?: 'Apache')]; }
function uuid(): string { return bin2hex(random_bytes(16)); }

function base_url(): string {
    global $secure;
    $prefix = preg_replace('~/api(?:/.*)?$~', '', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '');
    return ($secure ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . rtrim($prefix, '/');
}

function oauth_request(string $url, array $post = [], array $headers = ['Accept: application/json']): array {
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_FOLLOWLOCATION => false, CURLOPT_HTTPHEADER => $headers]);
    if ($post) { curl_setopt($curl, CURLOPT_POST, true); curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($post)); }
    $raw = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
    if ($raw === false || $status >= 400) throw new RuntimeException('OAuth služba neodpověděla.');
    return json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
}

function oauth_signin(string $provider, string $providerId, string $email, string $name): never {
    $query = db()->prepare('SELECT id FROM users WHERE email=?'); $query->execute([strtolower($email)]); $id = $query->fetchColumn();
    if (!$id) { $id = uuid(); $insert = db()->prepare('INSERT INTO users(id,email,name,password_hash,provider,provider_id,created_at) VALUES(?,?,?,?,?,?,?)'); $insert->execute([$id, strtolower($email), $name, null, $provider, $providerId, date(DATE_ATOM)]); }
    $_SESSION['uid'] = $id; session_regenerate_id(true); header('Location: ' . base_url() . '/'); exit;
}

function family(array $license): string {
    $conditions = $license['conditions'] ?? [];
    if (in_array('network-use-disclose', $conditions, true)) return 'Síťový copyleft';
    if (in_array('same-license', $conditions, true)) return 'Silný copyleft';
    if (in_array('same-license--library', $conditions, true)) return 'Knihovní copyleft';
    if (in_array('same-license--file', $conditions, true)) return 'Souborový copyleft';
    return !empty($license['profiled']) ? 'Permisivní' : 'Neklasifikováno';
}

function recommended(array $answers): array {
    $rows = [];
    foreach (catalog() as $license) {
        if ($license['type'] !== 'license' || empty($license['profiled']) || $license['deprecated']) continue;
        $family = family($license); $score = 45; $reasons = []; $permissive = $family === 'Permisivní';
        if (($answers['openness'] ?? '') === 'closed') { $score += $permissive ? 22 : -38; if ($permissive) $reasons[] = 'umožňuje uzavřené použití'; }
        $desired = $answers['reciprocity'] ?? '';
        if ($desired === 'none') $score += $permissive ? 32 : -28;
        if ($desired === 'file') $score += $family === 'Souborový copyleft' ? 35 : -8;
        if ($desired === 'library') $score += $family === 'Knihovní copyleft' ? 36 : -4;
        if ($desired === 'strong') $score += $family === 'Silný copyleft' ? 38 : -18;
        if ($desired === 'network') $score += $family === 'Síťový copyleft' ? 45 : -18;
        if (($answers['patents'] ?? '') === 'important') $score += in_array('patent-use', $license['permissions'] ?? [], true) ? 24 : -7;
        if (($answers['jurisdiction'] ?? '') === 'eu' && $license['id'] === 'EUPL-1.2') $score += 28;
        $rows[] = ['license' => $license, 'score' => $score, 'reasons' => $reasons ?: ['odpovídá zvolenému základnímu profilu']];
    }
    usort($rows, fn($a, $b) => $b['score'] <=> $a['score']);
    return array_slice($rows, 0, 5);
}

function validate_expression(string $expression): array {
    $tokens = preg_split('/\s+|(?=[()])|(?<=[()])/', trim($expression), -1, PREG_SPLIT_NO_EMPTY);
    $licenses = []; $exceptions = [];
    foreach (catalog() as $item) { if ($item['type'] === 'license') $licenses[$item['id']] = true; else $exceptions[$item['id']] = true; }
    $depth = 0; $expectId = true; $with = false;
    foreach ($tokens as $token) {
        $upper = strtoupper($token);
        if ($token === '(') { if (!$expectId) return ['valid' => false, 'expression' => $expression, 'errors' => ['Neočekávaná závorka.']]; $depth++; continue; }
        if ($token === ')') { if ($expectId || --$depth < 0) return ['valid' => false, 'expression' => $expression, 'errors' => ['Neplatné závorky.']]; continue; }
        if (in_array($upper, ['AND', 'OR'], true)) { if ($expectId) return ['valid' => false, 'expression' => $expression, 'errors' => ['Chybí identifikátor.']]; $expectId = true; continue; }
        if ($upper === 'WITH') { if ($expectId) return ['valid' => false, 'expression' => $expression, 'errors' => ['WITH musí následovat po licenci.']]; $expectId = true; $with = true; continue; }
        $set = $with ? $exceptions : $licenses;
        if (!$expectId || !isset($set[$token])) return ['valid' => false, 'expression' => $expression, 'errors' => ["Neznámý nebo neočekávaný identifikátor „$token“."]];
        $expectId = false; $with = false;
    }
    $valid = !$expectId && $depth === 0;
    return ['valid' => $valid, 'expression' => $expression, 'errors' => $valid ? [] : ['Výraz není dokončený.']];
}

function compatibility(array $ids, array $context = []): array {
    $items = []; $unknown = [];
    foreach ($ids as $id) { $license = summary((string)$id, 'license'); if ($license) $items[] = ['id' => $id, 'family' => family($license)]; else $unknown[] = $id; }
    $strong = array_filter($items, fn($item) => in_array($item['family'], ['Silný copyleft', 'Síťový copyleft'], true));
    $warnings = [];
    if ($unknown) $warnings[] = 'Neznámé identifikátory: ' . implode(', ', $unknown) . '.';
    if (count($strong) > 1) $warnings[] = 'Kombinace více silných copyleft licencí vyžaduje ruční kontrolu.';
    if (!$warnings) $warnings[] = 'Nebyl nalezen zjevný konflikt; nejde o právní stanovisko.';
    return ['dataVersion' => DATA_VERSION, 'advisory' => true, 'compatible' => (!$unknown && count($strong) < 2) ? 'likely' : 'review', 'licenses' => $items, 'context' => $context, 'warnings' => $warnings];
}

function analyze_sbom(mixed $document): array {
    $raw = json_encode($document); $found = [];
    foreach (catalog() as $license) if ($license['type'] === 'license' && preg_match('/(^|[^A-Za-z0-9.\-])' . preg_quote($license['id'], '/') . '([^A-Za-z0-9.\-]|$)/', $raw)) $found[] = ['id' => $license['id'], 'name' => $license['name'], 'family' => family($license), 'deprecated' => $license['deprecated']];
    return ['dataVersion' => DATA_VERSION, 'advisory' => true, 'licenseCount' => count($found), 'licenses' => $found];
}

$route = route_path(); $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { header('Access-Control-Allow-Origin: *'); header('Access-Control-Allow-Headers: content-type, authorization, mcp-protocol-version'); header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS'); http_response_code(204); exit; }
if (in_array($method, ['POST', 'PUT', 'DELETE'], true) && !str_starts_with($route, 'v1/') && $route !== 'mcp') { $origin = $_SERVER['HTTP_ORIGIN'] ?? ''; if ($origin && parse_url($origin, PHP_URL_HOST) !== ($_SERVER['HTTP_HOST'] ?? '')) respond(['error' => 'Neplatný původ požadavku.'], 403); }

if ($route === 'api/auth/session') { $current = user(); respond(['user' => $current ? public_user($current) : null, 'providers' => ['google' => !empty($config['google_client_id']) && !empty($config['google_client_secret']), 'github' => !empty($config['github_client_id']) && !empty($config['github_client_secret'])]]); }
if ($route === 'api/auth/register' && $method === 'POST') { $value = body(); $email = strtolower(trim((string)($value['email'] ?? ''))); $name = trim((string)($value['name'] ?? '')); $password = (string)($value['password'] ?? ''); if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12 || $name === '') respond(['error' => 'Vyplňte jméno, platný e-mail a heslo s alespoň 12 znaky.'], 422); try { $id = uuid(); $query = db()->prepare('INSERT INTO users(id,email,name,password_hash,provider,provider_id,created_at) VALUES(?,?,?,?,?,?,?)'); $query->execute([$id, $email, $name, password_hash($password, PASSWORD_DEFAULT), 'email', null, date(DATE_ATOM)]); } catch (PDOException) { respond(['error' => 'Účet s tímto e-mailem už existuje.'], 409); } $_SESSION['uid'] = $id; session_regenerate_id(true); respond(['ok' => true]); }
if ($route === 'api/auth/login' && $method === 'POST') { $value = body(); $query = db()->prepare('SELECT * FROM users WHERE email=?'); $query->execute([strtolower(trim((string)($value['email'] ?? '')))]); $found = $query->fetch(); if (!$found || !$found['password_hash'] || !password_verify((string)($value['password'] ?? ''), $found['password_hash'])) respond(['error' => 'E-mail nebo heslo nesouhlasí.'], 401); $_SESSION['uid'] = $found['id']; session_regenerate_id(true); respond(['ok' => true]); }
if ($route === 'api/auth/logout') { $_SESSION = []; session_destroy(); header('Location: ' . base_url() . '/'); exit; }
if (preg_match('~^api/auth/oauth/(google|github)$~', $route, $match)) { $provider = $match[1]; $clientId = $config[$provider . '_client_id'] ?? ''; if (!$clientId) respond(['error' => 'OAuth poskytovatel není nakonfigurován.'], 503); $_SESSION['oauth_state'] = bin2hex(random_bytes(24)); $_SESSION['oauth_provider'] = $provider; $callback = base_url() . '/api/auth/oauth/callback'; $url = $provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(['client_id' => $clientId, 'redirect_uri' => $callback, 'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $_SESSION['oauth_state']]) : 'https://github.com/login/oauth/authorize?' . http_build_query(['client_id' => $clientId, 'redirect_uri' => $callback, 'scope' => 'read:user user:email', 'state' => $_SESSION['oauth_state']]); header('Location: ' . $url); exit; }
if ($route === 'api/auth/oauth/callback') { if (!hash_equals($_SESSION['oauth_state'] ?? '', (string)($_GET['state'] ?? ''))) respond(['error' => 'Neplatný OAuth stav.'], 400); $provider = $_SESSION['oauth_provider'] ?? ''; $code = (string)($_GET['code'] ?? ''); $callback = base_url() . '/api/auth/oauth/callback'; if ($provider === 'google') { $token = oauth_request('https://oauth2.googleapis.com/token', ['client_id' => $config['google_client_id'], 'client_secret' => $config['google_client_secret'], 'code' => $code, 'grant_type' => 'authorization_code', 'redirect_uri' => $callback]); $profile = oauth_request('https://openidconnect.googleapis.com/v1/userinfo', [], ['Authorization: Bearer ' . $token['access_token'], 'Accept: application/json']); oauth_signin('google', (string)$profile['sub'], (string)$profile['email'], (string)($profile['name'] ?? $profile['email'])); } if ($provider === 'github') { $token = oauth_request('https://github.com/login/oauth/access_token', ['client_id' => $config['github_client_id'], 'client_secret' => $config['github_client_secret'], 'code' => $code, 'redirect_uri' => $callback]); $headers = ['Authorization: Bearer ' . $token['access_token'], 'Accept: application/vnd.github+json', 'User-Agent: Licentia']; $profile = oauth_request('https://api.github.com/user', [], $headers); $email = $profile['email'] ?? null; if (!$email) { foreach (oauth_request('https://api.github.com/user/emails', [], $headers) as $entry) if (!empty($entry['primary'])) { $email = $entry['email']; break; } } if (!$email) respond(['error' => 'GitHub neposkytl e-mail.'], 400); oauth_signin('github', (string)$profile['id'], (string)$email, (string)($profile['name'] ?? $profile['login'])); } respond(['error' => 'Neplatný OAuth poskytovatel.'], 400); }

if ($route === 'api/state') { $current = required_user(); if ($method === 'GET') { $query = db()->prepare('SELECT * FROM user_state WHERE user_id=?'); $query->execute([$current['id']]); $state = $query->fetch(); respond($state ? ['favorites' => json_decode($state['favorites'], true), 'compareIds' => json_decode($state['compare_ids'], true), 'guideAnswers' => json_decode($state['guide_answers'], true), 'history' => json_decode($state['history'], true), 'updatedAt' => $state['updated_at']] : ['favorites' => [], 'compareIds' => [], 'guideAnswers' => (object)[], 'history' => []]); } if ($method === 'PUT') { $value = body(); $favorites = array_slice(array_values(array_map('strval', is_array($value['favorites'] ?? null) ? $value['favorites'] : [])), 0, 500); $compare = array_slice(array_values(array_map('strval', is_array($value['compareIds'] ?? null) ? $value['compareIds'] : [])), 0, 4); $answers = is_array($value['guideAnswers'] ?? null) ? $value['guideAnswers'] : []; $history = array_slice(is_array($value['history'] ?? null) ? $value['history'] : [], 0, 100); $now = date(DATE_ATOM); $query = db()->prepare('SELECT user_id FROM user_state WHERE user_id=?'); $query->execute([$current['id']]); if ($query->fetch()) { $query = db()->prepare('UPDATE user_state SET favorites=?,compare_ids=?,guide_answers=?,history=?,updated_at=? WHERE user_id=?'); $query->execute([json_encode($favorites), json_encode($compare), json_encode($answers), json_encode($history), $now, $current['id']]); } else { $query = db()->prepare('INSERT INTO user_state(user_id,favorites,compare_ids,guide_answers,history,updated_at) VALUES(?,?,?,?,?,?)'); $query->execute([$current['id'], json_encode($favorites), json_encode($compare), json_encode($answers), json_encode($history), $now]); } respond(['saved' => true, 'updatedAt' => $now]); } }

if ($route === 'v1') respond(['name' => 'Licentia API', 'version' => API_VERSION, 'dataVersion' => DATA_VERSION, 'mcp' => '/mcp'], 200, true);
if ($route === 'v1/licenses' && $method === 'GET') { $query = strtolower(trim((string)($_GET['q'] ?? ''))); $type = $_GET['type'] ?? null; $items = array_values(array_filter(catalog(), fn($item) => (!$query || str_contains(strtolower($item['id'] . ' ' . $item['name']), $query)) && (!$type || $type === 'all' || $item['type'] === $type) && (!isset($_GET['osi']) || $_GET['osi'] !== 'true' || $item['osi']) && (!isset($_GET['fsf']) || $_GET['fsf'] !== 'true' || $item['fsf']))); $limit = min(200, max(1, (int)($_GET['limit'] ?? 50))); $offset = max(0, (int)($_GET['offset'] ?? 0)); respond(['dataVersion' => DATA_VERSION, 'total' => count($items), 'offset' => $offset, 'limit' => $limit, 'items' => array_slice($items, $offset, $limit)], 200, true); }
if (preg_match('~^v1/(licenses|exceptions)/([^/]+)(/text)?$~', $route, $match) && $method === 'GET') { $type = $match[1] === 'licenses' ? 'license' : 'exception'; $detail = license_detail(rawurldecode($match[2]), $type); if (!empty($match[3])) { header('Content-Type: text/plain; charset=utf-8'); header('Access-Control-Allow-Origin: *'); echo $detail['text']; exit; } respond(['dataVersion' => DATA_VERSION] + $detail, 200, true); }
if ($route === 'v1/versions') respond(['current' => DATA_VERSION, 'versions' => [['version' => DATA_VERSION, 'licenseCount' => 727, 'exceptionCount' => 84, 'source' => 'SPDX License List']]], 200, true);
if ($route === 'v1/snapshots/' . DATA_VERSION) respond(['version' => DATA_VERSION, 'licenseCount' => 727, 'exceptionCount' => 84, 'immutable' => true], 200, true);
if ($method === 'POST' && in_array($route, ['v1/recommendations', 'v1/expressions/validate', 'v1/compatibility/check', 'v1/sbom/analyze'], true)) { $value = body(); $result = match ($route) { 'v1/recommendations' => ['dataVersion' => DATA_VERSION, 'ruleVersion' => '1.0.0', 'advisory' => true, 'candidates' => recommended($value['requirements'] ?? $value)], 'v1/expressions/validate' => validate_expression((string)($value['expression'] ?? '')), 'v1/compatibility/check' => compatibility(is_array($value['ids'] ?? null) ? $value['ids'] : [], is_array($value['context'] ?? null) ? $value['context'] : []), 'v1/sbom/analyze' => analyze_sbom($value['document'] ?? $value) }; respond($result, 200, true); }

if ($route === 'mcp' && $method === 'POST') {
    $rpc = body(); $id = $rpc['id'] ?? null; $rpcMethod = $rpc['method'] ?? '';
    $success = fn($value) => respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => $value], 200, true);
    if ($rpcMethod === 'initialize') $success(['protocolVersion' => '2025-03-26', 'capabilities' => ['tools' => (object)[], 'resources' => (object)[]], 'serverInfo' => ['name' => 'licentia', 'version' => API_VERSION], 'instructions' => 'Kanonická data SPDX; doporučení nejsou právní radou.']);
    if ($rpcMethod === 'notifications/initialized') { http_response_code(202); exit; }
    if ($rpcMethod === 'ping') $success((object)[]);
    $tools = [['name' => 'search_licenses', 'description' => 'Vyhledá SPDX licence.', 'inputSchema' => ['type' => 'object', 'properties' => ['query' => ['type' => 'string'], 'limit' => ['type' => 'integer']]]], ['name' => 'get_license', 'description' => 'Vrátí detail a úplné znění licence.', 'inputSchema' => ['type' => 'object', 'required' => ['id'], 'properties' => ['id' => ['type' => 'string'], 'type' => ['enum' => ['license', 'exception']]]]], ['name' => 'compare_licenses', 'description' => 'Orientačně porovná licence.', 'inputSchema' => ['type' => 'object', 'required' => ['ids'], 'properties' => ['ids' => ['type' => 'array', 'items' => ['type' => 'string']]]]], ['name' => 'recommend_license', 'description' => 'Doporučí licenci podle požadavků.', 'inputSchema' => ['type' => 'object', 'properties' => (object)[]]], ['name' => 'validate_spdx_expression', 'description' => 'Ověří SPDX výraz.', 'inputSchema' => ['type' => 'object', 'required' => ['expression'], 'properties' => ['expression' => ['type' => 'string']]]], ['name' => 'analyze_sbom', 'description' => 'Analyzuje licence v SBOM.', 'inputSchema' => ['type' => 'object', 'required' => ['document'], 'properties' => ['document' => (object)[]]]]];
    if ($rpcMethod === 'tools/list') $success(['tools' => $tools]);
    if ($rpcMethod === 'resources/templates/list') $success(['resourceTemplates' => [['uriTemplate' => 'spdx://licenses/{id}', 'name' => 'SPDX licence', 'mimeType' => 'application/json'], ['uriTemplate' => 'spdx://exceptions/{id}', 'name' => 'SPDX výjimka', 'mimeType' => 'application/json']]]);
    if ($rpcMethod === 'resources/read') { if (!preg_match('~^spdx://(licenses|exceptions)/(.+)$~', $rpc['params']['uri'] ?? '', $match)) respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32602, 'message' => 'Neplatné URI']], 400, true); $detail = license_detail(rawurldecode($match[2]), $match[1] === 'licenses' ? 'license' : 'exception'); $success(['contents' => [['uri' => $rpc['params']['uri'], 'mimeType' => 'application/json', 'text' => json_encode(['dataVersion' => DATA_VERSION] + $detail, JSON_UNESCAPED_UNICODE)]]]); }
    if ($rpcMethod === 'tools/call') { $name = $rpc['params']['name'] ?? ''; $args = $rpc['params']['arguments'] ?? []; $value = match ($name) { 'search_licenses' => ['dataVersion' => DATA_VERSION, 'items' => array_slice(array_values(array_filter(catalog(), fn($item) => !($args['query'] ?? '') || str_contains(strtolower($item['id'] . ' ' . $item['name']), strtolower((string)$args['query'])))), 0, min(200, (int)($args['limit'] ?? 50)))], 'get_license' => ['dataVersion' => DATA_VERSION] + license_detail((string)($args['id'] ?? ''), ($args['type'] ?? 'license') === 'exception' ? 'exception' : 'license'), 'compare_licenses' => compatibility($args['ids'] ?? [], $args['context'] ?? []), 'recommend_license' => ['dataVersion' => DATA_VERSION, 'ruleVersion' => '1.0.0', 'advisory' => true, 'candidates' => recommended($args)], 'validate_spdx_expression' => validate_expression((string)($args['expression'] ?? '')), 'analyze_sbom' => analyze_sbom($args['document'] ?? []), default => null }; if ($value === null) respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32602, 'message' => 'Unknown tool']], 400, true); $success(['content' => [['type' => 'text', 'text' => json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)]], 'structuredContent' => $value, 'isError' => false]); }
    respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32601, 'message' => 'Method not found']], 400, true);
}
if ($route === 'mcp') { header('Allow: POST, OPTIONS'); respond(['error' => 'MCP používá HTTP POST.'], 405, true); }
respond(['error' => 'Endpoint nebyl nalezen.'], 404, str_starts_with($route, 'v1/'));
