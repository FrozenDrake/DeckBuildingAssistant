<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

$game_id = $_GET['game_id'] ?? null;
if (!$game_id) {
    http_response_code(400);
    die(json_encode(['error' => 'game_id is required']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Verify admin
    $userObjectId = new MongoDB\BSON\ObjectId($_SESSION['user_id']);
    $userCursor   = $m->executeQuery('deckbuilder.users', new MongoDB\Driver\Query(['_id' => $userObjectId]));
    $users        = $userCursor->toArray();
    if (empty($users)) {
        http_response_code(401);
        die(json_encode(['error' => 'User not found']));
    }
    
    $adminGames = (array)($users[0]->admin_games ?? []);
    if (!in_array($game_id, $adminGames)) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden']));
    }
    
    // Fetch pending submissions for this game
    $qSub = new MongoDB\Driver\Query(['game_id' => new MongoDB\BSON\ObjectId($game_id), 'status' => 'pending']);
    $subs = $m->executeQuery('deckbuilder.image_submissions', $qSub)->toArray();
    
    if (empty($subs)) {
        echo json_encode([]);
        exit;
    }
    
    // Get card details and user details for these submissions
    $cardIdStrs = [];
    $userIdStrs = [];
    foreach ($subs as $sub) {
        $cardIdStrs[] = (string)$sub->card_id;
        $userIdStrs[] = (string)$sub->user_id;
    }
    
    $uniqueCardIds = array_map(function($id) { return new MongoDB\BSON\ObjectId($id); }, array_values(array_unique($cardIdStrs)));
    $qCards = new MongoDB\Driver\Query(['_id' => ['$in' => $uniqueCardIds]]);
    $cards = $m->executeQuery('deckbuilder.cards', $qCards)->toArray();
    $cardMap = [];
    foreach ($cards as $c) {
        $cardMap[(string)$c->_id] = $c->name ?? 'Unknown Card';
    }
    
    $uniqueUserIds = array_map(function($id) { return new MongoDB\BSON\ObjectId($id); }, array_values(array_unique($userIdStrs)));
    $qUsers = new MongoDB\Driver\Query(['_id' => ['$in' => $uniqueUserIds]]);
    $users = $m->executeQuery('deckbuilder.users', $qUsers)->toArray();
    $userMap = [];
    foreach ($users as $u) {
        $userMap[(string)$u->_id] = $u->name ?? 'Unknown User';
    }
    
    $result = [];
    foreach ($subs as $sub) {
        $result[] = [
            'id' => (string)$sub->_id,
            'card_id' => (string)$sub->card_id,
            'card_name' => $cardMap[(string)$sub->card_id] ?? 'Unknown',
            'user_id' => (string)$sub->user_id,
            'name' => $userMap[(string)$sub->user_id] ?? 'Unknown',
            'file_name' => $sub->file_name,
            'submitted_at' => $sub->submitted_at->toDateTime()->format('c')
        ];
    }
    
    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

