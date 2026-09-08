<?php
/**
 * api/save_deck.php
 *
 * Saves a new deck for the currently authenticated user.
 * Requires an active session (user must be logged in).
 *
 * Accepts a JSON POST body:
 *   - game_id (required): string
 *   - name (required): string — the user-chosen deck name
 *   - description: string — optional free-text description
 *   - cards (required): array of card objects as they appear in the DeckBuilder
 *
 * Returns:
 *   { success: true, deck_id: "<id>" }
 */
header('Content-Type: application/json');
session_start();

// Must be logged in
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'You must be logged in to save a deck.']));
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $gameId      = $input['game_id']      ?? null;
    $name        = trim($input['name']    ?? '');
    $description = trim($input['description'] ?? '');
    $cards       = $input['cards']        ?? [];

    if (!$gameId)        { http_response_code(400); die(json_encode(['error' => 'Missing game_id.'])); }
    if ($name === '')    { http_response_code(400); die(json_encode(['error' => 'Deck name is required.'])); }
    if (!is_array($cards)) { http_response_code(400); die(json_encode(['error' => 'cards must be an array.'])); }

    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

    // Sanitize cards — strip internal Mongo _id fields that shouldn't be re-saved
    $cleanCards = array_map(function($card) {
        unset($card['_id']);
        return $card;
    }, $cards);

    $doc = [
        'game_id'              => $gameId,
        'name'                 => $name,
        'description'          => $description,
        'cards'                => $cleanCards,
        'created_by_user_id'   => $_SESSION['user_id'],
        'created_by_username'  => $_SESSION['username'] ?? 'Unknown',
        'created_at'           => time(), // Unix timestamp
    ];

    $bulk = new MongoDB\Driver\BulkWrite();
    $insertedId = $bulk->insert($doc);
    $m->executeBulkWrite('deckbuilder.decks', $bulk);

    echo json_encode(['success' => true, 'deck_id' => (string)$insertedId]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

