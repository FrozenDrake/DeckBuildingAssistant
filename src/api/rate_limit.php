<?php
function checkRateLimit($m, $userId, $type, $limit) {
    $userQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($userId)]);
    $user = current($m->executeQuery('deckbuilder.users', $userQuery)->toArray());
    if (!$user) return ['allowed' => false, 'error' => 'User not found'];

    $today = date('Y-m-d');
    
    $resetField = "{$type}_reset";
    $countField = "{$type}_count";
    
    $resetDate = $user->$resetField ?? '';
    $count = $user->$countField ?? 0;

    if ($resetDate !== $today) {
        $count = 0;
    }

    if ($count >= $limit) {
        return ['allowed' => false, 'error' => "Daily limit reached for {$type} ({$limit}/{$limit}). Try again tomorrow!"];
    }
    
    return ['allowed' => true];
}

function incrementRateLimit($m, $userId, $type) {
    $today = date('Y-m-d');
    $resetField = "{$type}_reset";
    $countField = "{$type}_count";

    $bulk = new MongoDB\Driver\BulkWrite;
    $bulk->update(
        ['_id' => new MongoDB\BSON\ObjectId($userId)],
        [
            '$set' => [$resetField => $today], 
            '$inc' => [$countField => 1]
        ]
    );
    $m->executeBulkWrite('deckbuilder.users', $bulk);
}
