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

$query = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
$game = current($m->executeQuery('deckbuilder.games', $query)->toArray());
$schemaStr = json_encode($game->card_schema);

// Fetch a single card to show the LLM the exact document structure (for deep nested fields like skills)
$cardQuery = new MongoDB\Driver\Query(['game_id' => $gameId], ['limit' => 1, 'projection' => ['raw_data' => 0, '_id' => 0, 'game_id' => 0]]);
$sampleCard = current($m->executeQuery('deckbuilder.cards', $cardQuery)->toArray());
$sampleCardStr = json_encode($sampleCard, JSON_PRETTY_PRINT);

$systemInstruction = "You are an expert filter builder for the game '{$game->name}'.
Your job is to translate the user's natural language request into a strictly formatted JSON filter tree based on the provided schema and document structure.

SCHEMA METADATA (Top-level types):
{$schemaStr}

SAMPLE CARD DOCUMENT (Shows the actual nested structure you can query, like 'skills.name_en'):
{$sampleCardStr}

OUTPUT FORMAT:
Your output MUST be a valid JSON object representing a recursive filter tree.
A node is either a 'group' or a 'rule'.
Group Node:
{
  \"type\": \"group\",
  \"logic\": \"AND\" | \"OR\",
  \"children\": [ <nodes> ]
}
Rule Node (for top-level schema fields):
{
  \"type\": \"rule\",
  \"field\": \"<exact_field_name_from_schema_metadata>\",
  \"operator\": \"equals\" | \"does not equal\" | \"greater than\" | \"less than\" | \"greater than or equal\" | \"less than or equal\" | \"contains\" | \"does not contain\",
  \"value\": <string, number, boolean>
}
Rule Node (for deep nested fields from the Sample Card that aren't in the schema metadata):
{
  \"type\": \"rule\",
  \"field\": \"__raw_path__\",
  \"rawPath\": \"<json_path_from_sample_card>\",
  \"operator\": \"equals\" | \"does not equal\" | \"greater than\" | \"less than\" | \"greater than or equal\" | \"less than or equal\" | \"contains\" | \"does not contain\",
  \"value\": <string, number, boolean>
}

CRITICAL RULES:
- The root node MUST be a 'group' node.
- If a field is explicitly listed in SCHEMA METADATA, use it as the 'field'.
- If a field is ONLY seen inside the SAMPLE CARD DOCUMENT (like 'skills.description_en'), you MUST set 'field' to '__raw_path__' and set 'rawPath' to the JSON dot-notation path!
- For string fields, ALWAYS use the 'contains' operator if the user asks for a substring (e.g. searching descriptions for 'mile' or 'front').
- DO NOT output any conversational text or markdown blocks. ONLY output the raw JSON object.
- Example: If the user says 'Speed or Stamina SSR cards', output:
{
  \"type\": \"group\",
  \"logic\": \"AND\",
  \"children\": [
    { \"type\": \"rule\", \"field\": \"rarity\", \"operator\": \"equals\", \"value\": \"SSR\" },
    {
      \"type\": \"group\",
      \"logic\": \"OR\",
      \"children\": [
        { \"type\": \"rule\", \"field\": \"type\", \"operator\": \"equals\", \"value\": \"speed\" },
        { \"type\": \"rule\", \"field\": \"type\", \"operator\": \"equals\", \"value\": \"stamina\" }
      ]
    }
  ]
}
";

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" . $apiKey;

$payload = [
    'systemInstruction' => [
        'parts' => [['text' => $systemInstruction]]
    ],
    'contents' => [
        [
            'role' => 'user',
            'parts' => [['text' => $prompt]]
        ]
    ],
    'generationConfig' => [
        'responseMimeType' => 'application/json'
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$response = curl_exec($ch);
curl_close($ch);

$decoded = json_decode($response, true);

if (isset($decoded['error'])) {
    echo json_encode(['success' => false, 'error' => $decoded['error']['message'] ?? 'API Error']);
    exit;
}

$text = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? null;
if ($text) {
    $jsonObj = json_decode($text, true);
    if ($jsonObj) {
        incrementRateLimit($m, $_SESSION['user_id'], 'ai');
        echo json_encode(['success' => true, 'filter' => $jsonObj]);
    } else {
        echo json_encode(['success' => false, 'error' => 'LLM returned invalid JSON.']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'LLM returned empty response.']);
}
