<?php
// A quick script to just update the deck_rules without wiping the games/cards collections
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

// Find Umamusume game
$q = new MongoDB\Driver\Query(['name' => new MongoDB\BSON\Regex('Umamusume', 'i')]);
$res = $m->executeQuery('deckbuilder.games', $q);
$game = null;
foreach ($res as $r) {
    $game = $r;
    break;
}

if ($game) {
    $bulk = new MongoDB\Driver\BulkWrite;
    $bulk->update(
        ['_id' => $game->_id],
        ['$set' => [
            'deck_rules' => [
                [
                    'type' => 'unique_property',
                    'property' => 'characters',
                    'is_array' => true,
                    'error_message' => 'You cannot have multiple cards featuring the same character.'
                ]
            ]
        ]]
    );
    $m->executeBulkWrite('deckbuilder.games', $bulk);
    echo "Updated Umamusume with deck_rules!\n";
} else {
    echo "Umamusume game not found.\n";
}
