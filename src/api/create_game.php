<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'You must be logged in to create a game.']));
}

$input = json_decode(file_get_contents('php://input'), true);
$name = trim($input['name'] ?? '');
$description = trim($input['description'] ?? '');

if ($name === '') {
    http_response_code(400);
    die(json_encode(['error' => 'Game name is required.']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    $userId = $_SESSION['user_id'];
    
    // Enforce unique game name per user (composite key simulation)
    $checkQuery = new MongoDB\Driver\Query([
        'name' => new MongoDB\BSON\Regex('^' . preg_quote($name, '/') . '$', 'i'),
        'created_by' => $userId
    ]);
    $checkCursor = $m->executeQuery('deckbuilder.games', $checkQuery)->toArray();
    
    if (!empty($checkCursor)) {
        http_response_code(409);
        die(json_encode(['error' => "You have already created a game named '$name'."]));
    }
    
    // Create the game document
    $newGameId = new MongoDB\BSON\ObjectId();
    $gameDoc = [
        '_id' => $newGameId,
        'name' => $name,
        'description' => $description,
        'is_public' => false,
        'created_by' => $userId,
        'created_at' => new MongoDB\BSON\UTCDateTime(),
        'card_schema' => [],
        'deck_rules' => [],
        'max_deck_size' => 60,
        'import_adapter' => 'generic'
    ];
    
    $bulkGame = new MongoDB\Driver\BulkWrite();
    $bulkGame->insert($gameDoc);
    $m->executeBulkWrite('deckbuilder.games', $bulkGame);
    
    // Add game ID to user's admin_games
    $bulkUser = new MongoDB\Driver\BulkWrite();
    $bulkUser->update(
        ['_id' => new MongoDB\BSON\ObjectId($userId)],
        ['$addToSet' => ['admin_games' => (string)$newGameId]]
    );
    $m->executeBulkWrite('deckbuilder.users', $bulkUser);
    
    // Fetch updated user to refresh session
    $userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($userId)]);
    $userCursor = $m->executeQuery('deckbuilder.users', $userQuery)->toArray();
    if (!empty($userCursor)) {
        $_SESSION['admin_games'] = (array)($userCursor[0]->admin_games ?? []);
    }
    
    echo json_encode(['success' => true, 'game_id' => (string)$newGameId]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
