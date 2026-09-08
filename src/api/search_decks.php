<?php
/**
 * api/search_decks.php
 *
 * Paginated deck search endpoint for the Browse Decks page.
 * Accepts a JSON POST body with:
 *   - game_id (required): string
 *   - skip: int (default 0)
 *   - limit: int (default 20, max 50)
 *   - search: string — filters deck name by case-insensitive substring
 *   - filters: ComplexFilterNode tree — same format as search_cards.php
 *   - sorts: array of { field, direction } objects
 *
 * Filter field keys prefixed with 'card.' are translated into $elemMatch
 * queries against the nested `cards` array, so users can find decks
 * containing cards with specific properties (e.g. card.rarity = SSR).
 *
 * Returns:
 *   { decks: [...], total: int, skip: int, limit: int }
 */
header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = [];

    $gameId = $input['game_id'] ?? null;
    if (!$gameId) {
        http_response_code(400);
        die(json_encode(['error' => 'Missing game_id parameter']));
    }

    $limit = max(1, min(50, (int)($input['limit'] ?? 20)));
    $skip  = max(0, (int)($input['skip'] ?? 0));

    // -----------------------------------------------------------------------
    // Recursive filter tree compiler (same logic as search_cards.php).
    // Keys prefixed with 'card.' are wrapped in $elemMatch against the cards array.
    // -----------------------------------------------------------------------
    function buildDeckQuery($node) {
        if (!isset($node['type'])) return [];

        if ($node['type'] === 'group') {
            if (empty($node['children'])) return [];
            $conditions = array_filter(array_map('buildDeckQuery', $node['children']));
            if (empty($conditions)) return [];
            $logic = (isset($node['logic']) && strtoupper($node['logic']) === 'OR') ? '$or' : '$and';
            return [$logic => array_values($conditions)];
        }

        if ($node['type'] === 'rule') {
            $key = $node['field'] ?? '';
            $val = $node['value'] ?? '';

            // Skip incomplete rules — field or value not yet selected
            if ($key === '' || $val === '') return [];

            // Coerce numeric strings to float for comparison operators
            if (is_string($val) && is_numeric($val)) $val = (float)$val;

            $condition = null;
            switch ($node['operator'] ?? 'equals') {
                case 'equals':               $condition = $val; break;
                case 'does not equal':       $condition = ['$ne' => $val]; break;
                case 'greater than':         $condition = ['$gt' => $val]; break;
                case 'less than':            $condition = ['$lt' => $val]; break;
                case 'greater than or equal':$condition = ['$gte' => $val]; break;
                case 'less than or equal':   $condition = ['$lte' => $val]; break;
                case 'contains':
                    $condition = new MongoDB\BSON\Regex(preg_quote((string)$val), 'i'); break;
                case 'does not contain':
                    $condition = ['$not' => new MongoDB\BSON\Regex(preg_quote((string)$val), 'i')]; break;
                default: return [];
            }

            if ($condition === null) return [];

            if (str_starts_with($key, 'card.')) {
                // Card-level field: use $elemMatch against the embedded cards array
                $cardField = substr($key, 5); // strip 'card.' prefix
                return ['cards' => ['$elemMatch' => [$cardField => $condition]]];
            }

            return [$key => $condition];
        }

        return [];
    }

    // -----------------------------------------------------------------------
    // Build the Mongo filter
    // -----------------------------------------------------------------------
    $mongoFilter = ['game_id' => $gameId];

    // Text search on deck name
    if (!empty($input['search'])) {
        $mongoFilter['name'] = new MongoDB\BSON\Regex(preg_quote($input['search']), 'i');
    }

    // Complex filter tree
    if (isset($input['filters']) && is_array($input['filters'])) {
        $compiled = buildDeckQuery($input['filters']);
        if (!empty($compiled)) {
            $mongoFilter = ['$and' => [$mongoFilter, $compiled]];
        }
    }

    // -----------------------------------------------------------------------
    // Build sort
    // -----------------------------------------------------------------------
    $mongoSort = [];
    if (isset($input['sorts']) && is_array($input['sorts'])) {
        foreach ($input['sorts'] as $s) {
            if (isset($s['field'])) {
                // Card-level sorts are not meaningful at the deck document level;
                // skip them and let only top-level deck fields through.
                if (!str_starts_with($s['field'], 'card.')) {
                    $dir = (isset($s['direction']) && $s['direction'] === 'asc') ? 1 : -1;
                    $mongoSort[$s['field']] = $dir;
                }
            }
        }
    }
    // Default: newest first
    if (empty($mongoSort)) $mongoSort = ['created_at' => -1];

    // -----------------------------------------------------------------------
    // Execute count + paginated query
    // -----------------------------------------------------------------------
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));

    $countCommand = new MongoDB\Driver\Command([
        'count' => 'decks',
        'query' => $mongoFilter,
    ]);
    $countCursor = $m->executeCommand('deckbuilder', $countCommand);
    $totalCount  = $countCursor->toArray()[0]->n;

    $options = [
        'limit' => $limit,
        'skip'  => $skip,
        'sort'  => $mongoSort,
    ];

    $query  = new MongoDB\Driver\Query($mongoFilter, $options);
    $cursor = $m->executeQuery('deckbuilder.decks', $query);

    $decks = [];
    foreach ($cursor as $document) {
        $doc = (array)$document;
        $doc['id'] = (string)$doc['_id'];
        unset($doc['_id']);
        // Ensure cards is always an array on the frontend
        if (!isset($doc['cards'])) $doc['cards'] = [];
        $decks[] = $doc;
    }

    echo json_encode([
        'decks' => $decks,
        'total' => $totalCount,
        'skip'  => $skip,
        'limit' => $limit,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
