<?php
try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // 1. Get the Umamusume Game ID
    $query = new MongoDB\Driver\Query(['name' => 'Umamusume: Pretty Derby']);
    $cursor = $m->executeQuery('deckbuilder.games', $query);
    $gameId = null;
    foreach ($cursor as $doc) {
        $gameId = (string)$doc->_id;
        break;
    }

    if (!$gameId) {
        die("Could not find Umamusume in the games collection. Run seed.php first.");
    }

    $bulk = new MongoDB\Driver\BulkWrite;
    
    // Clear out any old cards for this game
    $bulk->delete(['game_id' => $gameId]);
    
    // Mock Cards based on accurate Umamusume Support Cards
    $cards = [
        [
            'game_id' => $gameId,
            'name' => '[Fire at My Heels] Kitasan Black',
            'characters' => ['Kitasan Black'],
            'type' => 'Speed',
            'rarity' => 'SSR',
            'description' => 'A top tier Speed card granting the Professor of Curvature gold skill.'
        ],
        [
            'game_id' => $gameId,
            'name' => '[Dream Big] Tokai Teio',
            'characters' => ['Tokai Teio'],
            'type' => 'Speed',
            'rarity' => 'SSR',
            'description' => 'Great speed gains and high hint levels.'
        ],
        [
            'game_id' => $gameId,
            'name' => '[Run My Way] Gold City',
            'characters' => ['Gold City'],
            'type' => 'Speed',
            'rarity' => 'SSR',
            'description' => 'A strong Speed card for Gold City.'
        ],
        [
            'game_id' => $gameId,
            'name' => '[Breakaway Battleship] Gold Ship',
            'characters' => ['Gold Ship'],
            'type' => 'Stamina',
            'rarity' => 'SSR',
            'description' => 'Provides excellent Stamina training and chaser skills.'
        ],
        [
            'game_id' => $gameId,
            'name' => '[Appreciate and Gratitude] Fine Motion',
            'characters' => ['Fine Motion'],
            'type' => 'Intelligence',
            'rarity' => 'SSR',
            'description' => 'The premier intelligence training card.'
        ],
        [
            'game_id' => $gameId,
            'name' => '[A Passionate Morning] Tazuna Hayakawa',
            'characters' => ['Tazuna Hayakawa'],
            'type' => 'Friend',
            'rarity' => 'SSR',
            'description' => 'Decreases stamina consumption and cures bad status effects.'
        ],
        // Test card with multiple characters
        [
            'game_id' => $gameId,
            'name' => '[Team Sirius] Team Sirius',
            'characters' => ['Special Week', 'Silence Suzuka', 'Tokai Teio', 'Mejiro McQueen', 'Gold Ship', 'Rice Shower'],
            'type' => 'Group',
            'rarity' => 'SSR',
            'description' => 'Group card with lots of scenario benefits.'
        ]
    ];

    foreach ($cards as $card) {
        $bulk->insert($card);
    }
    
    $m->executeBulkWrite('deckbuilder.cards', $bulk);
    echo "Successfully seeded " . count($cards) . " Umamusume cards!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

