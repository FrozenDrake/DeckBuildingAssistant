<?php
header('Content-Type: application/json');

try {
    $gameId = $_GET['game_id'] ?? null;
    if (!$gameId) {
        http_response_code(400);
        die(json_encode(['error' => 'Missing game_id parameter']));
    }

    // Pass ?include_raw=1 to include the full raw_data blob in the response.
    // Omitted by default to reduce payload size for normal card list rendering.
    $includeRaw = isset($_GET['include_raw']) && $_GET['include_raw'] === '1';

    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    $query = new MongoDB\Driver\Query(['game_id' => $gameId]);
    $cursor = $m->executeQuery('deckbuilder.cards', $query);
    
    $cards = [];
    foreach ($cursor as $document) {
        $doc = (array)$document;
        $doc['id'] = (string)$doc['_id'];
        unset($doc['_id']);
        if (!$includeRaw) {
            // Strip raw_data by default — it can be several KB per card
            unset($doc['raw_data']);
        }
        $cards[] = $doc;
    }
    
    echo json_encode($cards);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

