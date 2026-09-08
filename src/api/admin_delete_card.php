<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$input = json_decode(file_get_contents('php://input'), true);
$cardId = $input['card_id'] ?? null;
$gameId = $input['game_id'] ?? null; // require gameId to verify admin rights

if (!$cardId || !$gameId) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing card_id or game_id']));
}

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

// Verify admin
$userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id'])]);
$userCursor = $m->executeQuery('deckbuilder.users', $userQuery)->toArray();
if (empty($userCursor) || !in_array($gameId, $userCursor[0]->admin_games ?? [])) {
    http_response_code(403);
    die(json_encode(['error' => 'Forbidden: You do not have admin rights for this game.']));
}

$bulk = new MongoDB\Driver\BulkWrite;
$bulk->delete(['_id' => new MongoDB\BSON\ObjectId($cardId)]);
$m->executeBulkWrite('deckbuilder.cards', $bulk);

echo json_encode(['success' => true]);
