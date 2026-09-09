<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$tempRoot = sys_get_temp_dir() . '/licentia-apache-contract-' . bin2hex(random_bytes(6));
$process = null;
$pipes = [];
$requestSequence = 0;

function fail_test(string $message): never
{
    fwrite(STDERR, "FAIL: $message\n");
    exit(1);
}

function assert_true(bool $condition, string $message): void
{
    if (!$condition) fail_test($message);
}

function assert_same(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fail_test($message . "\nexpected: " . var_export($expected, true) . "\nactual: " . var_export($actual, true));
    }
}

function request_json(string $baseUrl, string $path, ?array $payload = null, array $extraHeaders = []): array
{
    global $requestSequence;
    $requestSequence++;
    $testIp = '198.51.100.' . (($requestSequence - 1) % 254 + 1);
    $options = ['http' => ['ignore_errors' => true, 'timeout' => 5, 'header' => "X-Test-Client-IP: $testIp\r\n"]];
    foreach ($extraHeaders as $name => $headerValue) $options['http']['header'] .= $name . ': ' . $headerValue . "\r\n";
    if ($payload !== null) {
        $options['http']['method'] = 'POST';
        $options['http']['header'] .= "Content-Type: application/json\r\nAccept: application/json\r\n";
        $options['http']['content'] = json_encode($payload, JSON_THROW_ON_ERROR);
    }
    $context = stream_context_create($options);
    $raw = @file_get_contents($baseUrl . $path, false, $context);
    if ($raw === false) fail_test("HTTP request failed: $path");
    $headers = $http_response_header ?? [];
    $status = 0;
    foreach ($headers as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $match)) {
            $status = (int)$match[1];
            break;
        }
    }
    $body = null;
    try {
        $body = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        global $pipes;
        $serverStderr = [];
        foreach ($pipes as $pipe) {
            if (!is_resource($pipe)) continue;
            stream_set_blocking($pipe, false);
            $serverStderr[] = stream_get_contents($pipe) ?: '';
        }
        fail_test(
            "invalid JSON response for $path (HTTP $status): raw="
            . json_encode(substr($raw, 0, 4000), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            . " stderr="
            . json_encode(implode('', $serverStderr), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            . " error=" . $error->getMessage()
        );
    }
    if (!is_array($body)) fail_test("JSON response for $path is not an object/array");
    return ['status' => $status, 'body' => $body];
}

function canonical_fields(array $result): void
{
    foreach (['dataVersion', 'guideModelVersion', 'guideMode', 'ruleVersion', 'advisory', 'outcome', 'branch', 'candidates', 'alternatives', 'trace', 'conflicts', 'unknowns', 'obligations', 'guidance'] as $field) {
        assert_true(array_key_exists($field, $result), "canonical result is missing $field");
    }
    assert_same(true, $result['advisory'], 'recommendation result must remain advisory');
}

function delete_tree(string $path): void
{
    if (!is_dir($path)) return;
    foreach (scandir($path) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $child = $path . '/' . $entry;
        if (is_dir($child) && !is_link($child)) delete_tree($child);
        else unlink($child);
    }
    rmdir($path);
}

function stop_server(&$process, array &$pipes): void
{
    if (is_resource($process)) {
        proc_terminate($process);
        foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        proc_close($process);
        $process = null;
    }
    $pipes = [];
}

function start_server(string $tempRoot, &$process, array &$pipes, string &$baseUrl): void
{
    $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $port = random_int(18000, 28000);
    $address = "127.0.0.1:$port";
    $extensionDir = (string) ini_get('extension_dir');
    $process = proc_open([PHP_BINARY, '-d', 'extension_dir=' . $extensionDir, '-S', $address, $tempRoot . '/router.php'], $descriptors, $pipes, $tempRoot);
    if (!is_resource($process)) fail_test('could not start PHP built-in server');

    $baseUrl = 'http://' . $address;
    $ready = false;
    for ($attempt = 0; $attempt < 40; $attempt++) {
        usleep(50000);
        $probeContext = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 5, 'header' => "X-Test-Client-IP: 198.51.100.254\r\n"]]);
        $probe = @file_get_contents($baseUrl . '/v1', false, $probeContext);
        if ($probe !== false) { $ready = true; break; }
    }
    assert_true($ready, 'PHP built-in server did not become ready');
}

try {
    mkdir($tempRoot . '/api/var', 0700, true);
    mkdir($tempRoot . '/data', 0700, true);
    copy($root . '/apache-server/api/index.php', $tempRoot . '/api/index.php');
    copy($root . '/apache-server/api/config.example.php', $tempRoot . '/api/config.example.php');
    $testConfig = require $tempRoot . '/api/config.example.php';
    $testConfig['base_url'] = 'http://127.0.0.1';
    $testConfig['db_dsn'] = 'sqlite:' . $tempRoot . '-private/licentia.sqlite';
    $testConfig['session_path'] = $tempRoot . '-private/sessions';
    $testConfig['rate_limit_secret'] = str_repeat('t', 64);
    $testConfig['trusted_proxy'] = true;
    $testConfig['trusted_proxy_header'] = 'HTTP_X_TEST_CLIENT_IP';
    file_put_contents($tempRoot . '/api/config.php', "<?php\nreturn " . var_export($testConfig, true) . ";\n");
    copy($root . '/public/data/catalog.json', $tempRoot . '/data/catalog.json');
    $catalogPath = $tempRoot . '/data/catalog.json';
    $catalogData = json_decode(file_get_contents($catalogPath), true, 512, JSON_THROW_ON_ERROR);
    // The first phase intentionally exercises fail-closed behavior when the
    // catalog contains only legacy source rows without curated metadata.
    foreach ($catalogData as &$catalogEntry) unset($catalogEntry['metadata']);
    unset($catalogEntry);
    $catalogData[] = ['id' => 'LIC-008-deprecated-fixture', 'type' => 'license', 'deprecated' => true, 'metadata' => []];
    $catalogData[] = ['id' => 'LIC-008-exception-fixture', 'type' => 'exception', 'deprecated' => false, 'metadata' => []];
    $catalogData[] = ['id' => 'LIC-008-extra-fixture', 'type' => 'license', 'deprecated' => false, 'metadata' => ['contractVersion' => '1.0.0', 'kind' => 'license', 'id' => 'LIC-008-extra-fixture', 'extra' => true]];
    $catalogData[] = ['id' => 'LIC-008-malformed-fixture', 'type' => 'license', 'deprecated' => false, 'metadata' => ['contractVersion' => '1.0.0', 'kind' => 'license', 'id' => 'LIC-008-malformed-fixture', 'review' => [], 'semantic' => 'invalid', 'sourceFingerprint' => [], 'evidence' => []]];
    file_put_contents($catalogPath, json_encode($catalogData, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    file_put_contents($tempRoot . '/router.php', <<<'PHP_ROUTER'
<?php
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (preg_match('~^/(?:v1(?:/|$)|mcp(?:/|$))~', $path)) require __DIR__ . '/api/index.php';
return false;
PHP_ROUTER
    );

    $baseUrl = '';
    start_server($tempRoot, $process, $pipes, $baseUrl);

    $catalogMissing = request_json($baseUrl, '/v1/recommendations', []);
    assert_same(200, $catalogMissing['status'], 'REST recommendation status');
    canonical_fields($catalogMissing['body']);
    assert_same('no-safe-match', $catalogMissing['body']['outcome'], 'metadata-absent catalog must fail closed');
    assert_same([], $catalogMissing['body']['candidates'], 'legacy summary rows must never become candidates');
    assert_same([], $catalogMissing['body']['alternatives'], 'legacy summary rows must never become alternatives');
    assert_true(in_array('catalog metadata', $catalogMissing['body']['unknowns'], true), 'metadata-absent catalog must expose explicit catalog metadata unknown');
    assert_true(str_contains(implode(' ', $catalogMissing['body']['guidance']), 'metadata'), 'metadata absence guidance');

    foreach ([
        ['invalid-key' => ['unexpected' => 'value']],
        ['malformed-dependency' => ['delivery' => 'application', 'dependencies' => 'MIT OR']],
        ['unknown-dependency' => ['delivery' => 'application', 'dependencies' => 'No-Such-License']],
    ] as $case) {
        $label = array_key_first($case);
        $result = request_json($baseUrl, '/v1/recommendations', $case[$label]);
        canonical_fields($result['body']);
        assert_same('no-safe-match', $result['body']['outcome'], "$label outcome");
        assert_same([], $result['body']['candidates'], "$label candidates");
        assert_same([], $result['body']['alternatives'], "$label alternatives");
    }

    $proprietary = request_json($baseUrl, '/v1/recommendations', ['proprietary' => 'required']);
    canonical_fields($proprietary['body']);
    assert_same('source-available-or-proprietary', $proprietary['body']['branch'], 'proprietary branch must be separate');
    assert_same('no-safe-match', $proprietary['body']['outcome'], 'proprietary branch without validated metadata remains fail closed');
    assert_true(str_contains(implode(' ', $proprietary['body']['guidance']), 'open-source'), 'proprietary branch guidance');

    $validExpression = request_json($baseUrl, '/v1/expressions/validate', ['expression' => 'MIT OR Apache-2.0']);
    assert_same(true, $validExpression['body']['valid'], 'ordinary real catalog IDs must remain valid');
    $validWith = request_json($baseUrl, '/v1/expressions/validate', ['expression' => 'MIT WITH Autoconf-exception-2.0']);
    assert_same(true, $validWith['body']['valid'], 'exception must be valid after WITH');
    $bareException = request_json($baseUrl, '/v1/expressions/validate', ['expression' => 'Autoconf-exception-2.0']);
    assert_same(false, $bareException['body']['valid'], 'bare exception must fail closed');
    $repeatedWith = request_json($baseUrl, '/v1/expressions/validate', ['expression' => 'MIT WITH Autoconf-exception-2.0 WITH Autoconf-exception-2.0']);
    assert_same(false, $repeatedWith['body']['valid'], 'repeated WITH must fail closed');

    stop_server($process, $pipes);
    $catalogData[] = [
        'id' => 'LIC-008-synthetic-fixture',
        'type' => 'license',
        'deprecated' => false,
        'metadata' => [
            'contractVersion' => '1.0.0',
            'kind' => 'license',
            'id' => 'LIC-008-synthetic-fixture',
            'review' => ['status' => 'reviewed', 'recommendable' => true, 'evidenceLevel' => 'sufficient'],
            'semantic' => [
                'family' => 'permissive',
                'copyleftScope' => 'none',
                'permissions' => ['commercial-use', 'distribution', 'modifications', 'patent-grant'],
                'obligations' => ['include-copyright', 'include-license-text'],
                'triggers' => ['distribution', 'modification'],
                'restrictions' => ['liability', 'warranty'],
                'patentPosition' => 'express-grant',
                'noticeBurden' => 'standard',
                'projectForm' => 'library',
            ],
            'sourceFingerprint' => ['sourceId' => 'spdx-license-list', 'revision' => '2026-08-24', 'contentHash' => 'sha256:lic-008'],
            'evidence' => array_map(static fn(string $field): array => ['field' => $field, 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'], ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden', 'review']),
        ],
    ];
    file_put_contents($catalogPath, json_encode($catalogData, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    start_server($tempRoot, $process, $pipes, $baseUrl);

    $fixtureRecommendation = request_json($baseUrl, '/v1/recommendations', ['openness' => 'open', 'patents' => 'important', 'notices' => 'standard']);
    assert_same(200, $fixtureRecommendation['status'], 'synthetic recommendation status');
    canonical_fields($fixtureRecommendation['body']);
    assert_same('recommendation', $fixtureRecommendation['body']['outcome'], 'synthetic fixture recommendation outcome');
    assert_same('LIC-008-synthetic-fixture', $fixtureRecommendation['body']['candidates'][0]['id'] ?? null, 'synthetic fixture candidate id');
    assert_same(100, $fixtureRecommendation['body']['candidates'][0]['score'] ?? null, 'TypeScript-parity synthetic fixture percentage score');
    assert_same(['family', 'patentPosition', 'noticeBurden'], $fixtureRecommendation['body']['candidates'][0]['matchedFields'] ?? null, 'TypeScript-parity matched fields');
    assert_true(in_array('dependency-analysis=not-requested', $fixtureRecommendation['body']['trace'], true), 'canonical trace must include dependency analysis');
    foreach ([
        ['invalid-key' => ['unexpected' => 'value']],
        ['missing-dependency' => ['delivery' => 'application']],
        ['malformed-dependency' => ['delivery' => 'application', 'dependencies' => 'MIT OR']],
        ['unknown-dependency' => ['delivery' => 'application', 'dependencies' => 'No-Such-License']],
    ] as $case) {
        $label = array_key_first($case);
        $result = request_json($baseUrl, '/v1/recommendations', $case[$label]);
        canonical_fields($result['body']);
        assert_same('no-safe-match', $result['body']['outcome'], "$label outcome with synthetic metadata");
        assert_same([], $result['body']['candidates'], "$label candidates with synthetic metadata");
        assert_same([], $result['body']['alternatives'], "$label alternatives with synthetic metadata");
        assert_true($result['body']['conflicts'] !== [] || $result['body']['unknowns'] !== [], "$label must expose canonical conflict/unknown semantics");
        if ($label === 'missing-dependency') assert_same('dependencies', $result['body']['nextQuestion'] ?? null, 'quick mode must request dependencies for application delivery');
    }

    foreach (['unknown', 'not-applicable'] as $uncertainty) {
        $result = request_json($baseUrl, '/v1/recommendations', ['openness' => $uncertainty]);
        canonical_fields($result['body']);
        assert_same('insufficient-evidence', $result['body']['outcome'], "$uncertainty must continue to scored candidates");
        assert_same('LIC-008-synthetic-fixture', $result['body']['candidates'][0]['id'] ?? null, "$uncertainty candidate id");
        assert_same(0, $result['body']['candidates'][0]['score'] ?? null, "$uncertainty candidate score");
        assert_same('review required', $result['body']['candidates'][0]['status'] ?? null, "$uncertainty candidate status");
    }

    foreach ([
        ['proprietary' => 'required'],
        ['commercialUse' => 'restricted'],
    ] as $comparisonAnswers) {
        $result = request_json($baseUrl, '/v1/recommendations', $comparisonAnswers);
        canonical_fields($result['body']);
        $label = json_encode($comparisonAnswers, JSON_UNESCAPED_UNICODE);
        assert_same('insufficient-evidence', $result['body']['outcome'], "valid conflicting intent must still return a scored candidate: $label");
        assert_same('LIC-008-synthetic-fixture', $result['body']['candidates'][0]['id'] ?? null, "valid conflicting intent candidate id: $label");
        assert_same(0, $result['body']['candidates'][0]['score'] ?? null, "valid conflicting intent candidate score: $label");
        assert_same('review required', $result['body']['candidates'][0]['status'] ?? null, "valid conflicting intent candidate status: $label");
        assert_true($result['body']['candidates'][0]['conflicts'] !== [], "valid conflicting intent must expose a deficit: $label");
    }

    $mismatchedProjectForm = request_json($baseUrl, '/v1/recommendations', ['projectForm' => 'application']);
    assert_same('insufficient-evidence', $mismatchedProjectForm['body']['outcome'], 'project form is context and does not create a scored requirement');
    assert_same('LIC-008-synthetic-fixture', $mismatchedProjectForm['body']['candidates'][0]['id'] ?? null, 'project form must not exclude an otherwise eligible license');

    $catalogWithFixture = request_json($baseUrl, '/v1/recommendations', []);
    assert_same('insufficient-evidence', $catalogWithFixture['body']['outcome'], 'empty valid answers should show the synthetic metadata fixture with zero score');

    $mcpTools = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list']);
    $recommendTool = null;
    foreach ($mcpTools['body']['result']['tools'] ?? [] as $tool) if (($tool['name'] ?? '') === 'recommend_license') $recommendTool = $tool;
    assert_true(is_array($recommendTool), 'MCP recommend_license tool must be listed');
    $schema = $recommendTool['inputSchema'];
    assert_true(isset($schema['oneOf']) && count($schema['oneOf']) === 2, 'MCP recommendation schema must expose direct and envelope forms');
    $schemaProperties = array_keys($schema['oneOf'][0]['properties'] ?? []);
    sort($schemaProperties);
    $expectedProperties = ['openness', 'reciprocity', 'delivery', 'patents', 'advertising', 'notices', 'jurisdiction', 'projectForm', 'commercialUse', 'proprietary', 'copyleftTrigger', 'trademarks', 'obligations', 'dependencies', 'versionStrategy', 'dualLicensing', 'futureDistribution'];
    sort($expectedProperties);
    assert_same($expectedProperties, $schemaProperties, 'MCP recommendation schema must expose the complete guide answer model');
    assert_same(false, $schema['oneOf'][0]['additionalProperties'] ?? null, 'MCP direct recommendation schema must reject unknown keys');
    assert_same(false, $schema['oneOf'][1]['additionalProperties'] ?? null, 'MCP envelope recommendation schema must reject unknown keys');

    $mcpRecommendation = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 2, 'method' => 'tools/call', 'params' => ['name' => 'recommend_license', 'arguments' => []]]);
    $mcpResult = $mcpRecommendation['body']['result']['structuredContent'] ?? null;
    assert_true(is_array($mcpResult), 'MCP must expose structured canonical recommendation content');
    canonical_fields($mcpResult);
    assert_same($catalogWithFixture['body'], $mcpResult, 'REST and MCP recommendation result contracts must match');

    $guideModel = request_json($baseUrl, '/v1/guide?mode=quick');
    assert_same(200, $guideModel['status'], 'guide model status');
    assert_same('lic-008-guide-v6', $guideModel['body']['guideModelVersion'] ?? null, 'guide model version');
    foreach ($guideModel['body']['questions'] as $question) {
        if ($question['key'] === 'reciprocity') {
            assert_same(true, in_array('file', array_column($question['options'], 'value'), true), 'file copyleft must be selectable in both modes');
            assert_same(true, in_array('library', array_column($question['options'], 'value'), true), 'library copyleft must be selectable in both modes');
        }
    }
    assert_true(count($guideModel['body']['questions'] ?? []) >= 6, 'quick guide questions must be discoverable');
    $openApi = request_json($baseUrl, '/v1/openapi.json');
    assert_same('3.1.0', $openApi['body']['openapi'] ?? null, 'Apache OpenAPI document version');
    assert_true(isset($openApi['body']['paths']['/v1/guide']['get'], $openApi['body']['paths']['/v1/guide']['post']), 'Apache OpenAPI guide operations');
    $guideStart = request_json($baseUrl, '/v1/guide', ['mode' => 'quick', 'answers' => []]);
    assert_same('awaiting-input', $guideStart['body']['state'] ?? null, 'REST guide starts without server state');
    assert_same('openness', $guideStart['body']['nextQuestion']['key'] ?? null, 'REST guide first question');
    $guideComplete = request_json($baseUrl, '/v1/guide', ['mode' => 'quick', 'answers' => ['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'internal', 'patents' => 'neutral', 'advertising' => 'allowed']]);
    assert_same('complete', $guideComplete['body']['state'] ?? null, 'REST guide completion');
    canonical_fields($guideComplete['body']['recommendation']);

    $initialize = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 20, 'method' => 'initialize', 'params' => ['protocolVersion' => '2025-11-25', 'capabilities' => [], 'clientInfo' => ['name' => 'contract-test', 'version' => '1.0']]]);
    assert_same('2025-11-25', $initialize['body']['result']['protocolVersion'] ?? null, 'MCP protocol negotiation');
    $protocolHeaders = ['MCP-Protocol-Version' => '2025-11-25'];
    $modernTools = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 21, 'method' => 'tools/list'], $protocolHeaders);
    $toolNames = array_column($modernTools['body']['result']['tools'] ?? [], 'name');
    assert_true(in_array('start_license_guide', $toolNames, true), 'MCP start guide tool');
    assert_true(in_array('continue_license_guide', $toolNames, true), 'MCP continue guide tool');
    $firstModernTool = $modernTools['body']['result']['tools'][0] ?? [];
    assert_true(isset($firstModernTool['outputSchema'], $firstModernTool['annotations']), 'modern MCP tool metadata');
    $mcpGuideStart = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 22, 'method' => 'tools/call', 'params' => ['name' => 'start_license_guide', 'arguments' => ['mode' => 'quick']]], $protocolHeaders);
    assert_same('openness', $mcpGuideStart['body']['result']['structuredContent']['nextQuestion']['key'] ?? null, 'MCP guide first question');
    $resources = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 23, 'method' => 'resources/list'], $protocolHeaders);
    assert_true(in_array('licentia://guide/model', array_column($resources['body']['result']['resources'] ?? [], 'uri'), true), 'MCP guide resource');
    $prompts = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 24, 'method' => 'prompts/list'], $protocolHeaders);
    assert_true(in_array('choose_license', array_column($prompts['body']['result']['prompts'] ?? [], 'name'), true), 'MCP guide prompt');
    $forbiddenOrigin = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 25, 'method' => 'ping'], ['Origin' => 'https://evil.example']);
    assert_same(403, $forbiddenOrigin['status'], 'MCP rejects untrusted browser origins');

    $generatedFixture = [
        'id' => 'LIC-008-generated-fixture',
        'name' => 'Generated envelope fixture',
        'type' => 'license',
        'deprecated' => false,
        'osi' => true,
        'fsf' => true,
        'profiled' => true,
        'permissions' => ['commercial-use', 'distribution', 'modifications', 'patent-grant'],
        'conditions' => [],
        'limitations' => [],
        'metadata' => [
            'contractVersion' => '1.0.0',
            'kind' => 'license',
            'id' => 'LIC-008-generated-fixture',
            'review' => ['status' => 'reviewed', 'recommendable' => true, 'evidenceLevel' => 'sufficient'],
            'semantic' => [
                'family' => 'permissive',
                'copyleftScope' => 'none',
                'permissions' => ['commercial-use', 'distribution', 'modifications', 'patent-grant'],
                'obligations' => ['include-copyright', 'include-license-text'],
                'triggers' => ['distribution', 'modification'],
                'restrictions' => ['liability', 'warranty'],
                'patentPosition' => 'express-grant',
                'noticeBurden' => 'minimal',
                'projectForm' => 'application',
            ],
            'sourceFingerprint' => ['sourceId' => 'spdx-license-list', 'revision' => '2026-08-24', 'contentHash' => 'sha256:lic-008-generated'],
            'evidence' => array_map(static fn(string $field): array => ['field' => $field, 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'], ['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden', 'review', 'projectForm']),
        ],
    ];
    $catalogData[] = $generatedFixture;
    stop_server($process, $pipes);
    file_put_contents($catalogPath, json_encode($catalogData, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    start_server($tempRoot, $process, $pipes, $baseUrl);

    $generatedRecommendation = request_json($baseUrl, '/v1/recommendations', [
        'openness' => 'open',
        'projectForm' => 'application',
        'commercialUse' => 'allowed',
        'patents' => 'important',
        'notices' => 'minimal',
    ]);
    assert_same(200, $generatedRecommendation['status'], 'generated envelope recommendation status');
    canonical_fields($generatedRecommendation['body']);
    assert_same('recommendation', $generatedRecommendation['body']['outcome'], 'generated envelope recommendation outcome');
    $generatedCandidates = $generatedRecommendation['body']['candidates'];
    assert_same(2, count($generatedCandidates), 'generated envelope must rank all metadata-ready candidates');
    assert_same(['LIC-008-generated-fixture', 'LIC-008-synthetic-fixture'], array_column($generatedCandidates, 'id'), 'generated envelope candidate ranking');
    assert_same(100, $generatedCandidates[0]['score'] ?? null, 'generated envelope best candidate percentage score');
    assert_same([], $generatedCandidates[0]['conflicts'] ?? null, 'best candidate must have no conflicts');
    assert_same([], $generatedCandidates[0]['unknowns'] ?? null, 'best candidate must have no deficits');
    assert_same('review required', $generatedCandidates[1]['status'] ?? null, 'deficit candidate status');
    assert_same(['semantic.noticeBurden: minimal burden is not evidenced'], $generatedCandidates[1]['conflicts'] ?? null, 'deficit candidate conflicts');
    assert_same([], $generatedCandidates[1]['unknowns'] ?? null, 'deficit candidate must not report unknown metadata');
    assert_same([], $generatedRecommendation['body']['alternatives'], 'all ranked fixtures fit within candidate limit');
    foreach (['LIC-008-deprecated-fixture', 'LIC-008-exception-fixture', 'LIC-008-extra-fixture', 'LIC-008-malformed-fixture'] as $excludedId) {
        assert_true(!in_array($excludedId, array_column($generatedCandidates, 'id'), true), "$excludedId must remain excluded");
    }
    assert_same('reciprocity', $generatedRecommendation['body']['nextQuestion'] ?? null, 'generated envelope must preserve TypeScript default quick nextQuestion');

    $quickQuestionCases = [
        [[], 'openness'],
        [['openness' => 'open'], 'projectForm'],
        [['openness' => 'open', 'projectForm' => 'application'], 'reciprocity'],
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none'], 'commercialUse'],
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed'], 'delivery'],
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'library'], 'patents'],
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'library', 'patents' => 'important'], 'advertising'],
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'library', 'patents' => 'important', 'advertising' => 'allowed'], null],
        [['delivery' => 'application'], 'dependencies'],
    ];
    foreach ($quickQuestionCases as [$answers, $expectedQuestion]) {
        $quickResult = request_json($baseUrl, '/v1/recommendations', $answers);
        canonical_fields($quickResult['body']);
        if ($expectedQuestion === null) {
            assert_true(!array_key_exists('nextQuestion', $quickResult['body']), 'answered quick questions must omit nextQuestion');
        } else {
            assert_same($expectedQuestion, $quickResult['body']['nextQuestion'] ?? null, "canonical quick nextQuestion for " . json_encode($answers));
        }
    }

    $advancedEnvelope = request_json($baseUrl, '/v1/recommendations', ['mode' => 'advanced', 'requirements' => ['delivery' => 'application']]);
    assert_same(200, $advancedEnvelope['status'], 'advanced envelope status');
    canonical_fields($advancedEnvelope['body']);
    assert_same('lic-008-guide-v6', $advancedEnvelope['body']['guideModelVersion'] ?? null, 'advanced guide model version');
    assert_same('advanced', $advancedEnvelope['body']['guideMode'] ?? null, 'advanced guide mode');
    assert_same('dependencies', $advancedEnvelope['body']['nextQuestion'] ?? null, 'advanced dependency next question');

    $unknownOuter = request_json($baseUrl, '/v1/recommendations', ['mode' => 'advanced', 'requirements' => [], 'unexpected' => true]);
    assert_same(400, $unknownOuter['status'], 'unknown outer recommendation key must be rejected');

    $advancedMcp = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 3, 'method' => 'tools/call', 'params' => ['name' => 'recommend_license', 'arguments' => ['mode' => 'advanced', 'requirements' => ['delivery' => 'application']]]]);
    $advancedMcpResult = $advancedMcp['body']['result']['structuredContent'] ?? null;
    assert_same($advancedEnvelope['body'], $advancedMcpResult, 'advanced REST and MCP result contracts must match');

    $invalidMcpEnvelope = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 4, 'method' => 'tools/call', 'params' => ['name' => 'recommend_license', 'arguments' => ['mode' => 'advanced', 'requirements' => [], 'unexpected' => true]]]);
    assert_same(200, $invalidMcpEnvelope['status'], 'valid JSON-RPC transport returns protocol errors in a JSON-RPC response');
    assert_same(-32602, $invalidMcpEnvelope['body']['error']['code'] ?? null, 'invalid MCP recommendation envelope must use invalid params');

    $nonObjectMcpArguments = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 5, 'method' => 'tools/call', 'params' => ['name' => 'recommend_license', 'arguments' => 'invalid']]);
    assert_same(200, $nonObjectMcpArguments['status'], 'non-object MCP arguments return a JSON-RPC protocol error');
    assert_same(-32602, $nonObjectMcpArguments['body']['error']['code'] ?? null, 'non-object MCP recommendation arguments must use invalid params');

    $malformedGenerated = $generatedFixture;
    $malformedGenerated['permissions'] = ['commercial-use', 7];
    $emptyNameGenerated = $generatedFixture;
    $emptyNameGenerated['name'] = '  ';
    $coercibleBooleanGenerated = $generatedFixture;
    $coercibleBooleanGenerated['osi'] = 'true';
    $malformedGeneratedCases = [
        ['malformed-generated-permissions', $malformedGenerated],
        ['empty-generated-name', $emptyNameGenerated],
        ['coercible-generated-boolean', $coercibleBooleanGenerated],
    ];
    $unknownGenerated = $generatedFixture;
    $unknownGenerated['unexpected'] = true;
    $malformedGeneratedCases[] = ['unknown-generated-extension', $unknownGenerated];
    foreach (['family', 'copyleftScope', 'permissions', 'obligations', 'triggers', 'restrictions', 'patentPosition', 'noticeBurden', 'review'] as $field) {
        $missingEvidence = $generatedFixture;
        $missingEvidence['metadata']['evidence'] = array_values(array_filter($missingEvidence['metadata']['evidence'], static fn(array $entry): bool => $entry['field'] !== $field));
        $malformedGeneratedCases[] = ["missing-$field-evidence", $missingEvidence];
        if ($field === 'review') continue;
        $unknownSemantic = $generatedFixture;
        $unknownSemantic['metadata']['semantic'][$field] = is_array($unknownSemantic['metadata']['semantic'][$field]) ? ['unknown'] : 'unknown';
        $malformedGeneratedCases[] = ["recommendable-with-unknown-$field", $unknownSemantic];
    }
    foreach ($malformedGeneratedCases as [$label, $record]) {
        stop_server($process, $pipes);
        file_put_contents($catalogPath, json_encode([$record], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
        start_server($tempRoot, $process, $pipes, $baseUrl);
        $invalidGenerated = request_json($baseUrl, '/v1/recommendations', [
            'openness' => 'open',
            'projectForm' => 'application',
            'commercialUse' => 'allowed',
            'patents' => 'important',
            'notices' => 'minimal',
        ]);
        canonical_fields($invalidGenerated['body']);
        assert_same('no-safe-match', $invalidGenerated['body']['outcome'], "$label outcome");
        assert_same([], $invalidGenerated['body']['candidates'], "$label candidates");
        assert_same([], $invalidGenerated['body']['alternatives'], "$label alternatives");
    }

    // Exercise the shipped LGPL metadata through the same HTTP boundary as the UI.
    stop_server($process, $pipes);
    $realCatalog = json_decode(file_get_contents($root . '/public/data/catalog.json'), true, 512, JSON_THROW_ON_ERROR);
    file_put_contents($catalogPath, json_encode($realCatalog, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    start_server($tempRoot, $process, $pipes, $baseUrl);
    $expectedFamilies = ['IPL-1.0' => 'Slabý copyleft', 'CPL-1.0' => 'Slabý copyleft', 'MPEG-SSG' => 'Nestandardní', 'Knuth-CTAN' => 'Nestandardní', 'MIT-0' => 'Maximálně volná', 'MPL-2.0' => 'Souborový copyleft', 'LGPL-2.1-only' => 'Knihovní copyleft', 'AGPL-3.0-only' => 'Síťový copyleft', 'GPL-2.0' => 'Silný copyleft'];
    $familyResult = request_json($baseUrl, '/v1/compatibility/check', ['ids' => array_keys($expectedFamilies)]);
    assert_same(200, $familyResult['status'], 'curated catalog families HTTP status');
    assert_same('review', $familyResult['body']['compatible'], 'family labels do not prove compatibility');
    foreach ($familyResult['body']['licenses'] as $item) assert_same($expectedFamilies[$item['id']], $item['family'], $item['id'] . ' curated family survives PHP catalog display');
    assert_same(count($expectedFamilies), count($familyResult['body']['licenses']), 'all family scenarios are returned');
    $lgplIds = ['LGPL-2.0-only', 'LGPL-2.0-or-later', 'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later'];
    foreach (['quick', 'advanced'] as $mode) {
        $requirements = ['openness' => 'open', 'projectForm' => 'library', 'reciprocity' => 'library', 'commercialUse' => 'allowed', 'delivery' => 'library', 'patents' => 'neutral'];
        $libraryResult = request_json($baseUrl, '/v1/recommendations', ['mode' => $mode, 'requirements' => $requirements]);
        assert_same(200, $libraryResult['status'], "$mode LGPL status");
        $goodFits = array_values(array_filter(array_merge($libraryResult['body']['candidates'], $libraryResult['body']['alternatives']), fn($candidate) => $candidate['status'] === 'good fit'));
        assert_same($lgplIds, array_values(array_intersect(array_column($goodFits, 'id'), $lgplIds)), "$mode LGPL good fits remain available as the catalog grows");
        foreach ($goodFits as $candidate) {
            if (!in_array($candidate['id'], $lgplIds, true)) continue;
            assert_same('good fit', $candidate['status'], "$mode LGPL candidate status");
            assert_true(in_array('allow-relinking', $candidate['obligations'], true), 'LGPL relinking survives the PHP metadata gate');
            assert_true(in_array('allow-reverse-engineering', $candidate['obligations'], true), 'LGPL reverse engineering survives the PHP metadata gate');
        }
        $requirements['patents'] = 'important';
        $patentResult = request_json($baseUrl, '/v1/recommendations', ['mode' => $mode, 'requirements' => $requirements]);
        $patentFits = array_values(array_filter(array_merge($patentResult['body']['candidates'], $patentResult['body']['alternatives']), fn($candidate) => $candidate['status'] === 'good fit'));
        assert_same(array_slice($lgplIds, 4), array_values(array_intersect(array_column($patentFits, 'id'), $lgplIds)), "$mode LGPL patent version distinction");
        foreach (array_merge($patentResult['body']['candidates'], $patentResult['body']['alternatives']) as $candidate) {
            if (!str_starts_with($candidate['id'], 'LGPL-2.')) continue;
            assert_same('review required', $candidate['status'], 'LGPL 2.x has a patent deficit');
            assert_true(str_contains(implode(' ', $candidate['conflicts']), 'patent'), 'LGPL 2.x exposes its patent deficit');
        }
    }
    // Verify network profiles, conditional duties and patent requirements through HTTP.
    foreach (['quick', 'advanced'] as $mode) {
        $requirements = ['openness' => 'open', 'projectForm' => 'service', 'delivery' => 'saas', 'reciprocity' => 'network', 'patents' => 'important', 'commercialUse' => 'allowed'];
        if ($mode === 'advanced') $requirements['copyleftTrigger'] = 'network';
        $network = request_json($baseUrl, '/v1/recommendations', ['mode' => $mode, 'requirements' => $requirements]);
        $fits = array_values(array_filter(array_merge($network['body']['candidates'], $network['body']['alternatives']), fn($candidate) => $candidate['status'] === 'good fit'));
        foreach (['AGPL-3.0-only', 'AGPL-3.0-or-later', 'EUPL-1.2'] as $id) assert_true(in_array($id, array_column($fits, 'id'), true), "$mode $id network choice remains available");
        foreach ($fits as $candidate) {
            assert_true(in_array('network-use-disclose', $candidate['obligations'], true), 'network source duty survives PHP gate');
            if (str_starts_with($candidate['id'], 'AGPL-')) assert_true(in_array('preserve-combined-license-terms', $candidate['obligations'], true), 'AGPL split terms survive PHP gate');
        }
        $patent = request_json($baseUrl, '/v1/recommendations', ['mode' => $mode, 'requirements' => ['openness' => 'open', 'patents' => 'important']]);
        $all = array_merge($patent['body']['candidates'], $patent['body']['alternatives']);
        $ucar = array_values(array_filter($all, fn($candidate) => $candidate['id'] === 'UCAR'))[0];
        assert_same('review required', $ucar['status'], 'UCAR lacks an express patent grant');
        assert_true(!in_array('patentPosition', $ucar['matchedFields'], true), 'termination alone earns no patent points');
        assert_true(str_contains(implode(' ', $ucar['conflicts']), 'express patent grant'), 'UCAR explains its patent deficit');
        $epl = array_values(array_filter($all, fn($candidate) => $candidate['id'] === 'EPL-2.0'))[0];
        assert_true(in_array('conditional-relicensing', $epl['profile']['semantic']['permissions'], true), 'conditional relicensing accepted by PHP');
        assert_true(in_array('defend-commercial-distribution', $epl['obligations'], true), 'commercial defense duty accepted by PHP');
    }
    // Advertising is independent of binary/source distribution and is a preference in both modes.
    $advertisingIds = ['Apache-1.0', 'BSD-4-Clause', 'BSD-4-Clause-Shortened', 'BSD-Advertising-Acknowledgement', 'Caldera-no-preamble'];
    foreach (['quick', 'advanced'] as $mode) {
        $model = request_json($baseUrl, '/v1/guide?mode=' . $mode)['body'];
        $answers = [];
        foreach ($model['questions'] as $question) if (!isset($question['showWhen'])) $answers[$question['key']] = 'unknown';
        assert_true(array_key_exists('advertising', $answers), "$mode advertising question is discoverable");
        $answers = array_merge($answers, ['openness' => 'open', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'projectForm' => 'application', 'delivery' => 'internal', 'patents' => 'neutral', 'advertising' => 'allowed']);
        foreach (['allowed', 'avoid'] as $preference) {
            $answers['advertising'] = $preference;
            $guide = request_json($baseUrl, '/v1/guide', ['mode' => $mode, 'answers' => $answers]);
            assert_same('complete', $guide['body']['state'], "$mode advertising guide completion");
            $all = array_merge($guide['body']['recommendation']['candidates'], $guide['body']['recommendation']['alternatives']);
            foreach ($advertisingIds as $id) {
                $candidate = array_values(array_filter($all, fn($item) => $item['id'] === $id))[0];
                assert_same($preference === 'avoid' ? 'review required' : 'good fit', $candidate['status'], "$mode $id advertising status");
                assert_same($preference === 'avoid' ? 85 : 100, $candidate['score'], "$mode $id score agrees with TypeScript, including neutral patents");
                assert_true(in_array('include-advertising-acknowledgment', $candidate['obligations'], true), 'advertising duty survives PHP gate');
                if ($preference === 'avoid') assert_same(['semantic.advertising: requires an advertising acknowledgment'], $candidate['conflicts'], 'only the advertising preference conflicts');
            }
            foreach (['BSD-3-Clause-Attribution', 'BSD-Source-Code', 'BSD-3-Clause-acpica'] as $id) {
                $candidate = array_values(array_filter($all, fn($item) => $item['id'] === $id))[0];
                assert_same('good fit', $candidate['status'], "$id ordinary notices do not imply advertising");
                assert_same(100, $candidate['score'], "$id no bonus for accepting advertising");
            }
            foreach (['Caldera', 'BSD-4-Clause-UC'] as $id) assert_true(!in_array($id, array_column($all, 'id'), true), "$id historical blocker survives advertising support");
        }
        $requirements = ['mode' => $mode, 'requirements' => ['openness' => 'open', 'advertising' => 'avoid']];
        $rest = request_json($baseUrl, '/v1/recommendations', $requirements);
        $mcp = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 90, 'method' => 'tools/call', 'params' => ['name' => 'recommend_license', 'arguments' => $requirements]]);
        assert_same($rest['body'], $mcp['body']['result']['structuredContent'], 'advertising preferences match across REST and MCP');
    }
    foreach (['include-use-acknowledgment', 'include-advertising-acknowledgment', 'pass-disclaimer-requirement', 'allow-relinking', 'allow-reverse-engineering', 'defend-commercial-distribution', 'defend-added-warranty', 'preserve-combined-license-terms'] as $obligation) {
        $isolated = array_values(array_filter($realCatalog, fn($item) => $item['id'] === 'MIT-0'))[0];
        $isolated['metadata']['semantic']['obligations'] = [$obligation];
        stop_server($process, $pipes);
        file_put_contents($catalogPath, json_encode([$isolated], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
        start_server($tempRoot, $process, $pipes, $baseUrl);
        $accepted = request_json($baseUrl, '/v1/recommendations', ['openness' => 'open']);
        assert_same(['MIT-0'], array_column($accepted['body']['candidates'], 'id'), "$obligation is a recognized obligation");
        foreach (['minimal', 'source'] as $answer) {
            $excluded = request_json($baseUrl, '/v1/recommendations', ['openness' => 'open', 'obligations' => $answer]);
            assert_same('review required', $excluded['body']['candidates'][0]['status'], "$obligation alone must not satisfy $answer");
            assert_true(str_contains(implode(' ', $excluded['body']['candidates'][0]['conflicts']), 'obligation'), "$obligation must expose its $answer deficit");
        }
    }

    $useNotice = array_values(array_filter($realCatalog, fn($item) => $item['id'] === 'MIT-0'))[0];
    $useNotice['metadata']['semantic']['obligations'] = ['include-notice'];
    $useNotice['metadata']['semantic']['triggers'] = ['use'];
    $useNotice['metadata']['semantic']['patentPosition'] = 'express-exclusion';
    stop_server($process, $pipes);
    file_put_contents($catalogPath, json_encode([$useNotice], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    start_server($tempRoot, $process, $pipes, $baseUrl);
    $acceptedUse = request_json($baseUrl, '/v1/recommendations', ['openness' => 'open', 'obligations' => 'minimal', 'copyleftTrigger' => 'none']);
    assert_same('good fit', $acceptedUse['body']['candidates'][0]['status'] ?? null, 'use notice is recognized and does not itself imply copyleft');
    foreach ([['obligations' => 'source'], ['copyleftTrigger' => 'distribution'], ['copyleftTrigger' => 'network'], ['patents' => 'important']] as $preference) {
        $useMismatch = request_json($baseUrl, '/v1/recommendations', array_merge(['openness' => 'open'], $preference));
        assert_same('review required', $useMismatch['body']['candidates'][0]['status'] ?? null, 'use and patent exclusion do not imply source disclosure, distribution, network use or a patent grant');
    }

    fwrite(STDOUT, "PASS: Apache REST/MCP recommendation contract regressions\n");
} finally {
    if (is_resource($process)) {
        proc_terminate($process);
        foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        proc_close($process);
    }
    delete_tree($tempRoot);
}
