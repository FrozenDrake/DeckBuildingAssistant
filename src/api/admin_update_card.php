<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$input = json_decode(file_get_contents('php://input'), true);
$cardId = $input['card_id'] ?? null;
$gameId = $input['game_id'] ?? null;
$cardData = $input['card_data'] ?? null;

if (!$cardId || !$gameId || !$cardData) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing card_id, game_id, or card_data']));
}

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

// Verify admin
$userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id'])]);
$userCursor = $m->executeQuery('deckbuilder.users', $userQuery)->toArray();
if (empty($userCursor) || !in_array($gameId, $userCursor[0]->admin_games ?? [])) {
    http_response_code(403);
    die(json_encode(['error' => 'Forbidden: You do not have admin rights for this game.']));
}

$cardData['game_id'] = $gameId;
if (isset($cardData['_id'])) unset($cardData['_id']);
if (isset($cardData['id'])) unset($cardData['id']);

$bulk = new MongoDB\Driver\BulkWrite;
$bulk->update(
    ['_id' => new MongoDB\BSON\ObjectId($cardId)],
    ['$set' => $cardData]
);
$m->executeBulkWrite('deckbuilder.cards', $bulk);

echo json_encode(['success' => true]);
