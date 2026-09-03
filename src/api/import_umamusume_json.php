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
        die("Could not find Umamusume in the games collection. Run seed.php first.\n");
    }

    // 2. Locate the JSON Dump
    $jsonFile = __DIR__ . '/data/umamusume_cards.json';
    if (!file_exists($jsonFile)) {
        die("Please place your JSON dump at $jsonFile\n");
    }

    $jsonContent = file_get_contents($jsonFile);
    $rawCards = json_decode($jsonContent, true);

    if (!is_array($rawCards)) {
        die("Invalid JSON format. Expected an array of cards.\n");
    }

    $bulk = new MongoDB\Driver\BulkWrite;
    $bulk->delete(['game_id' => $gameId]); // Clear old data

    $count = 0;
    foreach ($rawCards as $raw) {
        // TODO: The GameTora JSON dump contains unreleased and NPC cards (approx ~300 extra cards).
        // Eventually we need to add a filter here (e.g., checking if 'release_en' or 'release' date is valid, or if it's explicitly marked as an NPC card) 
        // to prevent unavailable cards from polluting the database.
        
        // Build proper localized name
        $title = $raw['title_en'] ?? $raw['title_ja'] ?? '';
        $charName = $raw['char_name'] ?? 'Unknown Character';
        $fullName = $title ? "$title $charName" : $charName;
        
        // Convert GameTora Rarity ID to String (1 = R, 2 = SR, 3 = SSR)
        $rarityMap = [1 => 'R', 2 => 'SR', 3 => 'SSR'];
        $rarityNum = $raw['rarity'] ?? 1;
        $rarityStr = $rarityMap[$rarityNum] ?? 'Unknown';
        
        // Capitalize the support card type (e.g., 'speed' -> 'Speed')
        $type = ucfirst($raw['type'] ?? 'Unknown');
        
        $card = [
            'game_id' => $gameId,
            'name' => $fullName,
            'characters' => [$charName],
            'type' => $type,
            'rarity' => $rarityStr,
            'description' => '', // GameTora uses complex effect arrays instead of simple strings, so we leave this blank for now and let the UI parse raw_data.
            
            // Store the entire GameTora dump for this card so our Game Rules Editor can access raw skills/effects later!
            'raw_data' => $raw 
        ];
        
        $bulk->insert($card);
        $count++;
    }
    
    $m->executeBulkWrite('deckbuilder.cards', $bulk);
    echo "Successfully imported $count cards from JSON dump!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

