<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Not authenticated']));
}

$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;

$updateFields = [];
if (array_key_exists('deck_rules', $input)) {
    $updateFields['deck_rules'] = $input['deck_rules'];
}
if (array_key_exists('card_schema', $input)) {
    $updateFields['card_schema'] = $input['card_schema'];
}
if (array_key_exists('is_public', $input)) {
    $updateFields['is_public'] = (bool)$input['is_public'];
}
if (array_key_exists('import_adapter', $input)) {
    $updateFields['import_adapter'] = $input['import_adapter'];
}
if (array_key_exists('name', $input)) {
    $updateFields['name'] = trim($input['name']);
}
if (array_key_exists('description', $input)) {
    $updateFields['description'] = trim($input['description']);
}
if (array_key_exists('cover_color', $input)) {
    $updateFields['cover_color'] = trim($input['cover_color']);
}
if (array_key_exists('max_deck_size', $input)) {
    $updateFields['max_deck_size'] = (int)$input['max_deck_size'];
}
if (array_key_exists('max_copies_per_card', $input)) {
    $updateFields['max_copies_per_card'] = (int)$input['max_copies_per_card'];
}

if (!$gameId || empty($updateFields)) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id or nothing to update']));
}

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

$userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id'])]);
$userCursor = $m->executeQuery('deckbuilder.users', $userQuery)->toArray();
if (empty($userCursor)) {
    http_response_code(401);
    die(json_encode(['error' => 'User not found']));
}

$adminGames = [];
if (isset($userCursor[0]->admin_games)) {
    foreach ($userCursor[0]->admin_games as $ag) {
        $adminGames[] = (string)$ag;
    }
}

if (!in_array($gameId, $adminGames)) {
    http_response_code(403);
    die(json_encode(['error' => 'Forbidden: You do not have admin rights for this game.']));
}

$bulk = new MongoDB\Driver\BulkWrite;
$bulk->update(
    ['_id' => new MongoDB\BSON\ObjectId($gameId)],
    ['$set' => $updateFields]
);
$m->executeBulkWrite('deckbuilder.games', $bulk);

echo json_encode(['success' => true]);
