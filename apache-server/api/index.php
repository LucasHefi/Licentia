<?php
declare(strict_types=1);

const DATA_VERSION = '3.28.0';
const API_VERSION = '1.0.0';
const RULE_VERSION = '1.0.0';
const GUIDE_MODEL_VERSION = 'lic-008-guide-v1';

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
    $pdo->exec("CREATE TABLE IF NOT EXISTS public_rate_limit (key VARCHAR(128) PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL)");
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
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 131072) respond(['error' => 'Tělo požadavku je příliš velké.'], 413);
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 131072) respond(['error' => 'Tělo požadavku je příliš velké.'], 413);
    $value = json_decode($raw, true);
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

function public_ip(): string {
    global $config;
    $raw = !empty($config['trusted_proxy']) ? ($_SERVER[$config['trusted_proxy_header'] ?? 'HTTP_CF_CONNECTING_IP'] ?? '') : ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ip = filter_var(trim((string)$raw), FILTER_VALIDATE_IP);
    return $ip ?: 'unknown';
}

function public_limit(bool $expensive): void {
    global $config;
    $limit = $expensive ? 20 : 60; $now = time(); $window = intdiv($now, 60) * 60;
    try {
        $ip = public_ip();
        if ($ip === 'unknown') throw new RuntimeException('remote address unavailable');
        $key = hash_hmac('sha256', ($expensive ? 'expensive:' : 'normal:') . $ip, (string)($config['rate_limit_secret'] ?? 'missing-secret'));
        if (str_starts_with($config['db_dsn'], 'mysql:')) {
            $query = db()->prepare('INSERT INTO public_rate_limit(`key`,window_start,count) VALUES(?,?,1) ON DUPLICATE KEY UPDATE count=IF(public_rate_limit.window_start<>VALUES(window_start),1,public_rate_limit.count+1), window_start=VALUES(window_start)');
        } else {
            $query = db()->prepare('INSERT INTO public_rate_limit(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN public_rate_limit.window_start<>excluded.window_start THEN 1 ELSE public_rate_limit.count+1 END');
        }
        $query->execute([$key, $window]);
        $query = db()->prepare('SELECT window_start,count FROM public_rate_limit WHERE key=?'); $query->execute([$key]); $row = $query->fetch();
        if (!$row || (int)$row['window_start'] !== $window) throw new RuntimeException('rate limiter unavailable');
        header('RateLimit-Limit: ' . $limit); header('RateLimit-Remaining: ' . max(0, $limit - (int)$row['count'])); header('RateLimit-Reset: ' . (string)($window + 60 - $now));
        if ((int)$row['count'] > $limit) { header('Retry-After: ' . (string)($window + 60 - $now)); respond(['error' => 'Příliš mnoho požadavků.'], 429, true); }
    } catch (Throwable) { respond(['error' => 'Veřejné API je dočasně nedostupné.'], 503, true); }
}

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

function guide_answer_schema(): array {
    $uncertain = ['unknown', 'not-applicable', 'undecided'];
    $enum = static fn(array $values): array => ['enum' => array_values(array_unique(array_merge($values, $uncertain)))];
    $properties = [
            'openness' => $enum(['open', 'closed']),
            'reciprocity' => $enum(['none', 'file', 'library', 'strong', 'network']),
            'delivery' => $enum(['library', 'application', 'saas', 'internal']),
            'patents' => $enum(['important', 'neutral']),
            'notices' => $enum(['minimal', 'standard']),
            'jurisdiction' => $enum(['eu', 'global']),
            'projectForm' => $enum(['library', 'application', 'service', 'plugin']),
            'commercialUse' => $enum(['allowed', 'restricted']),
            'proprietary' => $enum(['allowed', 'preferred', 'required']),
            'copyleftTrigger' => $enum(['distribution', 'network', 'none']),
            'trademarks' => $enum(['important', 'neutral']),
            'obligations' => $enum(['notices', 'source', 'installation', 'minimal']),
            'dependencies' => ['type' => 'string', 'description' => 'SPDX expression, or the explicit string unknown/not-applicable'],
            'versionStrategy' => $enum(['fixed', 'later', 'either']),
            'dualLicensing' => $enum(['yes', 'no', 'considering']),
            'futureDistribution' => $enum(['public', 'commercial', 'internal']),
        ];
    return ['oneOf' => [
        ['type' => 'object', 'additionalProperties' => false, 'properties' => $properties],
        ['type' => 'object', 'additionalProperties' => false, 'required' => ['requirements'], 'properties' => ['mode' => ['enum' => ['quick', 'advanced']], 'requirements' => ['type' => 'object', 'additionalProperties' => false, 'properties' => $properties]]],
    ]];
}

function validate_expression(string $expression): array {
    $normalized = preg_replace('/\s+/', ' ', trim($expression)) ?? trim($expression);
    $tokens = preg_split('/\s+|(?=[()])|(?<=[()])/', $normalized, -1, PREG_SPLIT_NO_EMPTY) ?: [];
    $licenses = []; $exceptions = [];
    foreach (catalog() as $item) {
        if (!is_array($item) || !isset($item['id'], $item['type'])) continue;
        if ($item['type'] === 'license') $licenses[(string)$item['id']] = true;
        if ($item['type'] === 'exception') $exceptions[(string)$item['id']] = true;
    }
    $position = 0;
    $parseTerm = null; $parseAnd = null; $parseOr = null;
    $parseTerm = static function () use (&$parseTerm, &$parseOr, &$position, $tokens, $licenses, $exceptions): void {
        $token = $tokens[$position] ?? null;
        if ($token === '(') {
            $position++;
            $parseOr();
            if (($tokens[$position] ?? null) !== ')') throw new RuntimeException('Neplatné závorky.');
            $position++;
            return;
        }
        if ($token === null || in_array(strtoupper((string)$token), ['AND', 'OR', 'WITH', ')'], true)) throw new RuntimeException('Chybí identifikátor.');
        if (!isset($licenses[$token])) throw new RuntimeException('Neznámý nebo neočekávaný identifikátor „' . (string)$token . '“.');
        $position++;
        if (strtoupper((string)($tokens[$position] ?? '')) !== 'WITH') return;
        $position++;
        $exception = $tokens[$position] ?? null;
        if ($exception === null || in_array(strtoupper((string)$exception), ['AND', 'OR', 'WITH', '(', ')'], true) || !isset($exceptions[$exception])) throw new RuntimeException('Neznámá nebo neočekávaná SPDX výjimka „' . (string)$exception . '“.');
        $position++;
    };
    $parseAnd = static function () use (&$parseAnd, &$parseTerm, &$position, $tokens): void {
        $parseTerm();
        while (strtoupper((string)($tokens[$position] ?? '')) === 'AND') { $position++; $parseTerm(); }
    };
    $parseOr = static function () use (&$parseOr, &$parseAnd, &$position, $tokens): void {
        $parseAnd();
        while (strtoupper((string)($tokens[$position] ?? '')) === 'OR') { $position++; $parseAnd(); }
    };
    try {
        if (!$tokens) throw new RuntimeException('Výraz je prázdný.');
        $parseOr();
        if ($position !== count($tokens)) throw new RuntimeException("Neznámý nebo neočekávaný token „{$tokens[$position]}“.");
        return ['valid' => true, 'expression' => $normalized, 'errors' => []];
    } catch (Throwable $error) {
        return ['valid' => false, 'expression' => $normalized, 'errors' => [$error->getMessage() ?: 'Neplatný výraz.']];
    }
}

function validate_guide_answers(array $answers): array {
    $allowed = [
        'openness' => ['open', 'closed'], 'reciprocity' => ['none', 'file', 'library', 'strong', 'network'],
        'delivery' => ['library', 'application', 'saas', 'internal'], 'patents' => ['important', 'neutral'],
        'notices' => ['minimal', 'standard'], 'jurisdiction' => ['eu', 'global'],
        'projectForm' => ['library', 'application', 'service', 'plugin'], 'commercialUse' => ['allowed', 'restricted'],
        'proprietary' => ['allowed', 'preferred', 'required'], 'copyleftTrigger' => ['distribution', 'network', 'none'],
        'trademarks' => ['important', 'neutral'], 'obligations' => ['notices', 'source', 'installation', 'minimal'],
        'versionStrategy' => ['fixed', 'later', 'either'], 'dualLicensing' => ['yes', 'no', 'considering'],
        'futureDistribution' => ['public', 'commercial', 'internal'],
    ];
    $uncertain = ['unknown', 'not-applicable', 'undecided']; $errors = []; $missing = []; $unsupported = [];
    foreach ($answers as $key => $value) {
        if ($key === 'dependencies') {
            if (!is_string($value)) { $errors[] = 'answers.dependencies: invalid value type'; $unsupported[] = 'answers.dependencies'; continue; }
            if (in_array(strtolower($value), $uncertain, true)) { $errors[] = "answers.dependencies: uncertainty state $value is not recommendable"; $missing[] = 'answers.dependencies'; continue; }
            $parsed = validate_expression($value);
            if (!$parsed['valid']) { $errors[] = 'answers.dependencies: ' . ($parsed['errors'][0] ?? 'invalid dependency expression'); $unsupported[] = 'answers.dependencies'; }
            continue;
        }
        if (!array_key_exists($key, $allowed)) { $errors[] = "answers.$key: unknown answer key"; $unsupported[] = "answers.$key"; continue; }
        if (!is_string($value)) { $errors[] = "answers.$key: invalid value type"; $unsupported[] = "answers.$key"; continue; }
        if (in_array($value, $uncertain, true)) { $errors[] = "answers.$key: uncertainty state $value is not recommendable"; $missing[] = "answers.$key"; continue; }
        if (!in_array($value, $allowed[$key], true)) { $errors[] = "answers.$key: invalid enum value"; $unsupported[] = "answers.$key"; continue; }
        if ($key === 'jurisdiction') { $errors[] = 'jurisdiction: unsupported until metadata provides jurisdiction'; $unsupported[] = 'jurisdiction'; }
        if (in_array($key, ['versionStrategy', 'dualLicensing', 'futureDistribution'], true)) { $errors[] = "semantic.$key: no validated metadata field exists"; $unsupported[] = "semantic.$key"; }
        if ($key === 'commercialUse' && $value === 'restricted') { $errors[] = 'semantic.commercialUse: commercialUse=restricted is not represented by the metadata contract'; $unsupported[] = 'semantic.commercialUse'; }
    }
    if (($answers['delivery'] ?? null) === 'application' && !array_key_exists('dependencies', $answers)) { $errors[] = 'answers.dependencies: dependency analysis is required for application delivery'; $missing[] = 'dependencies'; }
    return ['valid' => !$errors, 'errors' => $errors, 'missing' => array_values(array_unique($missing)), 'unsupported' => array_values(array_unique($unsupported))];
}

function dependency_analysis_state(array $answers): string {
    if (!array_key_exists('dependencies', $answers)) return 'not-requested';
    if (!is_string($answers['dependencies'])) return 'malformed';
    $expression = trim($answers['dependencies']);
    if (strtolower($expression) === 'unknown') return 'unknown';
    $parsed = validate_expression($expression);
    if ($parsed['valid']) return 'valid';
    $known = [];
    foreach (catalog() as $item) if (is_array($item) && isset($item['id'], $item['type'])) $known[(string)$item['id']] = true;
    $identifiers = preg_match_all('/[A-Za-z0-9][A-Za-z0-9.-]*/', $expression, $matches) ? array_unique($matches[0]) : [];
    foreach ($identifiers as $identifier) if (!in_array(strtoupper($identifier), ['AND', 'OR', 'WITH'], true) && !isset($known[$identifier])) return 'unknown';
    return 'malformed';
}

function guide_next_question(array $answers, string $mode): ?string {
    $keys = $mode === 'advanced'
        ? ['delivery', 'dependencies', 'copyleftTrigger', 'patents', 'trademarks', 'obligations', 'versionStrategy', 'dualLicensing', 'futureDistribution']
        : ['openness', 'projectForm', 'reciprocity', 'commercialUse', 'delivery', 'patents'];
    foreach ($keys as $key) {
        if ($key === 'dependencies' && ($answers['delivery'] ?? null) !== 'application') continue;
        if (!array_key_exists($key, $answers) || in_array($answers[$key], ['unknown', 'not-applicable', 'undecided'], true)) return $key;
    }
    return null;
}

function recommendation_input(array $input, bool $mcp = false): array {
    $envelope = array_key_exists('mode', $input) || array_key_exists('requirements', $input);
    if (!$envelope) return ['answers' => $input, 'mode' => 'quick'];
    if (array_diff(array_keys($input), ['mode', 'requirements']) || !array_key_exists('requirements', $input) || !is_array($input['requirements'])) {
        if ($mcp) respond(['jsonrpc' => '2.0', 'id' => $GLOBALS['mcp_error_id'] ?? null, 'error' => ['code' => -32602, 'message' => 'Recommendation envelope may contain only mode and requirements.']], 400, true);
        respond(['error' => 'Recommendation envelope may contain only mode and requirements.'], 400, true);
    }
    if (array_key_exists('mode', $input) && !in_array($input['mode'], ['quick', 'advanced'], true)) {
        if ($mcp) respond(['jsonrpc' => '2.0', 'id' => $GLOBALS['mcp_error_id'] ?? null, 'error' => ['code' => -32602, 'message' => 'Recommendation mode must be quick or advanced.']], 400, true);
        respond(['error' => 'Recommendation mode must be quick or advanced.'], 400, true);
    }
    return ['answers' => $input['requirements'], 'mode' => $input['mode'] ?? 'quick'];
}

function canonical_recommendation(array $answers, string $mode = 'quick'): array {
    $proprietary = in_array($answers['proprietary'] ?? null, ['allowed', 'preferred', 'required'], true) || ($answers['openness'] ?? null) === 'closed';
    $branch = $proprietary ? 'source-available-or-proprietary' : 'open-source';
    $result = ['dataVersion' => DATA_VERSION, 'guideModelVersion' => GUIDE_MODEL_VERSION, 'guideMode' => $mode, 'ruleVersion' => RULE_VERSION, 'advisory' => true, 'outcome' => 'no-safe-match', 'branch' => $branch, 'candidates' => [], 'alternatives' => [], 'trace' => ['hard constraints evaluated before ranking', "branch=$branch", 'dependency-analysis=' . dependency_analysis_state($answers)], 'conflicts' => [], 'unknowns' => [], 'obligations' => [], 'guidance' => []];
    $nextQuestion = $mode === 'quick' && ($answers['delivery'] ?? null) === 'application' && !array_key_exists('dependencies', $answers)
        ? 'dependencies'
        : guide_next_question($answers, $mode);
    if ($nextQuestion !== null) $result['nextQuestion'] = $nextQuestion;
    $validation = validate_guide_answers($answers);
    if (!$validation['valid']) { $result['unknowns'] = $validation['missing']; $result['conflicts'] = $validation['unsupported']; $result['guidance'] = $validation['errors']; $result['trace'] = array_merge($result['trace'], $validation['errors']); return $result; }
    if ($proprietary) { $result['guidance'][] = 'Proprietary or source-available intent requires separate terms; no OSI/open-source recommendation is shown.'; $result['trace'][] = 'open-source candidates suppressed for proprietary branch'; return $result; }
    $profiles = [];
    foreach (catalog() as $record) { $profile = metadata_profile(is_array($record) ? $record : []); if ($profile !== null) $profiles[] = $profile; }
    if (!$profiles) { $result['unknowns'][] = 'catalog metadata'; $result['guidance'][] = 'No safe match: runtime catalog metadata is absent or unresolved. Review evidence before recommending a license.'; return $result; }
    $candidates = []; $unknowns = []; $conflicts = [];
    foreach ($profiles as $profile) {
        $candidate = metadata_candidate($profile, $answers);
        if ($candidate['conflicts']) { $conflicts = array_merge($conflicts, $candidate['conflicts']); continue; }
        $candidates[] = $candidate;
        $unknowns = array_merge($unknowns, array_map(static fn($field) => $candidate['id'] . ': ' . $field, $candidate['unknowns']));
    }
    usort($candidates, static fn($a, $b) => $b['score'] <=> $a['score'] ?: strcmp($a['id'], $b['id']));
    $result['conflicts'] = array_values(array_unique($conflicts)); $result['unknowns'] = array_values(array_unique($unknowns));
    if (!$candidates) { $result['guidance'][] = 'No safe match: validated metadata does not satisfy the requested hard constraints.'; return $result; }
    $result['candidates'] = array_slice($candidates, 0, 5); $result['alternatives'] = array_slice($candidates, 5);
    $result['obligations'] = $candidates[0]['obligations'];
    if ($result['unknowns']) { $result['outcome'] = 'insufficient-evidence'; $result['guidance'][] = 'Insufficient evidence remains in candidate metadata; no recommendation claim is made.'; $result['trace'][] = 'insufficient semantic evidence prevents a recommendation claim'; }
    else $result['outcome'] = 'recommendation';
    return $result;
}

function metadata_exact_keys(array $value, array $required, array $optional = []): bool {
    $allowed = array_fill_keys(array_merge($required, $optional), true);
    foreach (array_keys($value) as $key) if (!isset($allowed[$key])) return false;
    foreach ($required as $key) if (!array_key_exists($key, $value)) return false;
    return true;
}

function metadata_non_empty_string(mixed $value): bool {
    return is_string($value) && trim($value) !== '';
}

function metadata_string_list(mixed $value): bool {
    if (!is_array($value)) return false;
    $keys = array_keys($value);
    if ($keys !== [] && $keys !== range(0, count($value) - 1)) return false;
    foreach ($value as $item) if (!metadata_non_empty_string($item)) return false;
    return true;
}

function metadata_string_array(mixed $value, array $known): bool {
    if (!is_array($value)) return false;
    $keys = array_keys($value);
    if ($keys !== [] && $keys !== range(0, count($value) - 1)) return false;
    $seen = [];
    foreach ($value as $item) {
        if (!metadata_non_empty_string($item) || !in_array($item, $known, true) || in_array($item, $seen, true)) return false;
        $seen[] = $item;
    }
    return true;
}

function metadata_review(mixed $value): bool {
    if (!is_array($value) || !metadata_exact_keys($value, ['status', 'recommendable', 'evidenceLevel'])) return false;
    return in_array($value['status'], ['blocked', 'not-recommendable', 'pending', 'reviewed', 'stale'], true)
        && is_bool($value['recommendable'])
        && in_array($value['evidenceLevel'], ['strong', 'sufficient', 'unknown', 'weak'], true);
}

function metadata_fingerprint(mixed $value): bool {
    return is_array($value)
        && metadata_exact_keys($value, ['sourceId', 'revision', 'contentHash'])
        && metadata_non_empty_string($value['sourceId'])
        && metadata_non_empty_string($value['revision'])
        && metadata_non_empty_string($value['contentHash']);
}

function metadata_source_known(string $sourceId): bool {
    return in_array($sourceId, ['spdx-license-list', 'spdx-exception-list', 'choose-a-license'], true);
}

function metadata_evidence(mixed $value, bool $requireNonEmpty = false): bool {
    if (!is_array($value)) return false;
    $keys = array_keys($value);
    if ($keys === [] && $requireNonEmpty) return false;
    if ($keys !== [] && $keys !== range(0, count($value) - 1)) return false;
    foreach ($value as $item) {
        if (!is_array($item) || !metadata_exact_keys($item, ['field', 'sourceId', 'locator'], ['ruleId', 'ruleVersion'])) return false;
        if (!metadata_non_empty_string($item['field']) || !metadata_non_empty_string($item['sourceId']) || !metadata_non_empty_string($item['locator'])) return false;
        if (array_key_exists('ruleId', $item) && !metadata_non_empty_string($item['ruleId'])) return false;
        if (array_key_exists('ruleVersion', $item) && !metadata_non_empty_string($item['ruleVersion'])) return false;
    }
    return true;
}

function metadata_semantic(mixed $value): bool {
    if (!is_array($value) || !metadata_exact_keys($value, ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden'], ['projectForm'])) return false;
    if (!in_array($value['family'], ['network-copyleft', 'nonstandard', 'permissive', 'public-domain-equivalent', 'strong-copyleft', 'weak-copyleft', 'unknown'], true)) return false;
    if (!in_array($value['copyleftScope'], ['file', 'library', 'network', 'none', 'whole-work', 'unknown'], true)) return false;
    if (!metadata_string_array($value['permissions'], ['commercial-use', 'distribution', 'modifications', 'patent-grant', 'private-use', 'sublicensing', 'unknown'])) return false;
    if (!metadata_string_array($value['obligations'], ['disclose-source', 'include-copyright', 'include-license-text', 'include-notice', 'mark-modifications', 'network-use-disclose', 'provide-corresponding-source', 'provide-installation-information', 'same-license', 'unknown'])) return false;
    if (!metadata_string_array($value['triggers'], ['combination', 'distribution', 'linking', 'modification', 'network-use', 'patent-claim', 'unknown'])) return false;
    if (!metadata_string_array($value['restrictions'], ['additional-terms', 'liability', 'patent-claim', 'trademark', 'unknown', 'warranty'])) return false;
    if (!in_array($value['patentPosition'], ['defensive-termination', 'express-grant', 'none-stated', 'retaliatory-termination', 'unknown'], true)) return false;
    if (!in_array($value['noticeBurden'], ['material', 'minimal', 'none', 'standard', 'unknown'], true)) return false;
    return !array_key_exists('projectForm', $value) || in_array($value['projectForm'], ['library', 'application', 'service', 'plugin', 'unknown'], true);
}

function metadata_contract(mixed $value, string $id): bool {
    if (!is_array($value) || !metadata_exact_keys($value, ['contractVersion', 'kind', 'id', 'review', 'semantic', 'sourceFingerprint', 'evidence'])) return false;
    return $value['contractVersion'] === '1.0.0'
        && $value['kind'] === 'license'
        && $value['id'] === $id
        && metadata_review($value['review'])
        && metadata_fingerprint($value['sourceFingerprint'])
        && metadata_source_known($value['sourceFingerprint']['sourceId'])
        && !in_array(strtolower($value['sourceFingerprint']['revision']), ['unknown', 'unresolved', 'pending'], true)
        && !in_array(strtolower($value['sourceFingerprint']['contentHash']), ['unknown', 'unresolved', 'pending'], true)
        && metadata_semantic($value['semantic'])
        && metadata_evidence($value['evidence'], true)
        && $value['review']['status'] === 'reviewed'
        && $value['review']['recommendable'] === true
        && in_array($value['review']['evidenceLevel'], ['sufficient', 'strong'], true);
}

function metadata_profile(array $record): ?array {
    if (!metadata_exact_keys($record, ['id', 'type', 'metadata'], ['deprecated', 'name', 'osi', 'fsf', 'profiled', 'permissions', 'conditions', 'limitations'])) return null;
    if (!metadata_non_empty_string($record['id']) || $record['type'] !== 'license') return null;
    if (array_key_exists('deprecated', $record) && $record['deprecated'] !== false) return null;
    if (array_key_exists('name', $record) && !metadata_non_empty_string($record['name'])) return null;
    foreach (['osi', 'fsf', 'profiled'] as $key) if (array_key_exists($key, $record) && !is_bool($record[$key])) return null;
    foreach (['permissions', 'conditions', 'limitations'] as $key) if (array_key_exists($key, $record) && !metadata_string_list($record[$key])) return null;
    if (!metadata_contract($record['metadata'], $record['id'])) return null;
    foreach ($record['metadata']['evidence'] as $evidence) if (!metadata_source_known($evidence['sourceId'])) return null;
    return ['record' => $record, 'metadata' => $record['metadata']];
}

function metadata_candidate(array $profile, array $answers): array {
    $record = $profile['record']; $metadata = $profile['metadata']; $semantic = $metadata['semantic']; $unknowns = []; $conflicts = []; $reasons = []; $matched = []; $score = 0;
    foreach (['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden'] as $field) {
        $value = $semantic[$field];
        if ($value === 'unknown' || (is_array($value) && in_array('unknown', $value, true))) $unknowns[] = "semantic.$field";
    }
    $knownFamilies = ['network-copyleft', 'nonstandard', 'permissive', 'public-domain-equivalent', 'strong-copyleft', 'weak-copyleft'];
    $knownScopes = ['file', 'library', 'network', 'none', 'whole-work'];
    $knownPatents = ['defensive-termination', 'express-grant', 'none-stated', 'retaliatory-termination'];
    $knownNotices = ['material', 'minimal', 'none', 'standard'];
    $required = [];
    if (array_key_exists('openness', $answers)) $required['family'] = [$semantic['family'], $knownFamilies];
    if (array_key_exists('reciprocity', $answers) || array_key_exists('delivery', $answers)) $required['copyleftScope'] = [$semantic['copyleftScope'], $knownScopes];
    if (array_key_exists('patents', $answers)) $required['patentPosition'] = [$semantic['patentPosition'], $knownPatents];
    if (array_key_exists('notices', $answers)) $required['noticeBurden'] = [$semantic['noticeBurden'], $knownNotices];
    if (array_key_exists('projectForm', $answers)) $required['projectForm'] = [$semantic['projectForm'] ?? null, ['library', 'application', 'service', 'plugin']];
    foreach ($required as $field => [$value, $known]) {
        if ($value === null || $value === 'unknown' || (is_array($value) && (!$value || in_array('unknown', $value, true)))) {
            $conflicts[] = "semantic.$field: unknown or missing evidence";
        } elseif (is_string($value) && !in_array($value, $known, true)) {
            $conflicts[] = "semantic.$field: unsupported value";
        }
    }
    $reciprocityScopes = ['none' => 'none', 'file' => 'file', 'library' => 'library', 'strong' => 'whole-work', 'network' => 'network'];
    $deliveryScopes = ['library' => 'library', 'application' => 'whole-work', 'saas' => 'network', 'internal' => 'none'];
    if (array_key_exists('reciprocity', $answers) && $semantic['copyleftScope'] !== ($reciprocityScopes[$answers['reciprocity']] ?? null)) $conflicts[] = "semantic.copyleftScope: required {$reciprocityScopes[$answers['reciprocity']]} is not evidenced";
    if (array_key_exists('delivery', $answers) && $semantic['copyleftScope'] !== ($deliveryScopes[$answers['delivery']] ?? null)) $conflicts[] = "semantic.copyleftScope: required {$deliveryScopes[$answers['delivery']]} is not evidenced";
    if (array_key_exists('projectForm', $answers) && ($semantic['projectForm'] ?? null) !== $answers['projectForm']) $conflicts[] = 'semantic.projectForm: requested project form is not evidenced';
    if (($answers['patents'] ?? null) === 'important' && $semantic['patentPosition'] !== 'express-grant') $conflicts[] = 'semantic.patentPosition: express grant is not evidenced';
    if (($answers['notices'] ?? null) === 'minimal' && !in_array($semantic['noticeBurden'], ['minimal', 'none'], true)) $conflicts[] = 'semantic.noticeBurden: minimal burden is not evidenced';
    if (($answers['notices'] ?? null) === 'standard' && !in_array($semantic['noticeBurden'], ['standard', 'material'], true)) $conflicts[] = 'semantic.noticeBurden: standard burden is not evidenced';
    if (($answers['commercialUse'] ?? null) === 'allowed' && !in_array('commercial-use', $semantic['permissions'], true)) $conflicts[] = 'semantic.permissions: commercial-use permission is not evidenced';
    if (($answers['commercialUse'] ?? null) === 'restricted') $conflicts[] = 'semantic.commercialUse: commercialUse=restricted is not represented by the metadata contract';
    if (array_key_exists('copyleftTrigger', $answers)) {
        $trigger = $answers['copyleftTrigger'] === 'network' ? 'network-use' : ($answers['copyleftTrigger'] === 'distribution' ? 'distribution' : null);
        if ($answers['copyleftTrigger'] === 'none' && $semantic['copyleftScope'] !== 'none') $conflicts[] = 'semantic.copyleftScope: no-copyleft requirement is not met';
        elseif ($trigger !== null && !in_array($trigger, $semantic['triggers'], true)) $conflicts[] = "semantic.triggers: $trigger is not evidenced";
    }
    if (($answers['trademarks'] ?? null) === 'important' && !in_array('trademark', $semantic['restrictions'], true)) $conflicts[] = 'semantic.restrictions: trademark position is not evidenced';
    foreach ([['notices', ['include-notice', 'include-copyright', 'include-license-text']], ['source', ['disclose-source', 'provide-corresponding-source']], ['installation', ['provide-installation-information']]] as [$answer, $values]) {
        if (($answers['obligations'] ?? null) === $answer && !array_intersect($values, $semantic['obligations'])) $conflicts[] = "semantic.obligations: $answer obligation is not evidenced";
    }
    foreach (['versionStrategy', 'dualLicensing', 'futureDistribution'] as $key) if (array_key_exists($key, $answers)) $conflicts[] = "semantic.$key: no validated metadata field exists";
    $match = static function (string $field, int $points, string $reason) use (&$score, &$matched, &$reasons): void { $score += $points; $matched[] = $field; $reasons[] = "$field: $reason"; };
    if (($answers['openness'] ?? null) === 'open' && in_array($semantic['family'], $knownFamilies, true)) $match('family', 10, 'matches openness=open');
    if (($answers['openness'] ?? null) === 'closed' && in_array($semantic['family'], ['permissive', 'public-domain-equivalent'], true)) $match('family', 10, 'matches openness=closed');
    if (array_key_exists('projectForm', $answers) && ($semantic['projectForm'] ?? null) === $answers['projectForm']) $match('projectForm', 10, "matches projectForm={$answers['projectForm']}");
    if (($answers['commercialUse'] ?? null) === 'allowed' && in_array('commercial-use', $semantic['permissions'], true)) $match('permissions', 10, 'matches commercialUse=allowed');
    $reciprocity = ['none' => 'none', 'file' => 'file', 'library' => 'library', 'strong' => 'whole-work', 'network' => 'network'];
    if (array_key_exists('reciprocity', $answers) && ($semantic['copyleftScope'] ?? null) === ($reciprocity[$answers['reciprocity']] ?? null)) $match('copyleftScope', 20, "matches reciprocity={$answers['reciprocity']}");
    $delivery = ['library' => 'library', 'application' => 'whole-work', 'saas' => 'network', 'internal' => 'none'];
    if (array_key_exists('delivery', $answers) && ($semantic['copyleftScope'] ?? null) === ($delivery[$answers['delivery']] ?? null)) $match('copyleftScope', 15, "matches delivery={$answers['delivery']}");
    if (($answers['patents'] ?? null) === 'important' && $semantic['patentPosition'] === 'express-grant') $match('patentPosition', 12, 'matches patents=important');
    if (($answers['patents'] ?? null) === 'neutral' && in_array($semantic['patentPosition'], $knownPatents, true)) $match('patentPosition', 4, 'matches patents=neutral');
    if (($answers['notices'] ?? null) === 'minimal' && in_array($semantic['noticeBurden'], ['minimal', 'none'], true)) $match('noticeBurden', 8, 'matches notices=minimal');
    if (($answers['notices'] ?? null) === 'standard' && in_array($semantic['noticeBurden'], ['standard', 'material'], true)) $match('noticeBurden', 5, 'matches notices=standard');
    $status = $unknowns ? 'insufficient evidence' : 'good fit';
    return ['profile' => ['id' => $record['id'], 'kind' => 'license', 'review' => $metadata['review'], 'sourceFingerprint' => $metadata['sourceFingerprint'], 'semantic' => $semantic, 'evidence' => $metadata['evidence']], 'id' => $record['id'], 'score' => $score, 'reasons' => $reasons ?: ['validated metadata has no distinguishing preference'], 'matchedFields' => $matched, 'status' => $status, 'fit' => $score, 'evidenceConfidence' => $metadata['review']['evidenceLevel'], 'conflicts' => array_values(array_unique($conflicts)), 'unknowns' => $unknowns, 'obligations' => $semantic['obligations'], 'evidence' => $metadata['evidence']];
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
if ($method !== 'OPTIONS' && (str_starts_with($route, 'v1') || $route === 'mcp')) public_limit($route === 'mcp' || $method === 'POST');
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
if ($method === 'POST' && in_array($route, ['v1/recommendations', 'v1/expressions/validate', 'v1/compatibility/check', 'v1/sbom/analyze'], true)) { $value = body(); $result = match ($route) { 'v1/recommendations' => (function () use ($value): array { $input = recommendation_input($value); return canonical_recommendation($input['answers'], $input['mode']); })(), 'v1/expressions/validate' => validate_expression((string)($value['expression'] ?? '')), 'v1/compatibility/check' => compatibility(is_array($value['ids'] ?? null) ? $value['ids'] : [], is_array($value['context'] ?? null) ? $value['context'] : []), 'v1/sbom/analyze' => analyze_sbom($value['document'] ?? $value) }; respond($result, 200, true); }

if ($route === 'mcp' && $method === 'POST') {
    $rpc = body(); $id = $rpc['id'] ?? null; $GLOBALS['mcp_error_id'] = $id; $rpcMethod = $rpc['method'] ?? '';
    $success = fn($value) => respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => $value], 200, true);
    if ($rpcMethod === 'initialize') $success(['protocolVersion' => '2025-03-26', 'capabilities' => ['tools' => (object)[], 'resources' => (object)[]], 'serverInfo' => ['name' => 'licentia', 'version' => API_VERSION], 'instructions' => 'Kanonická data SPDX; doporučení nejsou právní radou.']);
    if ($rpcMethod === 'notifications/initialized') { http_response_code(202); exit; }
    if ($rpcMethod === 'ping') $success((object)[]);
    $tools = [['name' => 'search_licenses', 'description' => 'Vyhledá SPDX licence.', 'inputSchema' => ['type' => 'object', 'properties' => ['query' => ['type' => 'string'], 'limit' => ['type' => 'integer']]]], ['name' => 'get_license', 'description' => 'Vrátí detail a úplné znění licence.', 'inputSchema' => ['type' => 'object', 'required' => ['id'], 'properties' => ['id' => ['type' => 'string'], 'type' => ['enum' => ['license', 'exception']]]]], ['name' => 'compare_licenses', 'description' => 'Orientačně porovná licence.', 'inputSchema' => ['type' => 'object', 'required' => ['ids'], 'properties' => ['ids' => ['type' => 'array', 'items' => ['type' => 'string']]]]], ['name' => 'recommend_license', 'description' => 'Vrátí typovaný, auditovatelný a fail-closed orientační výsledek.', 'inputSchema' => guide_answer_schema()], ['name' => 'validate_spdx_expression', 'description' => 'Ověří SPDX výraz.', 'inputSchema' => ['type' => 'object', 'required' => ['expression'], 'properties' => ['expression' => ['type' => 'string']]]], ['name' => 'analyze_sbom', 'description' => 'Analyzuje licence v SBOM.', 'inputSchema' => ['type' => 'object', 'required' => ['document'], 'properties' => ['document' => (object)[]]]]];
    if ($rpcMethod === 'tools/list') $success(['tools' => $tools]);
    if ($rpcMethod === 'resources/templates/list') $success(['resourceTemplates' => [['uriTemplate' => 'spdx://licenses/{id}', 'name' => 'SPDX licence', 'mimeType' => 'application/json'], ['uriTemplate' => 'spdx://exceptions/{id}', 'name' => 'SPDX výjimka', 'mimeType' => 'application/json']]]);
    if ($rpcMethod === 'resources/read') { if (!preg_match('~^spdx://(licenses|exceptions)/(.+)$~', $rpc['params']['uri'] ?? '', $match)) respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32602, 'message' => 'Neplatné URI']], 400, true); $detail = license_detail(rawurldecode($match[2]), $match[1] === 'licenses' ? 'license' : 'exception'); $success(['contents' => [['uri' => $rpc['params']['uri'], 'mimeType' => 'application/json', 'text' => json_encode(['dataVersion' => DATA_VERSION] + $detail, JSON_UNESCAPED_UNICODE)]]]); }
     if ($rpcMethod === 'tools/call') { $name = $rpc['params']['name'] ?? ''; $rawArgs = $rpc['params']['arguments'] ?? null; if ($name === 'recommend_license' && ($rawArgs !== null && !is_array($rawArgs))) respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32602, 'message' => 'Recommendation arguments must be an object.']], 400, true); $args = is_array($rawArgs) ? $rawArgs : []; $value = match ($name) { 'search_licenses' => ['dataVersion' => DATA_VERSION, 'items' => array_slice(array_values(array_filter(catalog(), fn($item) => !($args['query'] ?? '') || str_contains(strtolower($item['id'] . ' ' . $item['name']), strtolower((string)($args['query']))))), 0, min(200, (int)($args['limit'] ?? 50)))], 'get_license' => ['dataVersion' => DATA_VERSION] + license_detail((string)($args['id'] ?? ''), ($args['type'] ?? 'license') === 'exception' ? 'exception' : 'license'), 'compare_licenses' => compatibility($args['ids'] ?? [], $args['context'] ?? []), 'recommend_license' => (function () use ($args): array { $input = recommendation_input($args, true); return canonical_recommendation($input['answers'], $input['mode']); })(), 'validate_spdx_expression' => validate_expression((string)($args['expression'] ?? '')), 'analyze_sbom' => analyze_sbom($args['document'] ?? []), default => null }; if ($value === null) respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32602, 'message' => 'Unknown tool']], 400, true); $success(['content' => [['type' => 'text', 'text' => json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)]], 'structuredContent' => $value, 'isError' => false]); }
    respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => -32601, 'message' => 'Method not found']], 400, true);
}
if ($route === 'mcp') { header('Allow: POST, OPTIONS'); respond(['error' => 'MCP používá HTTP POST.'], 405, true); }
respond(['error' => 'Endpoint nebyl nalezen.'], 404, str_starts_with($route, 'v1/'));
