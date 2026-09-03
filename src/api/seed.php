<?php
try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    $bulk = new MongoDB\Driver\BulkWrite;
    
    // Clear out any old test data
    $bulk->delete([]);
    
    // Insert proper seed data
    $bulk->insert([
        'name' => 'Umamusume: Pretty Derby', 
        'description' => 'A complex deck builder with support cards, training scenarios, and stat scaling.',
        'cover_color' => '#f472b6', // Pinkish
        'max_deck_size' => 6,
        'max_copies_per_card' => 1
    ]);
    $bulk->insert([
        'name' => 'Eternal Card Game', 
        'description' => 'A strategy card game with multiple factions, influence requirements, and deep synergies.',
        'cover_color' => '#fbbf24', // Yellowish
        'max_deck_size' => 75,
        'max_copies_per_card' => 4
    ]);
    $bulk->insert([
        'name' => 'Magic: The Gathering', 
        'description' => 'The classic trading card game featuring five colors of mana and infinite possibilities.',
        'cover_color' => '#60a5fa', // Blueish
        'max_deck_size' => 60,
        'max_copies_per_card' => 4
    ]);
    
    $m->executeBulkWrite('deckbuilder.games', $bulk);
    echo "Database successfully seeded with Games!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

