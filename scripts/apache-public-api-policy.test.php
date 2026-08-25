<?php
declare(strict_types=1);

$source = file_get_contents(__DIR__ . '/../apache-server/api/index.php');
if ($source === false) throw new RuntimeException('Apache API source missing');

assert(str_contains($source, "if (str_starts_with(\$config['db_dsn'], 'mysql:'))"));
assert(str_contains($source, 'ON DUPLICATE KEY UPDATE'));
assert(str_contains($source, 'ON CONFLICT(key) DO UPDATE'));
assert(str_contains($source, "if (\$method !== 'OPTIONS' && (str_starts_with(\$route, 'v1') || \$route === 'mcp')) public_limit"));
assert(str_contains($source, "if (\$route === 'api/state') { \$current = required_user();"));
assert(str_contains($source, "if (\$route === 'api/auth/session')"));
assert(str_contains($source, "strlen(\$raw) > 131072"));
fwrite(STDOUT, "apache public API policy checks passed\n");
