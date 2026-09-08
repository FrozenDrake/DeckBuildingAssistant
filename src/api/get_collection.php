<?php
/**
 * api/get_collection.php
 *
 * Returns the authenticated user's card collection for a given game.
 * Requires an active session.
 *
 * Query params or JSON body:
 *   - game_id (required): string
 *
 * Returns:
 *   { entries: [ { card_id, name, rarity, type, qty, ... } ] }
 *
 * If no collection exists yet, returns an empty entries array.
 */
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'You must be logged in to view your collection.']));
}

$input  = json_decode(file_get_contents('php://input'), true) ?: [];
$gameId = $input['game_id'] ?? $_GET['game_id'] ?? null;

if (!$gameId) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id.']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

    $query  = new MongoDB\Driver\Query([
        'user_id' => $_SESSION['user_id'],
        'game_id' => $gameId,
    ]);
    $cursor = $m->executeQuery('deckbuilder.collections', $query);
    $docs   = $cursor->toArray();

    $entries = !empty($docs) ? (array)($docs[0]->entries ?? []) : [];

    // Convert any BSON documents inside the entries array to plain arrays
    $cleanEntries = array_map(fn($e) => (array)$e, $entries);

    echo json_encode(['entries' => $cleanEntries]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

