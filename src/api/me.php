<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
try {
    $objectId = new MongoDB\BSON\ObjectId($_SESSION['user_id']);
    $query = new MongoDB\Driver\Query(['_id' => $objectId]);
    $cursor = $m->executeQuery('deckbuilder.users', $query);
    $users = $cursor->toArray();
    
    if (count($users) === 0) {
        unset($_SESSION['user_id']);
        http_response_code(401);
        die(json_encode(['error' => 'User not found']));
    }
    
    $user = $users[0];
    echo json_encode(['user' => [
        'id' => (string)$user->_id,
        'email' => $user->email,
        'name' => $user->name,
        'admin_games' => $user->admin_games ?? []
    ]]);
} catch (Exception $e) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid session']));
}
