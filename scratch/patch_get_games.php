<?php
$file = 'src/api/get_games.php';
$content = file_get_contents($file);
$content = str_replace(
    '$query = new MongoDB\Driver\Query([]);',
    "session_start();\n    \$userId = \$_SESSION['user_id'] ?? null;\n    \$adminGames = [];\n    if (\$userId) {\n        \$uQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId(\$userId)]);\n        \$uCursor = \$m->executeQuery('deckbuilder.users', \$uQuery)->toArray();\n        if (!empty(\$uCursor)) {\n            foreach (\$uCursor[0]->admin_games ?? [] as \$ag) {\n                \$adminGames[] = new MongoDB\BSON\ObjectId((string)\$ag);\n            }\n        }\n    }\n    \$query = new MongoDB\Driver\Query(['\$or' => [['is_public' => true], ['is_public' => ['$exists' => false]], ['_id' => ['$in' => \$adminGames]]]]);",
    $content
);
file_put_contents($file, $content);
