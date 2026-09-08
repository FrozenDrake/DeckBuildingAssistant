<?php
/**
 * api/update_collection.php
 *
 * Adds or removes one copy of a card from the authenticated user's collection.
 * Requires an active session.
 *
 * Accepts a JSON POST body:
 *   - game_id (required): string
 *   - card (required): full card object (must include at minimum: id, name)
 *   - delta (required): 1 to add one copy, -1 to remove one copy
 *
 * The collection is stored as a single document per {user_id, game_id}
 * containing an `entries` array of { card_id, qty, ...card_fields }.
 *
 * Returns:
 *   { entries: [ ... ] }  — the updated collection entries
 */
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'You must be logged in to manage your collection.']));
}

$input  = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;
$card   = $input['card']    ?? null;
$delta  = (int)($input['delta'] ?? 0);

if (!$gameId || !$card || $delta === 0) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id, card, or delta.']));
}

$cardId = (string)($card['id'] ?? '');
if ($cardId === '') {
    http_response_code(400);
    die(json_encode(['error' => 'Card must have an id field.']));
}

try {
    $m      = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    $userId = $_SESSION['user_id'];

    // Load the current collection document
    $query  = new MongoDB\Driver\Query(['user_id' => $userId, 'game_id' => $gameId]);
    $cursor = $m->executeQuery('deckbuilder.collections', $query);
    $docs   = $cursor->toArray();

    $entries = [];
    $docExists = !empty($docs);

    if ($docExists) {
        $entries = array_map(fn($e) => (array)$e, (array)($docs[0]->entries ?? []));
    }

    // Find existing entry for this card
    $idx = null;
    foreach ($entries as $i => $e) {
        if ((string)$e['card_id'] === $cardId) {
            $idx = $i;
            break;
        }
    }

    if ($delta === 1) {
        // Add one copy
        if ($idx !== null) {
            $entries[$idx]['qty']++;
        } else {
            // Store a snapshot of relevant card fields alongside the id and qty
            $snapshot = [
                'card_id' => $cardId,
                'qty'     => 1,
                'name'    => $card['name']   ?? 'Unknown',
                'rarity'  => $card['rarity'] ?? '',
                'type'    => $card['type']   ?? '',
            ];
            $entries[] = $snapshot;
        }
    } elseif ($delta === -1) {
        if ($idx !== null) {
            $entries[$idx]['qty']--;
            // Remove the entry entirely when qty hits zero
            if ($entries[$idx]['qty'] <= 0) {
                array_splice($entries, $idx, 1);
            }
        }
        // If not found, nothing to remove — silently succeed
    }

    // Re-index entries array to prevent JSON encoding as object
    $entries = array_values($entries);

    $bulk = new MongoDB\Driver\BulkWrite();
    $filter = ['user_id' => $userId, 'game_id' => $gameId];

    if ($docExists) {
        $bulk->update($filter, ['$set' => ['entries' => $entries]]);
    } else {
        $bulk->insert(array_merge($filter, ['entries' => $entries]));
    }

    $m->executeBulkWrite('deckbuilder.collections', $bulk);

    echo json_encode(['entries' => $entries]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

