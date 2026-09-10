<?php
header('Content-Type: application/json');

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    session_start();
    $userId = $_SESSION['user_id'] ?? null;
    $adminGames = [];
    if ($userId) {
        $uQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($userId)]);
        $uCursor = $m->executeQuery('deckbuilder.users', $uQuery)->toArray();
        if (!empty($uCursor)) {
            foreach ($uCursor[0]->admin_games ?? [] as $ag) {
                $adminGames[] = new MongoDB\BSON\ObjectId((string)$ag);
            }
        }
    }
    
    // Find games that are either public, or that the user is an admin of
    $filter = ['$or' => [
        ['is_public' => true],
        ['is_public' => ['$exists' => false]],
        ['_id' => ['$in' => $adminGames]]
    ]];
    $query = new MongoDB\Driver\Query($filter);
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

