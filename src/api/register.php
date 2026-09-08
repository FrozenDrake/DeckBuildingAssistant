<?php
session_start();
header('Content-Type: application/json');

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$name = trim($input['name'] ?? '');

if (empty($email) || empty($password) || empty($name)) {
    http_response_code(400);
    die(json_encode(['error' => 'Email, password, and name are required.']));
}

// Check if user exists
$query = new MongoDB\Driver\Query(['email' => new MongoDB\BSON\Regex('^' . preg_quote($email) . '$', 'i')]);
$cursor = $m->executeQuery('deckbuilder.users', $query);
if (count($cursor->toArray()) > 0) {
    http_response_code(400);
    die(json_encode(['error' => 'A user with this email already exists.']));
}

// Create new user
$hash = password_hash($password, PASSWORD_DEFAULT);
$newUser = [
    'email' => $email,
    'password_hash' => $hash,
    'name' => $name,
    'admin_games' => [], // Array of game ObjectIDs
    'created_at' => new MongoDB\BSON\UTCDateTime()
];

$bulk = new MongoDB\Driver\BulkWrite;
$userId = $bulk->insert($newUser);
$m->executeBulkWrite('deckbuilder.users', $bulk);

$_SESSION['user_id'] = (string)$userId;

echo json_encode(['success' => true, 'user' => [
    'id' => (string)$userId,
    'email' => $email,
    'name' => $name,
    'admin_games' => []
]]);
