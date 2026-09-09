<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

$data = json_decode(file_get_contents('php://input'), true);
$submission_id = $data['submission_id'] ?? null;
$action = $data['action'] ?? null;

if (!$submission_id || !in_array($action, ['approve', 'reject'])) {
    http_response_code(400);
    die(json_encode(['error' => 'Invalid input']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Fetch submission
    $qSub = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($submission_id)]);
    $sub = current($m->executeQuery('deckbuilder.image_submissions', $qSub)->toArray());
    
    if (!$sub || $sub->status !== 'pending') {
        http_response_code(404);
        die(json_encode(['error' => 'Pending submission not found']));
    }
    
    // Verify admin
    $userObjectId = new MongoDB\BSON\ObjectId($_SESSION['user_id']);
    $userCursor   = $m->executeQuery('deckbuilder.users', new MongoDB\Driver\Query(['_id' => $userObjectId]));
    $users        = $userCursor->toArray();
    if (empty($users)) {
        http_response_code(401);
        die(json_encode(['error' => 'User not found']));
    }
    
    $adminGames = (array)($users[0]->admin_games ?? []);
    if (!in_array((string)$sub->game_id, $adminGames)) {
        http_response_code(403);
        die(json_encode(['error' => 'Forbidden']));
    }
    
    $subFilePath = __DIR__ . '/../images/submissions/' . $sub->file_name;
    
    if ($action === 'approve') {
        // Move file
        $newFileName = (string)$sub->card_id . '.webp';
        $newFilePath = __DIR__ . '/../images/cards/' . $newFileName;
        
        if (file_exists($subFilePath)) {
            rename($subFilePath, $newFilePath);
        }
        
        // Update card
        $bulkCard = new MongoDB\Driver\BulkWrite();
        $bulkCard->update(
            ['_id' => $sub->card_id],
            ['$set' => ['image_url' => 'images/cards/' . $newFileName]]
        );
        $m->executeBulkWrite('deckbuilder.cards', $bulkCard);
    } else {
        // Reject - just delete file
        if (file_exists($subFilePath)) {
            unlink($subFilePath);
        }
    }
    
    // Update submission status
    $bulkSub = new MongoDB\Driver\BulkWrite();
    $bulkSub->update(
        ['_id' => $sub->_id],
        ['$set' => ['status' => $action]]
    );
    $m->executeBulkWrite('deckbuilder.image_submissions', $bulkSub);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

