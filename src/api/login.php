<?php
session_start();
header('Content-Type: application/json');

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    die(json_encode(['error' => 'Email and password are required.']));
}

$query = new MongoDB\Driver\Query(['email' => new MongoDB\BSON\Regex('^' . preg_quote($email) . '$', 'i')]);
$cursor = $m->executeQuery('deckbuilder.users', $query);
$users = $cursor->toArray();

if (count($users) === 0) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid email or password.']));
}

$user = $users[0];
if (!password_verify($password, $user->password_hash)) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid email or password.']));
}

$_SESSION['user_id'] = (string)$user->_id;
$_SESSION['username'] = $user->name ?? $user->email;

echo json_encode(['success' => true, 'user' => [
    'id' => (string)$user->_id,
    'email' => $user->email,
    'name' => $user->name,
    'admin_games' => $user->admin_games ?? []
]]);
