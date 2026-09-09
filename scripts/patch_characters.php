<?php
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
$query = new MongoDB\Driver\Query(['game_id' => '6a987e922df6d32561063d21']); // Only active game
$cursor = $m->executeQuery('deckbuilder.cards', $query);
$cards = $cursor->toArray();

$bulk = new MongoDB\Driver\BulkWrite();
$count = 0;
foreach ($cards as $card) {
    if (isset($card->name) && preg_match('/\]\s*(.*)$/', $card->name, $matches)) {
        $charName = trim($matches[1]);
        if ($charName) {
            $bulk->update(
                ['_id' => $card->_id],
                ['$set' => ['characters' => [$charName]]]
            );
            $count++;
        }
    }
}
if ($count > 0) {
    $m->executeBulkWrite('deckbuilder.cards', $bulk);
}
echo "Patched $count cards with characters array.\n";
