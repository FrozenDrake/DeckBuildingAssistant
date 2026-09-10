<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['success' => false, 'error' => 'You must be logged in to use AI features.']));
}

require_once __DIR__ . '/rate_limit.php';

$input = json_decode(file_get_contents('php://input'), true);
$gameId = $input['game_id'] ?? null;
$prompt = $input['prompt'] ?? null;

if (!$gameId || !$prompt) {
    echo json_encode(['success' => false, 'error' => 'Missing game_id or prompt']);
    exit;
}

$apiKey = getenv('GEMINI_API_KEY');
if (empty($apiKey) || $apiKey === 'YOUR_KEY_HERE') {
    echo json_encode(['success' => false, 'error' => 'GEMINI_API_KEY is missing or not configured in .env']);
    exit;
}

$m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

$rl = checkRateLimit($m, $_SESSION['user_id'], 'ai', 20);
if (!$rl['allowed']) {
    http_response_code(429);
    die(json_encode(['success' => false, 'error' => $rl['error']]));
}

// Fetch game schema
$query = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
$game = current($m->executeQuery('deckbuilder.games', $query)->toArray());
$schemaStr = json_encode($game->card_schema);
$deckRules = json_encode($game->deck_rules ?? []);
$maxDeckSize = $game->max_deck_size ?? 60;

// Fetch a single card to show the LLM the exact document structure
$cardQuery = new MongoDB\Driver\Query(['game_id' => $gameId], ['limit' => 1, 'projection' => ['raw_data' => 0, '_id' => 0, 'game_id' => 0]]);
$sampleCard = current($m->executeQuery('deckbuilder.cards', $cardQuery)->toArray());
$sampleCardStr = json_encode($sampleCard, JSON_PRETTY_PRINT);

$systemInstruction = "You are an expert deck builder for the game '{$game->name}'.
You must generate a synergistic deck of exactly {$maxDeckSize} cards based on the user's prompt.

CARD SCHEMA (Top-level metadata):
{$schemaStr}

SAMPLE CARD DOCUMENT (Reference this for nested structures like 'skills.name_en'):
{$sampleCardStr}

The game rules are: {$deckRules}.

You have access to tools:
1. query_card_database: Use this to query the card database to find cards that fit your strategy.

WORKFLOW:
1. Formulate a strategy based on the prompt.
2. Call query_card_database to find specific cards based ONLY on the exact fields provided in the schema. (e.g. For 'name' searches, use the 'regex' operator since exact names have titles like '[Tracen Academy] Special Week').
3. You may query up to 3 times to gather enough candidates. Do not keep querying if you get 0 results; adjust your strategy or use the cards you have.
4. Once you have finalized your deck of EXACTLY {$maxDeckSize} cards that satisfy the rules, output a single JSON block as your final response.

CRITICAL INSTRUCTIONS:
- DO NOT make more than 3 tool calls.
- DO NOT output conversational text alongside the final JSON block. Your final response MUST be ONLY the JSON block.
- Keep your explanation extremely concise (1-3 sentences max). Do not use fluff words like \"Here is a deck\" or \"This deck focuses on\". Just state the core mechanics and synergies.
- ENSURE the cards release date is NOT in the future.

FINAL RESPONSE FORMAT:
```json
{
  \"explanation\": \"Concise 1-3 sentence summary of the core strategy and synergies...\",
  \"card_ids\": [\"id1\", \"id2\", ...]
}
```
DO NOT output the final JSON until you have called query_card_database and verified the cards exist. DO NOT output conversational text alongside the final JSON block, just the JSON block.";

function callGemini($apiKey, $contents, $systemInstruction) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" . $apiKey;
    
    $payload = [
        'systemInstruction' => [
            'parts' => [['text' => $systemInstruction]]
        ],
        'contents' => $contents,
        'tools' => [
            ['functionDeclarations' => [
                [
                    'name' => 'query_card_database',
                    'description' => 'Query the card database. Returns max 50 matching cards.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'filters' => [
                                'type' => 'ARRAY',
                                'items' => [
                                    'type' => 'OBJECT',
                                    'properties' => [
                                        'field' => ['type' => 'STRING', 'description' => 'Schema field name (e.g. name, type, rarity, skills.trigger_conditions.running_style)'],
                                        'operator' => ['type' => 'STRING', 'description' => '==, !=, >, <, >=, <=, regex'],
                                        'value' => ['type' => 'STRING', 'description' => 'Value to match']
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]]
        ]
    ];
    
    $payloadJson = json_encode($payload);
    
    $maxRetries = 3;
    $attempt = 0;
    
    while ($attempt < $maxRetries) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $decoded = json_decode($response, true);
        
        // If we hit a 503 or 429 quota/burst error, sleep and retry
        if (isset($decoded['error']['code']) && in_array($decoded['error']['code'], [429, 503])) {
            $attempt++;
            if ($attempt < $maxRetries) {
                sleep(2); // wait 2 seconds before retrying
                continue;
            }
        }
        
        return $decoded;
    }
    return json_decode($response, true);
}

function executeQuery($m, $gameId, $filters) {
    $mongoQuery = ['game_id' => $gameId];
    
    // Globally hide unreleased cards from the AI (comparing against Japan release date by default)
    // The format in the JSON is "YYYY-MM-DD"
    $mongoQuery['release'] = ['$lte' => date('Y-m-d')];

    if (is_array($filters)) {
        foreach ($filters as $f) {
            $field = $f['field'] ?? null;
            $op = $f['operator'] ?? '==';
            $val = $f['value'] ?? null;
            if ($field && $val !== null) {
                if (is_numeric($val) && $op !== 'regex') $val = (float)$val;
                
                if ($op === '==') $mongoQuery[$field] = $val;
                else if ($op === '!=') $mongoQuery[$field] = ['$ne' => $val];
                else if ($op === '>') $mongoQuery[$field] = ['$gt' => $val];
                else if ($op === '<') $mongoQuery[$field] = ['$lt' => $val];
                else if ($op === '>=') $mongoQuery[$field] = ['$gte' => $val];
                else if ($op === '<=') $mongoQuery[$field] = ['$lte' => $val];
                else if ($op === 'regex') $mongoQuery[$field] = new MongoDB\BSON\Regex($val, 'i');
            }
        }
    }
    
    $options = ['limit' => 50, 'projection' => ['_id' => 0, 'id' => 1, 'name' => 1, 'rarity' => 1, 'type' => 1, 'characters' => 1, 'skills.name_en' => 1]]; 
    $q = new MongoDB\Driver\Query($mongoQuery, $options);
    $cursor = $m->executeQuery('deckbuilder.cards', $q);
    return $cursor->toArray();
}

$contents = [
    [
        'role' => 'user',
        'parts' => [['text' => $prompt]]
    ]
];

$maxTurns = 8;
$turn = 0;
$finalJson = null;
$agentLogs = [];

while ($turn < $maxTurns) {
    if ($turn > 0) {
        // Space out requests by 1 second to avoid triggering Google's free-tier burst limit / 503 High Demand errors
        sleep(1);
    }

    $response = callGemini($apiKey, $contents, $systemInstruction);
    
    if (isset($response['error'])) {
        echo json_encode(['success' => false, 'error' => $response['error']['message'] ?? 'API Error']);
        exit;
    }
    
    $part = $response['candidates'][0]['content']['parts'][0] ?? null;
    if (!$part) {
        echo json_encode(['success' => false, 'error' => 'Unexpected API response structure']);
        exit;
    }
    
    $contents[] = $response['candidates'][0]['content'];
    
    if (isset($part['functionCall'])) {
        $fc = $part['functionCall'];
        if ($fc['name'] === 'query_card_database') {
            $args = $fc['args'] ?? [];
            $filters = $args['filters'] ?? [];
            $agentLogs[] = "Querying database with " . count($filters) . " filters...";
            $results = executeQuery($m, $gameId, $filters);
            
            $contents[] = [
                'role' => 'user',
                'parts' => [
                    [
                        'functionResponse' => [
                            'name' => 'query_card_database',
                            'response' => ['cards_found' => count($results), 'cards' => $results]
                        ]
                    ]
                ]
            ];
            $turn++;
            continue;
        }
    }
    
    $text = $part['text'] ?? '';
    if (preg_match('/```json\s*(.*?)\s*```/s', $text, $matches)) {
        $finalJson = json_decode($matches[1], true);
        break;
    }
    
    $parsed = json_decode($text, true);
    if ($parsed && isset($parsed['card_ids'])) {
        $finalJson = $parsed;
        break;
    }
    
    $agentLogs[] = "Thinking...";
    $contents[] = [
        'role' => 'user',
        'parts' => [['text' => 'Please continue, or output the final JSON block if you are finished.']]
    ];
    $turn++;
}

if ($finalJson && isset($finalJson['card_ids'])) {
    $ids = $finalJson['card_ids'];
    $deckCards = [];
    if (!empty($ids)) {
        // Fetch full cards
        // IDs might be int or string, so we use $in loosely
        $inArr = array_map(function($id) { return is_numeric($id) ? (float)$id : $id; }, $ids);
        $q = new MongoDB\Driver\Query(['game_id' => $gameId, 'id' => ['$in' => $inArr]]);
        $deckCards = $m->executeQuery('deckbuilder.cards', $q)->toArray();
        // Fallback for string ids vs ints
        if (count($deckCards) < count($inArr)) {
            $inArr2 = array_map(function($id) { return (string)$id; }, $ids);
            $q2 = new MongoDB\Driver\Query(['game_id' => $gameId, 'id' => ['$in' => $inArr2]]);
            $deckCards2 = $m->executeQuery('deckbuilder.cards', $q2)->toArray();
            foreach ($deckCards2 as $c) {
                if (!in_array($c, $deckCards)) $deckCards[] = $c;
            }
        }
    }
    
    $finalJson['deck'] = $deckCards;
    incrementRateLimit($m, $_SESSION['user_id'], 'ai');
    echo json_encode(['success' => true, 'data' => $finalJson, 'logs' => $agentLogs]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to generate a deck within turn limit.', 'raw' => $response]);
}
