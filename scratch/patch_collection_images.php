<?php
$m = new MongoDB\Driver\Manager('mongodb://127.0.0.1:27017');

$query = new MongoDB\Driver\Query([], ['projection' => ['_id' => 1, 'image_url' => 1]]);
$cards = $m->executeQuery('deckbuilder.cards', $query);

$images = [];
foreach ($cards as $c) {
    if (isset($c->image_url)) {
        $images[(string)$c->_id] = $c->image_url;
    }
}

$queryColl = new MongoDB\Driver\Query([]);
$colls = $m->executeQuery('deckbuilder.collections', $queryColl);

$bulk = new MongoDB\Driver\BulkWrite();
$changed = 0;

foreach ($colls as $coll) {
    $entries = (array)$coll->entries;
    $modified = false;
    foreach ($entries as $i => $e) {
        $eArray = (array)$e;
        $cId = (string)$eArray['card_id'];
        if (!isset($eArray['image_url']) && isset($images[$cId])) {
            $entries[$i]->image_url = $images[$cId];
            $modified = true;
        }
    }
    
    if ($modified) {
        $bulk->update(['_id' => $coll->_id], ['$set' => ['entries' => array_values($entries)]]);
        $changed++;
    }
}

if ($changed > 0) {
    $m->executeBulkWrite('deckbuilder.collections', $bulk);
    echo "Patched $changed collections.\n";
} else {
    echo "No collections needed patching.\n";
}
