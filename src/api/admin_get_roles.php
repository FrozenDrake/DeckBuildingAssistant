<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;

if (!$gameId) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Check if the current user is an admin of this game
    $userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id'])]);
    $userCursor = $m->executeQuery('deckbuilder.users', $userQuery)->toArray();
    if (empty($userCursor) || !in_array($gameId, (array)($userCursor[0]->admin_games ?? []))) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden: You do not have admin rights for this game.']));
    }
    
    // Find all users who have this gameId in their admin_games array
    $query = new MongoDB\Driver\Query(['admin_games' => $gameId]);
    $cursor = $m->executeQuery('deckbuilder.users', $query);
    
    $admins = [];
    foreach ($cursor as $doc) {
        if (isset($doc->username)) {
            $admins[] = $doc->username;
        }
    }
    
    echo json_encode(['admins' => $admins]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
