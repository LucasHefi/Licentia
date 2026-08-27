<?php
return [
    'base_url' => 'https://vase-domena.cz',
    // Keep the database and PHP sessions outside the public web root.
    'db_dsn' => 'sqlite:' . dirname(__DIR__, 2) . '/../licentia-private/licentia.sqlite',
    'db_user' => null,
    'db_password' => null,
    'session_path' => dirname(__DIR__, 2) . '/../licentia-private/sessions',
    'google_client_id' => '',
    'google_client_secret' => '',
    'github_client_id' => '',
    'github_client_secret' => '',
    'trusted_proxy' => false,
    // Enable only when this Apache instance is directly behind a trusted proxy.
    'trusted_proxy_header' => 'HTTP_CF_CONNECTING_IP',
    // Replace with a long random secret before exposing the public API. Worker/process deployments use RATE_LIMIT_SECRET.
    'rate_limit_secret' => '',
];
