<?php
$m = new MongoDB\Driver\Manager('mongodb://127.0.0.1:27017'); // try localhost
$query = new MongoDB\Driver\Query([], ["limit" => 1]);
$game = current($m->executeQuery("deckbuilder.games", $query)->toArray());
echo json_encode($game->card_schema, JSON_PRETTY_PRINT);
