<?php
/**
 * api/sync_database.php
 *
 * Admin-only endpoint for a full card database sync from a JSON dump file.
 *
 * All fields from each record are stored verbatim on the card document.
 * The game's card_schema defines which of those fields are surfaced in the UI,
 * so the admin only needs to ensure their JSON dump's field names match the
 * schema they have configured — no adapter mapping required.
 *
 * Requires:
 *   - Active session with admin rights over the game
 *   - game_id (POST field)
 *   - dump  (multipart file upload, must be a JSON array)
 *
 * Name resolution: looks for `name`, `title`, `title_en`, `card_name` keys
 * in that order. Falls back to "Unknown" if none are found. If your source
 * data needs a computed name (e.g. two fields joined), pre-process it on your
 * Windows machine before uploading.
 *
 * Returns: { success: true, inserted: <count> }
 */
session_start();
header('Content-Type: application/json');

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Authentication required.']));
}

$gameId = $_POST['game_id'] ?? null;
if (!$gameId) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id.']));
}

if (empty($_FILES['dump']) || $_FILES['dump']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    die(json_encode(['error' => 'No valid file uploaded. Use field name "dump".']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

    // Verify user is an admin of this game
    $userObjectId = new MongoDB\BSON\ObjectId($_SESSION['user_id']);
    $userCursor   = $m->executeQuery('deckbuilder.users', new MongoDB\Driver\Query(['_id' => $userObjectId]));
    $users        = $userCursor->toArray();
    if (empty($users)) {
        http_response_code(401);
        die(json_encode(['error' => 'User not found.']));
    }
    $adminGames = (array)($users[0]->admin_games ?? []);
    if (!in_array($gameId, $adminGames)) {
        http_response_code(403);
        die(json_encode(['error' => 'You are not an admin of this game.']));
    }

    // Decode the uploaded JSON dump
    $rawJson  = file_get_contents($_FILES['dump']['tmp_name']);
    $rawCards = json_decode($rawJson, true);
    if (!is_array($rawCards)) {
        http_response_code(400);
        die(json_encode(['error' => 'Uploaded file is not a valid JSON array.']));
    }

    // Build card documents — all source fields stored verbatim.
    // Only game_id and name are injected; everything else comes straight from the dump.
    $nameCandidates = ['name', 'title', 'title_en', 'card_name'];
    $docs = [];
    foreach ($rawCards as $raw) {
        // Strip any stale MongoDB _id fields from the source data
        unset($raw['_id']);

        // Resolve a display name from common field candidates
        $name = 'Unknown';
        foreach ($nameCandidates as $key) {
            if (!empty($raw[$key]) && is_string($raw[$key])) {
                $name = $raw[$key];
                break;
            }
        }

        $docs[] = array_merge(['game_id' => $gameId, 'name' => $name], $raw);
    }

    // Atomic full replace: wipe old cards then insert new batch
    $bulk = new MongoDB\Driver\BulkWrite();
    $bulk->delete(['game_id' => $gameId]);
    foreach ($docs as $doc) {
        $bulk->insert($doc);
    }
    $m->executeBulkWrite('deckbuilder.cards', $bulk);

    echo json_encode(['success' => true, 'inserted' => count($docs)]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
