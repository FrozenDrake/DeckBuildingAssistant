<?php
header('Content-Type: application/json');

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}
$userId = $_SESSION['user_id'];
$gameId = $_POST['game_id'] ?? null;

if (!$gameId || !isset($_FILES['csv'])) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id or csv file']));
}

$file = $_FILES['csv']['tmp_name'];
if (!is_uploaded_file($file)) {
    http_response_code(400);
    die(json_encode(['error' => 'Invalid file upload']));
}

// Read CSV
$handle = fopen($file, "r");
if ($handle === FALSE) {
    http_response_code(500);
    die(json_encode(['error' => 'Failed to read CSV']));
}

$headers = fgetcsv($handle);
if (!$headers) {
    http_response_code(400);
    die(json_encode(['error' => 'Empty or invalid CSV']));
}

// Normalize headers
$normalizedHeaders = array_map(function($h) {
    return strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '', $h)));
}, $headers);

// Find qty column
$qtyIndex = -1;
$qtyAliases = ['count', 'quantity', 'qty', 'amount', 'copies', 'number'];
foreach ($normalizedHeaders as $i => $h) {
    if (in_array($h, $qtyAliases)) {
        $qtyIndex = $i;
        break;
    }
}
if ($qtyIndex === -1) {
    http_response_code(400);
    die(json_encode(['error' => 'Could not find a quantity/count column in CSV']));
}

// Find ID or Name columns
$idIndex = -1;
$nameIndex = -1;
foreach ($normalizedHeaders as $i => $h) {
    if (in_array($h, ['id', 'cardid', 'card_id', 'support_id'])) {
        $idIndex = $i;
    }
    if (in_array($h, ['name', 'cardname', 'card_name', 'char_name', 'title'])) {
        $nameIndex = $i;
    }
}

if ($idIndex === -1 && $nameIndex === -1) {
    http_response_code(400);
    die(json_encode(['error' => 'Could not find an id or name column to match cards against']));
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

    // Build lookup map for all cards in this game to avoid N+1 queries
    $query = new MongoDB\Driver\Query(['game_id' => $gameId], ['projection' => ['_id' => 1, 'id' => 1, 'name' => 1, 'char_name' => 1, 'title_en' => 1, 'rarity' => 1, 'type' => 1, 'image_url' => 1]]);
    $cardsCursor = $m->executeQuery('deckbuilder.cards', $query);

    $cardsById = [];
    $cardsByName = [];
    $cardDetails = [];
    
    foreach ($cardsCursor as $card) {
        $cId = (string)$card->_id;
        $cardDetails[$cId] = [
            'name' => $card->name ?? 'Unknown',
            'rarity' => $card->rarity ?? '',
            'type' => $card->type ?? '',
            'image_url' => $card->image_url ?? ''
        ];
        
        if (isset($card->id)) {
            $cardsById[(string)$card->id] = $cId;
        }
        if (isset($card->name)) {
            $cardsByName[strtolower((string)$card->name)] = $cId;
        }
        if (isset($card->char_name)) {
            $cardsByName[strtolower((string)$card->char_name)] = $cId;
        }
    }

    // Load the current collection document
    $collQuery  = new MongoDB\Driver\Query(['user_id' => $userId, 'game_id' => $gameId]);
    $cursor = $m->executeQuery('deckbuilder.collections', $collQuery);
    $docs   = $cursor->toArray();

    $entries = [];
    $docExists = !empty($docs);
    if ($docExists) {
        $entries = array_map(function($e) { return (array)$e; }, (array)($docs[0]->entries ?? []));
    }
    
    $entriesMap = [];
    foreach ($entries as $i => $e) {
        $entriesMap[(string)$e['card_id']] = $i;
    }

    $cardsAdded = 0;

    while (($row = fgetcsv($handle)) !== FALSE) {
        $qty = (int)($row[$qtyIndex] ?? 0);
        if ($qty <= 0) continue;

        $matchedMongoId = null;

        // Try match by ID
        if ($idIndex !== -1 && isset($row[$idIndex])) {
            $val = (string)$row[$idIndex];
            if (isset($cardsById[$val])) {
                $matchedMongoId = $cardsById[$val];
            }
        }

        // Try match by name if ID failed
        if (!$matchedMongoId && $nameIndex !== -1 && isset($row[$nameIndex])) {
            $val = strtolower(trim((string)$row[$nameIndex]));
            if (isset($cardsByName[$val])) {
                $matchedMongoId = $cardsByName[$val];
            } else {
                // fuzzy match
                foreach ($cardsByName as $dbName => $dbId) {
                    if (strpos($val, $dbName) !== false || strpos($dbName, $val) !== false) {
                        $matchedMongoId = $dbId;
                        break;
                    }
                }
            }
        }

        if ($matchedMongoId) {
            if (isset($entriesMap[$matchedMongoId])) {
                $idx = $entriesMap[$matchedMongoId];
                // Add the new quantity instead of replacing? Usually bulk imports are a full sync, but let's replace or add?
                // Let's set it to the new quantity if it's higher, or just add? 
                // Let's add them since they are importing "more" cards.
                $entries[$idx]['qty'] += $qty;
            } else {
                $details = $cardDetails[$matchedMongoId];
                $entries[] = [
                    'card_id' => $matchedMongoId,
                    'qty'     => $qty,
                    'name'    => $details['name'],
                    'rarity'  => $details['rarity'],
                    'type'    => $details['type'],
                    'image_url'=> $details['image_url']
                ];
                $entriesMap[$matchedMongoId] = count($entries) - 1;
            }
            $cardsAdded += $qty;
        }
    }

    fclose($handle);

    if ($cardsAdded > 0) {
        $entries = array_values($entries);
        $bulk = new MongoDB\Driver\BulkWrite();
        $filter = ['user_id' => $userId, 'game_id' => $gameId];

        if ($docExists) {
            $bulk->update($filter, ['$set' => ['entries' => $entries]]);
        } else {
            $bulk->insert(array_merge($filter, ['entries' => $entries]));
        }

        $m->executeBulkWrite('deckbuilder.collections', $bulk);
    }

    echo json_encode(['success' => true, 'cards_added' => $cardsAdded]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
