<?php
return [
    'db_dsn' => 'sqlite:' . __DIR__ . '/var/licentia.sqlite',
    'db_user' => null,
    'db_password' => null,
    'google_client_id' => '',
    'google_client_secret' => '',
    'github_client_id' => '',
    'github_client_secret' => '',
    'trusted_proxy' => false,
    // Enable only when this Apache instance is directly behind a trusted proxy.
    'trusted_proxy_header' => 'HTTP_CF_CONNECTING_IP',
    // Replace with a long random secret before exposing the public API. Worker/process deployments use RATE_LIMIT_SECRET.
    'rate_limit_secret' => 'replace-in-production',
];
