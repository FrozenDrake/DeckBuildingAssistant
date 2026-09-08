<?php
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
$q = new MongoDB\Driver\Query(['name' => new MongoDB\BSON\Regex('Umamusume', 'i')]);
$res = $m->executeQuery('deckbuilder.games', $q);
$game = null;
foreach ($res as $r) { $game = $r; break; }

if ($game) {
    $schema = [
        [ 'key' => 'name', 'label' => 'Card Name', 'type' => 'string', 'required' => true ],
        [ 'key' => 'rarity', 'label' => 'Rarity', 'type' => 'select', 'options' => ['SSR', 'SR', 'R'] ],
        [ 'key' => 'type', 'label' => 'Card Type', 'type' => 'select', 'options' => ['Speed', 'Stamina', 'Power', 'Guts', 'Intelligence', 'Friend', 'Group'] ],
        [ 'key' => 'characters', 'label' => 'Characters (Comma Separated)', 'type' => 'string' ],
        [ 'key' => 'image_url', 'label' => 'Image URL', 'type' => 'string' ]
    ];
    $bulk = new MongoDB\Driver\BulkWrite;
    $bulk->update(
        ['_id' => $game->_id],
        ['$set' => ['card_schema' => $schema]]
    );
    $m->executeBulkWrite('deckbuilder.games', $bulk);
    echo "Added card_schema to Umamusume\n";
} else {
    echo "Game not found\n";
}
