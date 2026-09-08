<?php
$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

// Find first game (likely Umamusume)
$gameCursor = $m->executeQuery('deckbuilder.games', new MongoDB\Driver\Query([]));
$games = $gameCursor->toArray();
if (empty($games)) die("No games found\n");
$gameId = (string)$games[0]->_id;

// Update all users to be admins of this game
$bulk = new MongoDB\Driver\BulkWrite;
$bulk->update(
    [], // empty filter = all users
    ['$addToSet' => ['admin_games' => $gameId]],
    ['multi' => true]
);
$result = $m->executeBulkWrite('deckbuilder.users', $bulk);
echo "Granted admin rights for " . $games[0]->name . " to " . $result->getModifiedCount() . " user(s).\n";
