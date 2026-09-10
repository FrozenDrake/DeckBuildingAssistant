<?php
$file = 'src/api/llm_agent.php';
$content = file_get_contents($file);

$authCode = <<<PHP
session_start();
if (!isset(\$_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'You must be logged in to use AI features.']));
}

require_once __DIR__ . '/rate_limit.php';

PHP;

// Find `header('Content-Type: application/json');`
$content = str_replace("header('Content-Type: application/json');", "header('Content-Type: application/json');\n" . $authCode, $content);

// Find where Mongo connection is created
$mongoCode = <<<PHP
\$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

\$rl = checkRateLimit(\$m, \$_SESSION['user_id'], 'ai', 20);
if (!\$rl['allowed']) {
    http_response_code(429);
    die(json_encode(['success' => false, 'error' => \$rl['error']]));
}
PHP;
$content = str_replace("\$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));", $mongoCode, $content);

// Find where final json is returned
$successReturn = "echo json_encode(['success' => true, 'data' => \$finalJson, 'logs' => \$agentLogs]);";
$incrementCode = "incrementRateLimit(\$m, \$_SESSION['user_id'], 'ai');\n    " . $successReturn;
$content = str_replace($successReturn, $incrementCode, $content);

file_put_contents($file, $content);
