<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$file = realpath(__DIR__ . '/../apache-dist' . $path);
$root = realpath(__DIR__ . '/../apache-dist');
if ($file && str_starts_with($file, $root) && is_file($file)) return false;
if (preg_match('~/(?:api|v1)(?:/|$)|/mcp$~', $path)) require $root . '/api/index.php';
else readfile($root . '/index.html');
