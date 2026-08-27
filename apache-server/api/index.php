<?php
declare(strict_types=1);

const DATA_VERSION = '3.28.0';
const API_VERSION = '1.1.0';
const RULE_VERSION = '1.0.0';
const GUIDE_MODEL_VERSION = 'lic-008-guide-v1';

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    http_response_code(503); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    echo json_encode(['error' => 'Server není nakonfigurován. Vytvořte api/config.php podle config.example.php.'], JSON_UNESCAPED_UNICODE); exit;
}
$config = require $configFile;
if (!is_array($config)) {
    http_response_code(503); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    echo json_encode(['error' => 'Neplatná serverová konfigurace.'], JSON_UNESCAPED_UNICODE); exit;
}
$configuredBaseUrl = rtrim((string)($config['base_url'] ?? ''), '/');
$configuredScheme = parse_url($configuredBaseUrl, PHP_URL_SCHEME);
$configuredHost = parse_url($configuredBaseUrl, PHP_URL_HOST);
$configuredPort = parse_url($configuredBaseUrl, PHP_URL_PORT);
$configuredOrigin = $configuredScheme . '://' . $configuredHost . ($configuredPort ? ':' . $configuredPort : '');
$localHost = in_array($configuredHost, ['localhost', '127.0.0.1', '::1'], true);
$sessionPath = (string)($config['session_path'] ?? '');
$dbDsn = (string)($config['db_dsn'] ?? '');
$sqlitePath = str_starts_with($dbDsn, 'sqlite:') ? substr($dbDsn, 7) : null;
$publicRoot = str_replace('\\', '/', (string)(realpath(dirname(__DIR__)) ?: dirname(__DIR__)));
$normalizePath = static function (string $path): ?string {
    $path = str_replace('\\', '/', $path);
    if (!str_starts_with($path, '/') && !preg_match('/^[A-Za-z]:\//', $path)) return null;
    $prefix = str_starts_with($path, '/') ? '/' : strtoupper(substr($path, 0, 2)) . '/';
    $parts = [];
    foreach (explode('/', preg_replace('/^[A-Za-z]:\//', '', ltrim($path, '/'))) as $part) {
        if ($part === '' || $part === '.') continue;
        if ($part === '..') { if (!$parts) return null; array_pop($parts); continue; }
        $parts[] = $part;
    }
    return rtrim($prefix . implode('/', $parts), '/');
};
$normalizedSessionPath = $normalizePath($sessionPath);
$normalizedSqlitePath = $sqlitePath === null ? null : $normalizePath($sqlitePath);
$pathInsidePublicRoot = static fn(?string $path): bool => $path !== null && ($path === $publicRoot || str_starts_with($path . '/', $publicRoot . '/'));
if (!filter_var($configuredBaseUrl, FILTER_VALIDATE_URL) || !in_array($configuredScheme, ['http', 'https'], true) || (!$localHost && $configuredScheme !== 'https') || strlen((string)($config['rate_limit_secret'] ?? '')) < 32 || $normalizedSessionPath === null || $pathInsidePublicRoot($normalizedSessionPath) || $dbDsn === '' || ($sqlitePath !== null && ($normalizedSqlitePath === null || $pathInsidePublicRoot($normalizedSqlitePath)))) {
    http_response_code(503); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    echo json_encode(['error' => 'Neplatná serverová konfigurace: vyžaduje HTTPS, soukromé úložiště mimo webový kořen a dlouhý rate-limit secret.'], JSON_UNESCAPED_UNICODE); exit;
}
$secure = $configuredScheme === 'https';
if (!is_dir($sessionPath)) mkdir($sessionPath, 0700, true);
session_save_path($sessionPath);
session_name('licentia_session');
session_set_cookie_params(['lifetime' => 2592000, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax']);
session_start();
if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

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
    if ($public && route_path() !== 'mcp') header('Access-Control-Allow-Origin: *');
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

function workspace_state(array $value): array {
    if (array_diff(array_keys($value), ['favorites', 'compareIds', 'guideAnswers', 'history', 'baseUpdatedAt', 'updatedAt'])) respond(['error' => 'Pracovní prostor má neplatný formát.'], 422);
    $ids = static function (mixed $input, int $limit): array {
        if (!is_array($input) || count($input) > $limit) respond(['error' => 'Pracovní prostor má neplatný formát.'], 422);
        $result = [];
        foreach ($input as $id) {
            if (!is_string($id) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9.\-]{0,127}$/', $id)) respond(['error' => 'Pracovní prostor obsahuje neplatný SPDX identifikátor.'], 422);
            $result[$id] = true;
        }
        return array_keys($result);
    };
    $allowedAnswers = ['openness', 'reciprocity', 'delivery', 'patents', 'notices', 'jurisdiction', 'projectForm', 'commercialUse', 'proprietary', 'copyleftTrigger', 'trademarks', 'obligations', 'dependencies', 'versionStrategy', 'dualLicensing', 'futureDistribution'];
    $answers = $value['guideAnswers'] ?? null;
    if (!is_array($answers) || array_diff(array_keys($answers), $allowedAnswers)) respond(['error' => 'Pracovní prostor obsahuje neplatné odpovědi průvodce.'], 422);
    foreach ($answers as $answer) if (!is_string($answer) || strlen($answer) > 128) respond(['error' => 'Pracovní prostor obsahuje neplatnou odpověď průvodce.'], 422);
    $history = $value['history'] ?? null;
    if (!is_array($history) || count($history) > 100) respond(['error' => 'Pracovní prostor obsahuje neplatnou historii.'], 422);
    foreach ($history as $entry) {
        if (!is_array($entry) || array_diff(array_keys($entry), ['id', 'kind', 'label', 'createdAt']) || array_diff(['id', 'kind', 'label', 'createdAt'], array_keys($entry))) respond(['error' => 'Pracovní prostor obsahuje neplatnou historii.'], 422);
        if (!is_string($entry['id']) || strlen($entry['id']) > 128 || !in_array($entry['kind'], ['detail', 'guide', 'comparison'], true) || !is_string($entry['label']) || strlen($entry['label']) > 500 || !is_string($entry['createdAt']) || strtotime($entry['createdAt']) === false) respond(['error' => 'Pracovní prostor obsahuje neplatnou položku historie.'], 422);
    }
    return ['favorites' => $ids($value['favorites'] ?? null, 500), 'compareIds' => $ids($value['compareIds'] ?? null, 4), 'guideAnswers' => $answers, 'history' => array_values($history)];
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
    try { return license_detail_value($id, $type); }
    catch (RuntimeException $error) { respond(['error' => $error->getMessage()], 404, true); }
}

function license_detail_value(string $id, string $type): array {
    if (!summary($id, $type)) throw new RuntimeException('Neznámý SPDX identifikátor.');
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

function apply_rate_limit(string $bucket, int $limit, bool $publicResponse): void {
    global $config;
    $now = time(); $window = intdiv($now, 60) * 60;
    try {
        $ip = public_ip();
        if ($ip === 'unknown') throw new RuntimeException('remote address unavailable');
        $key = hash_hmac('sha256', $bucket . ':' . $ip, (string)$config['rate_limit_secret']);
        if (str_starts_with($config['db_dsn'], 'mysql:')) {
            $query = db()->prepare('INSERT INTO public_rate_limit(`key`,window_start,count) VALUES(?,?,1) ON DUPLICATE KEY UPDATE count=IF(public_rate_limit.window_start<>VALUES(window_start),1,public_rate_limit.count+1), window_start=VALUES(window_start)');
        } else {
            $query = db()->prepare('INSERT INTO public_rate_limit(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN public_rate_limit.window_start<>excluded.window_start THEN 1 ELSE public_rate_limit.count+1 END');
        }
        $query->execute([$key, $window]);
        $query = db()->prepare('SELECT window_start,count FROM public_rate_limit WHERE key=?'); $query->execute([$key]); $row = $query->fetch();
        if (!$row || (int)$row['window_start'] !== $window) throw new RuntimeException('rate limiter unavailable');
        header('RateLimit-Limit: ' . $limit); header('RateLimit-Remaining: ' . max(0, $limit - (int)$row['count'])); header('RateLimit-Reset: ' . (string)($window + 60 - $now));
        if ((int)$row['count'] > $limit) { header('Retry-After: ' . (string)($window + 60 - $now)); respond(['error' => 'Příliš mnoho požadavků.'], 429, $publicResponse); }
    } catch (Throwable) { respond(['error' => $publicResponse ? 'Veřejné API je dočasně nedostupné.' : 'Ochrana přihlášení není dostupná.'], 503, $publicResponse); }
}

function public_limit(bool $expensive): void { apply_rate_limit($expensive ? 'public-expensive' : 'public-normal', $expensive ? 20 : 60, true); }
function auth_limit(string $operation): void { apply_rate_limit('auth-' . $operation, $operation === 'login' ? 10 : 5, false); }

function base_url(): string {
    global $configuredBaseUrl;
    return $configuredBaseUrl;
}

function enforce_private_write_request(): void {
    global $configuredOrigin;
    $origin = rtrim((string)($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
    if ($origin === '' || !hash_equals($configuredOrigin, $origin)) respond(['error' => 'Neplatný původ požadavku.'], 403);
    $token = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($token === '' || !hash_equals((string)($_SESSION['csrf_token'] ?? ''), $token)) respond(['error' => 'Neplatný CSRF token.'], 403);
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
    $query = db()->prepare('SELECT id FROM users WHERE provider=? AND provider_id=?'); $query->execute([$provider, $providerId]); $id = $query->fetchColumn();
    if (!$id) {
        $query = db()->prepare('SELECT id FROM users WHERE email=?'); $query->execute([strtolower($email)]);
        if ($query->fetchColumn()) respond(['error' => 'Účet s tímto e-mailem již existuje. Přihlaste se původní metodou a propojení potvrďte v účtu.'], 409);
        $id = uuid(); $insert = db()->prepare('INSERT INTO users(id,email,name,password_hash,provider,provider_id,created_at) VALUES(?,?,?,?,?,?,?)'); $insert->execute([$id, strtolower($email), $name, null, $provider, $providerId, date(DATE_ATOM)]);
    }
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

function guide_questions(): array {
    $uncertain = [['value' => 'unknown', 'label' => 'Nevím'], ['value' => 'not-applicable', 'label' => 'Není relevantní'], ['value' => 'undecided', 'label' => 'Nerozhodnuto']];
    $question = static fn(string $id, string $key, string $mode, string $title, string $help, array $options, ?array $showWhen = null): array => array_filter(['id' => $id, 'key' => $key, 'mode' => $mode, 'title' => $title, 'help' => $help, 'options' => $options, 'showWhen' => $showWhen], static fn($value) => $value !== null);
    $options = static fn(array $values): array => array_merge(array_map(static fn($entry) => ['value' => $entry[0], 'label' => $entry[1]], $values), $uncertain);
    return [
        $question('q-openness', 'openness', 'quick', 'Má zůstat software otevřený?', 'Rozlišuje open-source větev od proprietární strategie.', $options([['open', 'Ano'], ['closed', 'Povolím uzavřené použití']])),
        $question('q-project-form', 'projectForm', 'quick', 'Co distribuujete?', 'Forma projektu určuje relevantní povinnosti.', $options([['application', 'Aplikaci'], ['library', 'Knihovnu'], ['service', 'Službu']])),
        $question('q-reciprocity', 'reciprocity', 'quick', 'Jaký rozsah sdílení změn chcete?', 'Průvodce nabízí rozsahy, pro které má katalog bezpečné kandidáty.', $options([['none', 'Žádný'], ['strong', 'Celé dílo']])),
        $question('q-commercial-use', 'commercialUse', 'quick', 'Bude software komerčně použit?', 'Neznámá odpověď nesmí splnit tvrdou podmínku.', $options([['allowed', 'Ano'], ['restricted', 'Omezeně']])),
        $question('q-delivery-quick', 'delivery', 'quick', 'Jak software dodáte?', 'Distribuce a SaaS aktivují odlišné povinnosti.', $options([['application', 'Aplikace'], ['library', 'Knihovna'], ['saas', 'SaaS'], ['internal', 'Interně']])),
        $question('q-dependencies-quick', 'dependencies', 'quick', 'Jaké máte závislosti?', 'U distribuované aplikace je potřeba ověřit licence závislostí.', $uncertain, ['key' => 'delivery', 'equals' => 'application']),
        $question('q-patents-quick', 'patents', 'quick', 'Jsou důležité patenty?', 'Výslovné oprávnění je kritérium podložené evidencí.', $options([['important', 'Ano'], ['neutral', 'Neřeším']])),
        $question('q-delivery-advanced', 'delivery', 'advanced', 'Jak software dodáte?', 'Distribuce a SaaS aktivují odlišné povinnosti.', $options([['application', 'Aplikace'], ['library', 'Knihovna'], ['saas', 'SaaS'], ['internal', 'Interně']])),
        $question('q-dependencies-advanced', 'dependencies', 'advanced', 'Jaké máte závislosti?', 'SPDX výraz lze ověřit bez tichého přijetí chyby.', $uncertain, ['key' => 'delivery', 'equals' => 'application']),
        $question('q-copyleft-trigger', 'copyleftTrigger', 'advanced', 'Kdy se má povinnost aktivovat?', 'Rozlišuje distribuci od síťového poskytnutí.', $options([['distribution', 'Při distribuci'], ['network', 'I v síti'], ['none', 'Bez copyleftu']])),
        $question('q-openness-advanced', 'openness', 'advanced', 'Má zůstat software otevřený?', 'Rozlišuje open-source větev od proprietární strategie.', $options([['open', 'Ano'], ['closed', 'Povolím uzavřené použití']])),
        $question('q-project-form-advanced', 'projectForm', 'advanced', 'Co distribuujete?', 'Forma projektu určuje relevantní povinnosti.', $options([['application', 'Aplikaci'], ['library', 'Knihovnu'], ['service', 'Službu']])),
        $question('q-reciprocity-advanced', 'reciprocity', 'advanced', 'Jaký rozsah sdílení změn chcete?', 'Průvodce nabízí rozsahy, pro které má katalog bezpečné kandidáty.', $options([['none', 'Žádný'], ['strong', 'Celé dílo']])),
        $question('q-commercial-use-advanced', 'commercialUse', 'advanced', 'Bude software komerčně použit?', 'Neznámá odpověď nesmí splnit tvrdou podmínku.', $options([['allowed', 'Ano'], ['restricted', 'Omezeně']])),
        $question('q-patents-advanced', 'patents', 'advanced', 'Jsou důležité patenty?', 'Posuzuje se patentové oprávnění i obranné ukončení.', $options([['important', 'Ano'], ['neutral', 'Neřeším']])),
        $question('q-notices-advanced', 'notices', 'advanced', 'Jakou zátěž oznámení zvládnete?', 'Rozlišuje minimální, standardní a materiální oznámení.', $options([['minimal', 'Minimum'], ['standard', 'Standard']])),
        $question('q-trademarks', 'trademarks', 'advanced', 'Potřebujete řešit ochranné známky?', 'Licence obvykle neposkytuje práva k ochranným známkám.', $options([['important', 'Ano'], ['neutral', 'Ne']])),
        $question('q-obligations', 'obligations', 'advanced', 'Jaké povinnosti zvládnete?', 'Notices, zdroj a instalační informace se posuzují explicitně.', $options([['minimal', 'Minimum'], ['notices', 'Notices'], ['source', 'Zdroj'], ['installation', 'Zdroj a instalace']])),
    ];
}

function guide_model(?string $mode = null): array {
    if ($mode !== null && !in_array($mode, ['quick', 'advanced'], true)) throw new InvalidArgumentException('Guide mode must be quick or advanced.');
    return ['dataVersion' => DATA_VERSION, 'guideModelVersion' => GUIDE_MODEL_VERSION, 'modes' => ['quick', 'advanced'], 'mode' => $mode, 'questions' => array_values(array_filter(guide_questions(), static fn($question) => $mode === null || $question['mode'] === $mode)), 'stateless' => true, 'advisory' => true];
}

function continue_guide(array $input): array {
    if (array_diff(array_keys($input), ['mode', 'answers'])) throw new InvalidArgumentException('Guide input may contain only mode and answers.');
    $mode = $input['mode'] ?? 'quick';
    if (!in_array($mode, ['quick', 'advanced'], true)) throw new InvalidArgumentException('Guide mode must be quick or advanced.');
    $answers = $input['answers'] ?? [];
    if (!is_array($answers)) throw new InvalidArgumentException('Guide answers must be an object.');
    $questions = array_values(array_filter(guide_questions(), static fn($question) => $question['mode'] === $mode));
    $keys = array_column($questions, 'key');
    $schema = guide_answer_schema()['oneOf'][0]['properties'];
    foreach ($answers as $key => $value) {
        if (!in_array($key, $keys, true)) throw new InvalidArgumentException("answers.$key: field is not part of the $mode guide.");
        if (!is_string($value) || $value === '' || strlen($value) > 4096) throw new InvalidArgumentException("answers.$key: expected a non-empty string up to 4096 characters.");
        if ($key !== 'dependencies' && !in_array($value, $schema[$key]['enum'] ?? [], true)) throw new InvalidArgumentException("answers.$key: invalid value.");
    }
    $active = array_values(array_filter($questions, static fn($question) => !isset($question['showWhen']) || ($answers[$question['showWhen']['key']] ?? null) === $question['showWhen']['equals']));
    $activeKeys = array_column($active, 'key'); $scoped = array_intersect_key($answers, array_flip($activeKeys)); $next = null; $answered = 0;
    foreach ($active as $question) { if (array_key_exists($question['key'], $scoped)) $answered++; elseif ($next === null) $next = $question; }
    $total = count($active); $complete = $next === null;
    return ['dataVersion' => DATA_VERSION, 'guideModelVersion' => GUIDE_MODEL_VERSION, 'mode' => $mode, 'answers' => $scoped ?: (object)[], 'activeQuestions' => $active, 'progress' => ['answered' => $answered, 'total' => $total, 'percent' => $total ? (int)round($answered / $total * 100) : 100], 'complete' => $complete, 'nextQuestion' => $next, 'state' => $complete ? 'complete' : 'awaiting-input', 'recommendation' => $complete ? canonical_recommendation($scoped, $mode) : null, 'advisory' => true];
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
    foreach (guide_questions() as $question) {
        if ($question['mode'] !== $mode) continue;
        if (isset($question['showWhen']) && ($answers[$question['showWhen']['key']] ?? null) !== $question['showWhen']['equals']) continue;
        $key = $question['key'];
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
    if (array_key_exists('reciprocity', $answers)) $required['copyleftScope'] = [$semantic['copyleftScope'], $knownScopes];
    if (array_key_exists('patents', $answers)) $required['patentPosition'] = [$semantic['patentPosition'], $knownPatents];
    if (array_key_exists('notices', $answers)) $required['noticeBurden'] = [$semantic['noticeBurden'], $knownNotices];
    foreach ($required as $field => [$value, $known]) {
        if ($value === null || $value === 'unknown' || (is_array($value) && (!$value || in_array('unknown', $value, true)))) {
            $conflicts[] = "semantic.$field: unknown or missing evidence";
        } elseif (is_string($value) && !in_array($value, $known, true)) {
            $conflicts[] = "semantic.$field: unsupported value";
        }
    }
    $reciprocityScopes = ['none' => 'none', 'file' => 'file', 'library' => 'library', 'strong' => 'whole-work', 'network' => 'network'];
    if (array_key_exists('reciprocity', $answers) && $semantic['copyleftScope'] !== ($reciprocityScopes[$answers['reciprocity']] ?? null)) $conflicts[] = "semantic.copyleftScope: required {$reciprocityScopes[$answers['reciprocity']]} is not evidenced";
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
    if (($answers['commercialUse'] ?? null) === 'allowed' && in_array('commercial-use', $semantic['permissions'], true)) $match('permissions', 10, 'matches commercialUse=allowed');
    $reciprocity = ['none' => 'none', 'file' => 'file', 'library' => 'library', 'strong' => 'whole-work', 'network' => 'network'];
    if (array_key_exists('reciprocity', $answers) && ($semantic['copyleftScope'] ?? null) === ($reciprocity[$answers['reciprocity']] ?? null)) $match('copyleftScope', 20, "matches reciprocity={$answers['reciprocity']}");
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
    $warnings[] = 'Automatická kontrola neprokazuje kompatibilitu licencí; způsob kombinace, distribuce a výjimky musí posoudit člověk.';
    return ['dataVersion' => DATA_VERSION, 'advisory' => true, 'compatible' => 'review', 'licenses' => $items, 'context' => $context, 'warnings' => array_values(array_unique($warnings))];
}

function sbom_license_values(mixed $value, string $key = '', bool $licenseContext = false): array {
    if (is_string($value)) return $licenseContext ? [$value] : [];
    if (!is_array($value)) return [];
    $result = [];
    foreach ($value as $childKey => $child) {
        $normalized = strtolower((string)$childKey);
        $childContext = $licenseContext
            || in_array($normalized, ['license', 'licenses', 'licenseconcluded', 'licensedeclared', 'licenseinfofromfiles', 'licenseinfoinfiles', 'expression', 'licenseexpression'], true);
        if ($licenseContext && in_array($normalized, ['id', 'name', 'expression'], true)) $childContext = true;
        $result = array_merge($result, sbom_license_values($child, (string)$childKey, $childContext));
    }
    return $result;
}

function analyze_sbom(mixed $document): array {
    $raw = implode(' ', sbom_license_values($document)); $found = [];
    foreach (catalog() as $license) if ($license['type'] === 'license' && preg_match('/(^|[^A-Za-z0-9.\-])' . preg_quote($license['id'], '/') . '([^A-Za-z0-9.\-]|$)/', $raw)) $found[] = ['id' => $license['id'], 'name' => $license['name'], 'family' => family($license), 'deprecated' => $license['deprecated']];
    return ['dataVersion' => DATA_VERSION, 'advisory' => true, 'licenseCount' => count($found), 'licenses' => $found, 'warnings' => array_values(array_filter([$found && array_filter($found, fn($item) => $item['deprecated']) ? 'SBOM obsahuje historické SPDX identifikátory.' : null]))];
}

function openapi_document(): array {
    global $configuredBaseUrl;
    $ok = static fn(string $description): array => ['description' => $description, 'content' => ['application/json' => ['schema' => ['type' => 'object']]]];
    $get = static fn(string $summary, string $tag = 'Catalog'): array => ['get' => ['tags' => [$tag], 'summary' => $summary, 'responses' => ['200' => $ok('Successful response')]]];
    $post = static fn(string $summary, string $tag = 'Analysis'): array => ['post' => ['tags' => [$tag], 'summary' => $summary, 'requestBody' => ['required' => true, 'content' => ['application/json' => ['schema' => ['type' => 'object']]]], 'responses' => ['200' => $ok('Successful advisory response'), '400' => $ok('Invalid input'), '429' => $ok('Rate limit exceeded')]]];
    return [
        'openapi' => '3.1.0',
        'info' => ['title' => 'Licentia API', 'version' => API_VERSION, 'description' => 'Read-only SPDX catalog and advisory license tooling. Recommendations are not legal advice.', 'license' => ['name' => 'MIT']],
        'servers' => [['url' => $configuredBaseUrl]],
        'tags' => [['name' => 'Catalog'], ['name' => 'Guide'], ['name' => 'Analysis']],
        'paths' => [
            '/v1' => $get('Discover API capabilities'), '/v1/openapi.json' => $get('OpenAPI 3.1 document'), '/v1/licenses' => $get('Search licenses and exceptions'),
            '/v1/licenses/{id}' => $get('Get license detail'), '/v1/licenses/{id}/text' => $get('Get canonical license text'), '/v1/exceptions/{id}' => $get('Get exception detail'), '/v1/versions' => $get('List data snapshots'),
            '/v1/guide' => $get('Get the versioned guide model', 'Guide') + $post('Start or continue the stateless guide', 'Guide'),
            '/v1/recommendations' => $post('Evaluate explicit requirements directly', 'Guide'), '/v1/expressions/validate' => $post('Validate an SPDX expression'), '/v1/compatibility/check' => $post('Perform an advisory compatibility review'), '/v1/sbom/analyze' => $post('Analyze SPDX or CycloneDX JSON'),
        ],
        'components' => ['schemas' => ['GuideMode' => ['type' => 'string', 'enum' => ['quick', 'advanced']], 'GuideAnswers' => guide_answer_schema()['oneOf'][0], 'GuideRequest' => ['type' => 'object', 'additionalProperties' => false, 'properties' => ['mode' => ['$ref' => '#/components/schemas/GuideMode'], 'answers' => ['$ref' => '#/components/schemas/GuideAnswers']]]]],
    ];
}

function mcp_origin_guard(): void {
    global $config, $configuredOrigin;
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') { header('Access-Control-Allow-Origin: *'); return; }
    $allowed = array_merge([$configuredOrigin], is_array($config['mcp_allowed_origins'] ?? null) ? $config['mcp_allowed_origins'] : []);
    if (!in_array($origin, $allowed, true) || filter_var($origin, FILTER_VALIDATE_URL) === false || rtrim($origin, '/') !== $origin) respond(['jsonrpc' => '2.0', 'id' => null, 'error' => ['code' => -32000, 'message' => 'Forbidden Origin header.']], 403, true);
    header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Vary: Origin');
}

function mcp_error(string|int|null $id, int $code, string $message, int $status = 200, mixed $data = null): never {
    $error = ['code' => $code, 'message' => $message];
    if ($data !== null) $error['data'] = $data;
    respond(['jsonrpc' => '2.0', 'id' => $id, 'error' => $error], $status, true);
}

function mcp_body(): mixed {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 131072) mcp_error(null, -32700, 'Request body is too large.', 413);
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 131072) mcp_error(null, -32700, 'Request body is too large.', 413);
    try { return json_decode($raw, true, 512, JSON_THROW_ON_ERROR); }
    catch (JsonException) { mcp_error(null, -32700, 'Parse error', 400); }
}

function mcp_supported_versions(): array { return ['2025-11-25', '2025-06-18', '2025-03-26']; }

function mcp_tools(string $protocolVersion): array {
    $output = ['type' => 'object', 'additionalProperties' => true];
    $annotations = ['readOnlyHint' => true, 'destructiveHint' => false, 'idempotentHint' => true, 'openWorldHint' => false];
    $directAnswers = guide_answer_schema()['oneOf'][0];
    $definitions = [
        ['name' => 'search_licenses', 'title' => 'Search SPDX licenses', 'description' => 'Search and filter the pinned SPDX license and exception catalog.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'properties' => ['query' => ['type' => 'string', 'maxLength' => 200], 'type' => ['enum' => ['license', 'exception', 'all']], 'osi' => ['type' => 'boolean'], 'fsf' => ['type' => 'boolean'], 'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 200]]]],
        ['name' => 'get_license', 'title' => 'Get an SPDX record', 'description' => 'Return provenance, curated metadata, and complete canonical text.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['id'], 'properties' => ['id' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 128], 'type' => ['enum' => ['license', 'exception']]]]],
        ['name' => 'compare_licenses', 'title' => 'Review a license combination', 'description' => 'Perform an advisory compatibility review that always requires human review.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['ids'], 'properties' => ['ids' => ['type' => 'array', 'minItems' => 2, 'maxItems' => 20, 'items' => ['type' => 'string']], 'context' => ['type' => 'object']]]],
        ['name' => 'start_license_guide', 'title' => 'Start the license guide', 'description' => 'Start the versioned stateless guide and return its first question.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'properties' => ['mode' => ['enum' => ['quick', 'advanced']]]]],
        ['name' => 'continue_license_guide', 'title' => 'Continue the license guide', 'description' => 'Continue with cumulative answers and return progress, the next question, or the final advisory result.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'properties' => ['mode' => ['enum' => ['quick', 'advanced']], 'answers' => $directAnswers]]],
        ['name' => 'recommend_license', 'title' => 'Evaluate explicit requirements', 'description' => 'Evaluate already-known requirements directly; use the guide tools for an interactive flow.', 'inputSchema' => guide_answer_schema()],
        ['name' => 'validate_spdx_expression', 'title' => 'Validate an SPDX expression', 'description' => 'Validate syntax and identifiers against the pinned catalog.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['expression'], 'properties' => ['expression' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 4096]]]],
        ['name' => 'analyze_sbom', 'title' => 'Analyze SBOM licenses', 'description' => 'Extract license identifiers from SPDX or CycloneDX JSON license fields.', 'inputSchema' => ['type' => 'object', 'additionalProperties' => false, 'required' => ['document'], 'properties' => ['document' => (object)[]]]],
    ];
    foreach ($definitions as &$definition) { if ($protocolVersion !== '2025-03-26') $definition['outputSchema'] = $output; $definition['annotations'] = $annotations; }
    unset($definition);
    return $definitions;
}

function mcp_argument_error(string $name, mixed $args): ?string {
    if (!is_array($args)) return 'Tool arguments must be an object.';
    $allowed = match ($name) {
        'search_licenses' => ['query', 'type', 'osi', 'fsf', 'limit'], 'get_license' => ['id', 'type'], 'compare_licenses' => ['ids', 'context'],
        'start_license_guide' => ['mode'], 'continue_license_guide' => ['mode', 'answers'],
        'recommend_license' => array_merge(array_keys(guide_answer_schema()['oneOf'][0]['properties']), ['mode', 'requirements']),
        'validate_spdx_expression' => ['expression'], 'analyze_sbom' => ['document'], default => null,
    };
    if ($allowed === null) return "Unknown tool: $name";
    if (array_diff(array_keys($args), $allowed)) return 'Tool arguments contain an unknown field.';
    if ($name === 'get_license' && (!isset($args['id']) || !is_string($args['id']) || $args['id'] === '' || strlen($args['id']) > 128)) return 'arguments.id is required and must be a string.';
    if ($name === 'compare_licenses' && (!isset($args['ids']) || !is_array($args['ids']) || count($args['ids']) < 2 || count($args['ids']) > 20 || array_filter($args['ids'], static fn($id) => !is_string($id)))) return 'arguments.ids must contain 2 to 20 strings.';
    if ($name === 'validate_spdx_expression' && (!isset($args['expression']) || !is_string($args['expression']) || $args['expression'] === '' || strlen($args['expression']) > 4096)) return 'arguments.expression is required and must be a non-empty string.';
    if ($name === 'analyze_sbom' && !array_key_exists('document', $args)) return 'arguments.document is required.';
    if (isset($args['mode']) && !in_array($args['mode'], ['quick', 'advanced'], true)) return 'arguments.mode must be quick or advanced.';
    if ($name === 'continue_license_guide' && isset($args['answers']) && !is_array($args['answers'])) return 'arguments.answers must be an object.';
    if ($name === 'search_licenses' && (isset($args['query']) && (!is_string($args['query']) || strlen($args['query']) > 200))) return 'arguments.query must be a string up to 200 characters.';
    if ($name === 'search_licenses' && isset($args['limit']) && (!is_int($args['limit']) || $args['limit'] < 1 || $args['limit'] > 200)) return 'arguments.limit must be an integer from 1 to 200.';
    return null;
}

$route = route_path(); $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($route === 'mcp') mcp_origin_guard();
if ($method !== 'OPTIONS' && (str_starts_with($route, 'v1') || $route === 'mcp')) public_limit($route === 'mcp' || $method === 'POST');
if ($method === 'OPTIONS') { $publicCors = str_starts_with($route, 'v1'); if ($publicCors) header('Access-Control-Allow-Origin: *'); elseif ($route !== 'mcp') header('Access-Control-Allow-Origin: ' . $configuredOrigin); header('Access-Control-Allow-Headers: content-type, authorization, mcp-protocol-version, mcp-session-id, last-event-id, x-csrf-token'); header('Access-Control-Allow-Methods: ' . ($route === 'mcp' ? 'POST, OPTIONS' : 'GET, POST, PUT, OPTIONS')); header('Access-Control-Max-Age: 86400'); http_response_code(204); exit; }
if (in_array($method, ['POST', 'PUT', 'DELETE'], true) && !str_starts_with($route, 'v1/') && $route !== 'mcp') enforce_private_write_request();

if ($route === 'api/auth/session') { $current = user(); respond(['user' => $current ? public_user($current) : null, 'csrfToken' => $_SESSION['csrf_token'], 'providers' => ['google' => !empty($config['google_client_id']) && !empty($config['google_client_secret']), 'github' => !empty($config['github_client_id']) && !empty($config['github_client_secret'])]]); }
if ($route === 'api/auth/register' && $method === 'POST') { auth_limit('register'); $value = body(); $email = strtolower(trim((string)($value['email'] ?? ''))); $name = trim((string)($value['name'] ?? '')); $password = (string)($value['password'] ?? ''); if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || strlen($password) < 12 || strlen($password) > 128 || $name === '' || strlen($name) > 255) respond(['error' => 'Vyplňte jméno, platný e-mail a heslo o délce 12 až 128 znaků.'], 422); try { $id = uuid(); $query = db()->prepare('INSERT INTO users(id,email,name,password_hash,provider,provider_id,created_at) VALUES(?,?,?,?,?,?,?)'); $query->execute([$id, $email, $name, password_hash($password, PASSWORD_DEFAULT), 'email', null, date(DATE_ATOM)]); } catch (PDOException) { respond(['error' => 'Registraci se nepodařilo dokončit.'], 409); } $_SESSION['uid'] = $id; session_regenerate_id(true); respond(['ok' => true]); }
if ($route === 'api/auth/login' && $method === 'POST') { auth_limit('login'); $value = body(); $email = strtolower(trim((string)($value['email'] ?? ''))); $password = (string)($value['password'] ?? ''); if (strlen($email) > 254 || strlen($password) > 128) respond(['error' => 'E-mail nebo heslo nesouhlasí.'], 401); $query = db()->prepare('SELECT * FROM users WHERE email=?'); $query->execute([$email]); $found = $query->fetch(); if (!$found || !$found['password_hash'] || !password_verify($password, $found['password_hash'])) respond(['error' => 'E-mail nebo heslo nesouhlasí.'], 401); $_SESSION['uid'] = $found['id']; session_regenerate_id(true); respond(['ok' => true]); }
if ($route === 'api/auth/logout' && $method === 'POST') { $_SESSION = []; session_destroy(); respond(['ok' => true]); }
if (preg_match('~^api/auth/oauth/(google|github)$~', $route, $match)) { $provider = $match[1]; $clientId = $config[$provider . '_client_id'] ?? ''; if (!$clientId) respond(['error' => 'OAuth poskytovatel není nakonfigurován.'], 503); $_SESSION['oauth_state'] = bin2hex(random_bytes(24)); $_SESSION['oauth_provider'] = $provider; $callback = base_url() . '/api/auth/oauth/callback'; $url = $provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(['client_id' => $clientId, 'redirect_uri' => $callback, 'response_type' => 'code', 'scope' => 'openid email profile', 'state' => $_SESSION['oauth_state']]) : 'https://github.com/login/oauth/authorize?' . http_build_query(['client_id' => $clientId, 'redirect_uri' => $callback, 'scope' => 'read:user user:email', 'state' => $_SESSION['oauth_state']]); header('Location: ' . $url); exit; }
if ($route === 'api/auth/oauth/callback') { if (!hash_equals($_SESSION['oauth_state'] ?? '', (string)($_GET['state'] ?? ''))) respond(['error' => 'Neplatný OAuth stav.'], 400); $provider = $_SESSION['oauth_provider'] ?? ''; unset($_SESSION['oauth_state'], $_SESSION['oauth_provider']); $code = (string)($_GET['code'] ?? ''); $callback = base_url() . '/api/auth/oauth/callback'; if ($provider === 'google') { $token = oauth_request('https://oauth2.googleapis.com/token', ['client_id' => $config['google_client_id'], 'client_secret' => $config['google_client_secret'], 'code' => $code, 'grant_type' => 'authorization_code', 'redirect_uri' => $callback]); $profile = oauth_request('https://openidconnect.googleapis.com/v1/userinfo', [], ['Authorization: Bearer ' . $token['access_token'], 'Accept: application/json']); if (($profile['email_verified'] ?? false) !== true) respond(['error' => 'Google účet nemá ověřený e-mail.'], 403); oauth_signin('google', (string)$profile['sub'], (string)$profile['email'], (string)($profile['name'] ?? $profile['email'])); } if ($provider === 'github') { $token = oauth_request('https://github.com/login/oauth/access_token', ['client_id' => $config['github_client_id'], 'client_secret' => $config['github_client_secret'], 'code' => $code, 'redirect_uri' => $callback]); $headers = ['Authorization: Bearer ' . $token['access_token'], 'Accept: application/vnd.github+json', 'User-Agent: Licentia']; $profile = oauth_request('https://api.github.com/user', [], $headers); $email = null; foreach (oauth_request('https://api.github.com/user/emails', [], $headers) as $entry) if (!empty($entry['primary']) && !empty($entry['verified'])) { $email = $entry['email']; break; } if (!$email) respond(['error' => 'GitHub neposkytl ověřený primární e-mail.'], 403); oauth_signin('github', (string)$profile['id'], (string)$email, (string)($profile['name'] ?? $profile['login'])); } respond(['error' => 'Neplatný OAuth poskytovatel.'], 400); }

if ($route === 'api/state') { $current = required_user(); if ($method === 'GET') { $query = db()->prepare('SELECT * FROM user_state WHERE user_id=?'); $query->execute([$current['id']]); $state = $query->fetch(); respond($state ? ['favorites' => json_decode($state['favorites'], true), 'compareIds' => json_decode($state['compare_ids'], true), 'guideAnswers' => json_decode($state['guide_answers'], true), 'history' => json_decode($state['history'], true), 'updatedAt' => $state['updated_at']] : ['favorites' => [], 'compareIds' => [], 'guideAnswers' => (object)[], 'history' => []]); } if ($method === 'PUT') { $value = body(); $workspace = workspace_state($value); $baseUpdatedAt = isset($value['baseUpdatedAt']) && is_string($value['baseUpdatedAt']) ? $value['baseUpdatedAt'] : null; $now = date(DATE_ATOM); $query = db()->prepare('SELECT updated_at FROM user_state WHERE user_id=?'); $query->execute([$current['id']]); $existing = $query->fetchColumn(); $encoded = [json_encode($workspace['favorites']), json_encode($workspace['compareIds']), json_encode($workspace['guideAnswers']), json_encode($workspace['history']), $now]; if ($existing !== false) { if ($baseUpdatedAt === null || !hash_equals((string)$existing, $baseUpdatedAt)) respond(['error' => 'Pracovní prostor byl mezitím změněn na jiném zařízení.', 'updatedAt' => $existing], 409); $query = db()->prepare('UPDATE user_state SET favorites=?,compare_ids=?,guide_answers=?,history=?,updated_at=? WHERE user_id=? AND updated_at=?'); $query->execute([...$encoded, $current['id'], $baseUpdatedAt]); if ($query->rowCount() !== 1) respond(['error' => 'Pracovní prostor byl mezitím změněn na jiném zařízení.'], 409); } else { if ($baseUpdatedAt !== null) respond(['error' => 'Pracovní prostor byl mezitím odstraněn.'], 409); try { $query = db()->prepare('INSERT INTO user_state(user_id,favorites,compare_ids,guide_answers,history,updated_at) VALUES(?,?,?,?,?,?)'); $query->execute([$current['id'], ...$encoded]); } catch (PDOException) { respond(['error' => 'Pracovní prostor byl mezitím vytvořen na jiném zařízení.'], 409); } } respond(['saved' => true, 'updatedAt' => $now]); } }

if ($route === 'v1') respond(['name' => 'Licentia API', 'version' => API_VERSION, 'dataVersion' => DATA_VERSION, 'documentation' => '/v1/openapi.json', 'mcp' => '/mcp', 'endpoints' => ['/v1/openapi.json', '/v1/licenses', '/v1/licenses/{id}', '/v1/licenses/{id}/text', '/v1/exceptions/{id}', '/v1/versions', '/v1/guide', '/v1/recommendations', '/v1/expressions/validate', '/v1/compatibility/check', '/v1/sbom/analyze']], 200, true);
if ($route === 'v1/openapi.json' && $method === 'GET') respond(openapi_document(), 200, true);
if ($route === 'v1/licenses' && $method === 'GET') { $query = strtolower(trim((string)($_GET['q'] ?? ''))); $type = $_GET['type'] ?? null; $items = array_values(array_filter(catalog(), fn($item) => (!$query || str_contains(strtolower($item['id'] . ' ' . $item['name']), $query)) && (!$type || $type === 'all' || $item['type'] === $type) && (!isset($_GET['osi']) || $_GET['osi'] !== 'true' || $item['osi']) && (!isset($_GET['fsf']) || $_GET['fsf'] !== 'true' || $item['fsf']))); $limit = min(200, max(1, (int)($_GET['limit'] ?? 50))); $offset = max(0, (int)($_GET['offset'] ?? 0)); respond(['dataVersion' => DATA_VERSION, 'total' => count($items), 'offset' => $offset, 'limit' => $limit, 'items' => array_slice($items, $offset, $limit)], 200, true); }
if (preg_match('~^v1/(licenses|exceptions)/([^/]+)(/text)?$~', $route, $match) && $method === 'GET') { $type = $match[1] === 'licenses' ? 'license' : 'exception'; $detail = license_detail(rawurldecode($match[2]), $type); if (!empty($match[3])) { header('Content-Type: text/plain; charset=utf-8'); header('Access-Control-Allow-Origin: *'); echo $detail['text']; exit; } respond(['dataVersion' => DATA_VERSION] + $detail, 200, true); }
if ($route === 'v1/versions') respond(['current' => DATA_VERSION, 'versions' => [['version' => DATA_VERSION, 'licenseCount' => 727, 'exceptionCount' => 84, 'source' => 'SPDX License List']]], 200, true);
if ($route === 'v1/snapshots/' . DATA_VERSION) respond(['version' => DATA_VERSION, 'licenseCount' => 727, 'exceptionCount' => 84, 'immutable' => true], 200, true);
if ($route === 'v1/guide' && $method === 'GET') { try { respond(guide_model(isset($_GET['mode']) ? (string)$_GET['mode'] : null), 200, true); } catch (InvalidArgumentException $error) { respond(['error' => $error->getMessage()], 400, true); } }
if ($method === 'POST' && in_array($route, ['v1/guide', 'v1/recommendations', 'v1/expressions/validate', 'v1/compatibility/check', 'v1/sbom/analyze'], true)) { $value = body(); try { $result = match ($route) { 'v1/guide' => continue_guide($value), 'v1/recommendations' => (function () use ($value): array { $input = recommendation_input($value); return canonical_recommendation($input['answers'], $input['mode']); })(), 'v1/expressions/validate' => validate_expression((string)($value['expression'] ?? '')), 'v1/compatibility/check' => compatibility(is_array($value['ids'] ?? null) ? $value['ids'] : [], is_array($value['context'] ?? null) ? $value['context'] : []), 'v1/sbom/analyze' => analyze_sbom($value['document'] ?? $value) }; respond($result, 200, true); } catch (InvalidArgumentException $error) { respond(['error' => $error->getMessage()], 400, true); } }

if ($route === 'mcp' && $method === 'POST') {
    $rpc = mcp_body();
    if (!is_array($rpc) || array_is_list($rpc) || ($rpc['jsonrpc'] ?? null) !== '2.0') mcp_error(null, -32600, 'Invalid JSON-RPC 2.0 envelope.', 400);
    $hasId = array_key_exists('id', $rpc);
    if ($hasId && !is_string($rpc['id']) && !is_int($rpc['id']) && !is_float($rpc['id'])) mcp_error(null, -32600, 'JSON-RPC id must be a string or number.', 400);
    $id = $hasId ? $rpc['id'] : null;
    if (!array_key_exists('method', $rpc)) {
        if ($hasId && (array_key_exists('result', $rpc) || array_key_exists('error', $rpc))) { http_response_code(202); exit; }
        mcp_error(null, -32600, 'Invalid JSON-RPC message.', 400);
    }
    if (!is_string($rpc['method']) || $rpc['method'] === '' || (isset($rpc['params']) && !is_array($rpc['params']))) mcp_error($id, -32600, 'Invalid JSON-RPC request.', 400);
    if (!$hasId) { http_response_code(202); exit; }
    $rpcMethod = $rpc['method']; $params = $rpc['params'] ?? [];

    if ($rpcMethod === 'initialize') {
        $requested = $params['protocolVersion'] ?? null; $supported = mcp_supported_versions();
        $protocolVersion = is_string($requested) && in_array($requested, $supported, true) ? $requested : $supported[0];
        header('MCP-Protocol-Version: ' . $protocolVersion);
        respond(['jsonrpc' => '2.0', 'id' => $id, 'result' => ['protocolVersion' => $protocolVersion, 'capabilities' => ['tools' => ['listChanged' => false], 'resources' => ['subscribe' => false, 'listChanged' => false], 'prompts' => ['listChanged' => false]], 'serverInfo' => ['name' => 'licentia', 'title' => 'Licentia SPDX License Guide', 'version' => API_VERSION], 'instructions' => 'Use start_license_guide and continue_license_guide for interactive selection. Canonical texts come from SPDX; curated metadata is separate; recommendations are advisory and not legal advice.']], 200, true);
    }

    $protocolVersion = (string)($_SERVER['HTTP_MCP_PROTOCOL_VERSION'] ?? '2025-03-26');
    if (!in_array($protocolVersion, mcp_supported_versions(), true)) mcp_error($id, -32602, 'Unsupported MCP protocol version.', 400, ['supported' => mcp_supported_versions()]);
    header('MCP-Protocol-Version: ' . $protocolVersion);
    $success = static fn(mixed $value): never => respond(['jsonrpc' => '2.0', 'id' => $GLOBALS['mcp_response_id'], 'result' => $value], 200, true);
    $GLOBALS['mcp_response_id'] = $id; $GLOBALS['mcp_error_id'] = $id;

    if ($rpcMethod === 'ping') $success((object)[]);
    if ($rpcMethod === 'tools/list') $success(['tools' => mcp_tools($protocolVersion)]);
    if ($rpcMethod === 'resources/list') $success(['resources' => [['uri' => 'licentia://guide/model', 'name' => 'Licentia license guide model', 'description' => 'Versioned quick and advanced guide questions.', 'mimeType' => 'application/json'], ['uri' => 'licentia://api/discovery', 'name' => 'Licentia API discovery', 'description' => 'REST and MCP capability summary.', 'mimeType' => 'application/json']]]);
    if ($rpcMethod === 'resources/templates/list') $success(['resourceTemplates' => [['uriTemplate' => 'spdx://licenses/{id}', 'name' => 'SPDX license', 'description' => 'Canonical license detail from the pinned snapshot.', 'mimeType' => 'application/json'], ['uriTemplate' => 'spdx://exceptions/{id}', 'name' => 'SPDX exception', 'description' => 'Canonical exception detail from the pinned snapshot.', 'mimeType' => 'application/json']]]);
    if ($rpcMethod === 'prompts/list') $success(['prompts' => [['name' => 'choose_license', 'title' => 'Choose a software license', 'description' => 'Guide a user through an advisory license selection.', 'arguments' => [['name' => 'mode', 'description' => 'quick or advanced', 'required' => false]]]]]);
    if ($rpcMethod === 'prompts/get') {
        if (($params['name'] ?? null) !== 'choose_license') mcp_error($id, -32602, 'Unknown prompt.');
        $mode = is_array($params['arguments'] ?? null) ? ($params['arguments']['mode'] ?? null) : null;
        if ($mode !== null && !in_array($mode, ['quick', 'advanced'], true)) mcp_error($id, -32602, 'Prompt mode must be quick or advanced.');
        $success(['description' => 'Interactive, evidence-backed license selection', 'messages' => [['role' => 'user', 'content' => ['type' => 'text', 'text' => 'Start the ' . ($mode ?? 'quick') . ' Licentia guide, ask one returned question at a time, continue with cumulative answers, and label the result as advisory.']]]]);
    }
    if ($rpcMethod === 'resources/read') {
        $uri = is_string($params['uri'] ?? null) ? $params['uri'] : '';
        if ($uri === 'licentia://guide/model') $success(['contents' => [['uri' => $uri, 'mimeType' => 'application/json', 'text' => json_encode(guide_model(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]]]);
        if ($uri === 'licentia://api/discovery') $success(['contents' => [['uri' => $uri, 'mimeType' => 'application/json', 'text' => json_encode(['name' => 'Licentia API', 'version' => API_VERSION, 'dataVersion' => DATA_VERSION, 'rest' => '/v1', 'documentation' => '/v1/openapi.json', 'mcp' => '/mcp', 'guide' => '/v1/guide'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]]]);
        if (!preg_match('~^spdx://(licenses|exceptions)/(.+)$~', $uri, $match)) mcp_error($id, -32602, 'Invalid resource URI.');
        try { $detail = license_detail_value(rawurldecode($match[2]), $match[1] === 'licenses' ? 'license' : 'exception'); }
        catch (Throwable $error) { mcp_error($id, -32602, $error->getMessage()); }
        $success(['contents' => [['uri' => $uri, 'mimeType' => 'application/json', 'text' => json_encode(['dataVersion' => DATA_VERSION] + $detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]]]);
    }
    if ($rpcMethod !== 'tools/call') mcp_error($id, -32601, 'Method not found');

    $name = is_string($params['name'] ?? null) ? $params['name'] : ''; $args = $params['arguments'] ?? [];
    $argumentError = mcp_argument_error($name, $args);
    if ($argumentError !== null) mcp_error($id, -32602, $argumentError, 200, ['errors' => [$argumentError]]);
    try {
        $value = match ($name) {
            'search_licenses' => (function () use ($args): array { $query = strtolower(trim((string)($args['query'] ?? ''))); $type = $args['type'] ?? null; $items = array_values(array_filter(catalog(), static fn($item) => (!$query || str_contains(strtolower($item['id'] . ' ' . $item['name']), $query)) && (!$type || $type === 'all' || $item['type'] === $type) && (!isset($args['osi']) || !$args['osi'] || $item['osi']) && (!isset($args['fsf']) || !$args['fsf'] || $item['fsf']))); $limit = min(200, max(1, (int)($args['limit'] ?? 50))); return ['dataVersion' => DATA_VERSION, 'total' => count($items), 'offset' => 0, 'limit' => $limit, 'items' => array_slice($items, 0, $limit)]; })(),
            'get_license' => ['dataVersion' => DATA_VERSION] + license_detail_value((string)$args['id'], ($args['type'] ?? 'license') === 'exception' ? 'exception' : 'license'),
            'compare_licenses' => compatibility($args['ids'], is_array($args['context'] ?? null) ? $args['context'] : []),
            'start_license_guide' => continue_guide(['mode' => $args['mode'] ?? 'quick', 'answers' => []]),
            'continue_license_guide' => continue_guide($args),
            'recommend_license' => (function () use ($args): array { $input = recommendation_input($args, true); return canonical_recommendation($input['answers'], $input['mode']); })(),
            'validate_spdx_expression' => validate_expression($args['expression']),
            'analyze_sbom' => analyze_sbom($args['document']),
        };
        $success(['content' => [['type' => 'text', 'text' => json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]], 'structuredContent' => $value, 'isError' => false]);
    } catch (Throwable $error) {
        $failure = ['error' => $error->getMessage() ?: 'Tool execution failed.'];
        $success(['content' => [['type' => 'text', 'text' => json_encode($failure, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]], 'structuredContent' => $failure, 'isError' => true]);
    }
}
if ($route === 'mcp') { header('Allow: POST, OPTIONS'); respond(['error' => 'Licentia MCP does not expose an SSE stream; use Streamable HTTP POST.'], 405, true); }
respond(['error' => 'Endpoint nebyl nalezen.'], 404, str_starts_with($route, 'v1/'));
