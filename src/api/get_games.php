<?php
header('Content-Type: application/json');

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Find all games
    $query = new MongoDB\Driver\Query([]);
    $cursor = $m->executeQuery('deckbuilder.games', $query);
    
    $games = [];
    foreach ($cursor as $document) {
        $doc = (array)$document;
        $doc['id'] = (string)$doc['_id'];
        unset($doc['_id']);
        $games[] = $doc;
    }
    
    echo json_encode($games);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

