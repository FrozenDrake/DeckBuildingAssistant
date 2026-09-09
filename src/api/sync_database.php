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
    // Only game_id, name, and image_url are injected by the sync.
    // Fetch existing cards to preserve image_url
    $existingCards = $m->executeQuery('deckbuilder.cards', new MongoDB\Driver\Query(['game_id' => $gameId]))->toArray();
    $imageMap = [];
    foreach ($existingCards as $ec) {
        // Use either the string name or support_id/id as a stable identifier.
        // The safest stable identifier is id or support_id.
        $idKey = $ec->id ?? $ec->support_id ?? $ec->name;
        if (!empty($ec->image_url)) {
            $imageMap[$idKey] = $ec->image_url;
        }
    }

    $docs = [];
    foreach ($rawCards as $raw) {
        unset($raw['_id']);

        if (!empty($raw['name_en'])) {
            $prefix = !empty($raw['title_en']) ? trim($raw['title_en']) . ' ' : '';
            $name   = $prefix . trim($raw['name_en']);
        } else {
            $name = 'Unknown';
            foreach (['name', 'title', 'card_name'] as $key) {
                if (!empty($raw[$key]) && is_string($raw[$key])) {
                    $name = $raw[$key];
                    break;
                }
            }
        }

        // Restore image_url if it existed
        $idKey = $raw['id'] ?? $raw['support_id'] ?? $name;
        $imageUrl = $imageMap[$idKey] ?? null;

        $docs[] = array_merge(
            ['game_id' => $gameId, 'name' => $name, 'image_url' => $imageUrl],
            $raw
        );
    }

    // Atomic full replace: wipe old cards then insert new batch
    $bulk = new MongoDB\Driver\BulkWrite();
    $bulk->delete(['game_id' => $gameId]);
    foreach ($docs as $doc) {
        $bulk->insert($doc);
    }
    $m->executeBulkWrite('deckbuilder.cards', $bulk);

    echo json_encode(['success' => true, 'inserted' => count($docs), 'skipped' => 0]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
