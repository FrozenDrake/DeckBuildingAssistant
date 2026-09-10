<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;
$username = trim($input['username'] ?? '');
$action = $input['action'] ?? null;

if (!$gameId || !$username || !in_array($action, ['grant', 'revoke'])) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing or invalid parameters.']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Check if the current user is the CREATOR of this game
    $gameQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
    $gameCursor = $m->executeQuery('deckbuilder.games', $gameQuery)->toArray();
    if (empty($gameCursor) || !isset($gameCursor[0]->created_by) || (string)$gameCursor[0]->created_by !== $_SESSION['user_id']) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden: Only the game creator can manage admin roles.']));
    }
    
    // Find the target user by username
    // Using case-insensitive regex for the username search
    $targetQuery = new MongoDB\Driver\Query(['username' => new MongoDB\BSON\Regex('^' . preg_quote($username, '/') . '$', 'i')]);
    $targetCursor = $m->executeQuery('deckbuilder.users', $targetQuery)->toArray();
    if (empty($targetCursor)) {
        http_response_code(404);
        die(json_encode(['error' => "User '$username' not found."]));
    }
    
    $targetUser = $targetCursor[0];
    
    // If we're revoking, make sure they aren't the ONLY admin of the game (optional safety check, but let's skip for simplicity unless needed).
    
    $bulk = new MongoDB\Driver\BulkWrite();
    if ($action === 'grant') {
        $bulk->update(
            ['_id' => $targetUser->_id],
            ['$addToSet' => ['admin_games' => $gameId]]
        );
    } else {
        $bulk->update(
            ['_id' => $targetUser->_id],
            ['$pull' => ['admin_games' => $gameId]]
        );
    }
    
    $m->executeBulkWrite('deckbuilder.users', $bulk);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
