<?php
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI') ?: "mongodb://localhost:27017");
$q = new MongoDB\Driver\Query(['name' => 'Umamusume: Pretty Derby']);
$c = $m->executeQuery('deckbuilder.games', $q)->toArray();
echo json_encode($c[0]->card_schema ?? [], JSON_PRETTY_PRINT);
