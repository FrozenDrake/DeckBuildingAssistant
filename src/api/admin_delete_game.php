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
    die(json_encode(['error' => 'Missing game_id.']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Check if the current user is the CREATOR of this game
    $gameQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
    $gameCursor = $m->executeQuery('deckbuilder.games', $gameQuery)->toArray();
    if (empty($gameCursor) || !isset($gameCursor[0]->created_by) || (string)$gameCursor[0]->created_by !== $_SESSION['user_id']) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden: Only the game creator can delete the game.']));
    }
    
    // 1. Delete the game itself
    $bulkGame = new MongoDB\Driver\BulkWrite();
    $bulkGame->delete(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
    $m->executeBulkWrite('deckbuilder.games', $bulkGame);
    
    // 2. Remove gameId from all users' admin_games array
    $bulkUsers = new MongoDB\Driver\BulkWrite();
    $bulkUsers->update(
        ['admin_games' => $gameId],
        ['$pull' => ['admin_games' => $gameId]],
        ['multi' => true]
    );
    $m->executeBulkWrite('deckbuilder.users', $bulkUsers);
    
    // 3. Delete all cards for this game
    $bulkCards = new MongoDB\Driver\BulkWrite();
    $bulkCards->delete(['game_id' => $gameId]);
    $m->executeBulkWrite('deckbuilder.cards', $bulkCards);
    
    // 4. Delete all decks for this game
    $bulkDecks = new MongoDB\Driver\BulkWrite();
    $bulkDecks->delete(['game_id' => $gameId]);
    $m->executeBulkWrite('deckbuilder.decks', $bulkDecks);
    
    // 5. Delete all user collections for this game
    $bulkColls = new MongoDB\Driver\BulkWrite();
    $bulkColls->delete(['game_id' => $gameId]);
    $m->executeBulkWrite('deckbuilder.collections', $bulkColls);
    
    // Update local session admin_games since we just deleted it from our DB
    if (($key = array_search($gameId, $_SESSION['admin_games'] ?? [])) !== false) {
        unset($_SESSION['admin_games'][$key]);
        $_SESSION['admin_games'] = array_values($_SESSION['admin_games']);
    }
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
