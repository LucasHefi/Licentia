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
        ['uncertain' => ['openness' => 'unknown']],
        ['not-applicable' => ['openness' => 'not-applicable']],
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
    assert_same('no-safe-match', $proprietary['body']['outcome'], 'proprietary branch outcome');
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
            'evidence' => [
                ['field' => 'family', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
                ['field' => 'patentPosition', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
                ['field' => 'noticeBurden', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
            ],
        ],
    ];
    file_put_contents($catalogPath, json_encode($catalogData, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));
    start_server($tempRoot, $process, $pipes, $baseUrl);

    $fixtureRecommendation = request_json($baseUrl, '/v1/recommendations', ['openness' => 'open', 'patents' => 'important', 'notices' => 'standard']);
    assert_same(200, $fixtureRecommendation['status'], 'synthetic recommendation status');
    canonical_fields($fixtureRecommendation['body']);
    assert_same('recommendation', $fixtureRecommendation['body']['outcome'], 'synthetic fixture recommendation outcome');
    assert_same('LIC-008-synthetic-fixture', $fixtureRecommendation['body']['candidates'][0]['id'] ?? null, 'synthetic fixture candidate id');
    assert_same(27, $fixtureRecommendation['body']['candidates'][0]['score'] ?? null, 'TypeScript-parity synthetic fixture score');
    assert_same(['family', 'patentPosition', 'noticeBurden'], $fixtureRecommendation['body']['candidates'][0]['matchedFields'] ?? null, 'TypeScript-parity matched fields');
    assert_true(in_array('dependency-analysis=not-requested', $fixtureRecommendation['body']['trace'], true), 'canonical trace must include dependency analysis');
    foreach ([
        ['invalid-key' => ['unexpected' => 'value']],
        ['uncertain' => ['openness' => 'unknown']],
        ['not-applicable' => ['openness' => 'not-applicable']],
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

    $mismatchedProjectForm = request_json($baseUrl, '/v1/recommendations', ['projectForm' => 'application']);
    assert_same('recommendation', $mismatchedProjectForm['body']['outcome'], 'project form is context, not a license-wide hard constraint');
    assert_same('LIC-008-synthetic-fixture', $mismatchedProjectForm['body']['candidates'][0]['id'] ?? null, 'project form must not exclude an otherwise eligible license');

    $catalogWithFixture = request_json($baseUrl, '/v1/recommendations', []);
    assert_same('recommendation', $catalogWithFixture['body']['outcome'], 'empty valid answers should use the synthetic metadata fixture');

    $mcpTools = request_json($baseUrl, '/mcp', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list']);
    $recommendTool = null;
    foreach ($mcpTools['body']['result']['tools'] ?? [] as $tool) if (($tool['name'] ?? '') === 'recommend_license') $recommendTool = $tool;
    assert_true(is_array($recommendTool), 'MCP recommend_license tool must be listed');
    $schema = $recommendTool['inputSchema'];
    assert_true(isset($schema['oneOf']) && count($schema['oneOf']) === 2, 'MCP recommendation schema must expose direct and envelope forms');
    $schemaProperties = array_keys($schema['oneOf'][0]['properties'] ?? []);
    sort($schemaProperties);
    $expectedProperties = ['openness', 'reciprocity', 'delivery', 'patents', 'notices', 'jurisdiction', 'projectForm', 'commercialUse', 'proprietary', 'copyleftTrigger', 'trademarks', 'obligations', 'dependencies', 'versionStrategy', 'dualLicensing', 'futureDistribution'];
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
    assert_same('lic-008-guide-v1', $guideModel['body']['guideModelVersion'] ?? null, 'guide model version');
    assert_true(count($guideModel['body']['questions'] ?? []) >= 6, 'quick guide questions must be discoverable');
    $openApi = request_json($baseUrl, '/v1/openapi.json');
    assert_same('3.1.0', $openApi['body']['openapi'] ?? null, 'Apache OpenAPI document version');
    assert_true(isset($openApi['body']['paths']['/v1/guide']['get'], $openApi['body']['paths']['/v1/guide']['post']), 'Apache OpenAPI guide operations');
    $guideStart = request_json($baseUrl, '/v1/guide', ['mode' => 'quick', 'answers' => []]);
    assert_same('awaiting-input', $guideStart['body']['state'] ?? null, 'REST guide starts without server state');
    assert_same('openness', $guideStart['body']['nextQuestion']['key'] ?? null, 'REST guide first question');
    $guideComplete = request_json($baseUrl, '/v1/guide', ['mode' => 'quick', 'answers' => ['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'internal', 'patents' => 'neutral']]);
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
            'evidence' => [
                ['field' => 'family', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
                ['field' => 'permissions', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
                ['field' => 'projectForm', 'sourceId' => 'spdx-license-list', 'locator' => 'fixture'],
            ],
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
    assert_same(40, $generatedCandidates[0]['score'] ?? null, 'generated envelope best candidate score');
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
        [['openness' => 'open', 'projectForm' => 'application', 'reciprocity' => 'none', 'commercialUse' => 'allowed', 'delivery' => 'library', 'patents' => 'important'], null],
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
    assert_same('lic-008-guide-v1', $advancedEnvelope['body']['guideModelVersion'] ?? null, 'advanced guide model version');
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

    fwrite(STDOUT, "PASS: Apache REST/MCP recommendation contract regressions\n");
} finally {
    if (is_resource($process)) {
        proc_terminate($process);
        foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe);
        proc_close($process);
    }
    delete_tree($tempRoot);
}
