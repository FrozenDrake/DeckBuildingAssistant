<?php
header('Content-Type: application/json');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_GET; // fallback to GET for simple queries if needed
    }

    $gameId = $input['game_id'] ?? null;
    if (!$gameId) {
        http_response_code(400);
        die(json_encode(['error' => 'Missing game_id parameter']));
    }

    $includeRaw = isset($input['include_raw']) && $input['include_raw'];
    $limit = max(1, min(100, (int)($input['limit'] ?? 50)));
    $skip = max(0, (int)($input['skip'] ?? 0));

    // Compile filter tree to Mongo Query
    function buildQuery($node) {
        if (!isset($node['type'])) return [];
        
        if ($node['type'] === 'group') {
            if (empty($node['children'])) return [];
            $conditions = array_filter(array_map('buildQuery', $node['children']));
            if (empty($conditions)) return [];
            
            $logic = isset($node['logic']) && strtoupper($node['logic']) === 'OR' ? '$or' : '$and';
            return [$logic => array_values($conditions)];
        }
        
        if ($node['type'] === 'rule') {
            $path = $node['field'] ?? '';
            // For raw_path fields, prefix with raw_data.
            if ($path === '__raw_path__') {
                $path = 'raw_data.' . ($node['rawPath'] ?? '');
            }

            $val = $node['value'] ?? '';

            // Skip incomplete rules — field or value not yet selected
            if ($path === '' || $path === 'raw_data.' || $val === '') return [];

            if (is_numeric($val) && !is_string($val)) $val = (float)$val;
            if (is_string($val) && is_numeric($val)) {
                $val = (float)$val;
            }
            
            switch ($node['operator'] ?? 'equals') {
                case 'equals': return [$path => $val];
                case 'does not equal': return [$path => ['$ne' => $val]];
                case 'greater than': return [$path => ['$gt' => $val]];
                case 'less than': return [$path => ['$lt' => $val]];
                case 'greater than or equal': return [$path => ['$gte' => $val]];
                case 'less than or equal': return [$path => ['$lte' => $val]];
                case 'contains':
                    return [$path => new MongoDB\BSON\Regex(preg_quote((string)$val), 'i')];
                case 'does not contain':
                    return [$path => ['$not' => new MongoDB\BSON\Regex(preg_quote((string)$val), 'i')]];
            }
        }
        return [];
    }

    $mongoFilter = ['game_id' => $gameId];

    // Text search
    if (!empty($input['search'])) {
        $mongoFilter['name'] = new MongoDB\BSON\Regex(preg_quote($input['search']), 'i');
    }

    // Collection filter: restrict to a specific set of card IDs
    if (!empty($input['card_ids']) && is_array($input['card_ids'])) {
        $objectIds = array_filter(array_map(function($id) {
            try { return new MongoDB\BSON\ObjectId((string)$id); } catch (\Exception $e) { return null; }
        }, $input['card_ids']));
        if (!empty($objectIds)) {
            $mongoFilter['_id'] = ['$in' => array_values($objectIds)];
        }
    }

    if (isset($input['filters']) && is_array($input['filters'])) {
        $compiled = buildQuery($input['filters']);
        if (!empty($compiled)) {
            $mongoFilter = ['$and' => [$mongoFilter, $compiled]];
        }
    }

    $mongoSort = [];
    if (isset($input['sorts']) && is_array($input['sorts'])) {
        foreach ($input['sorts'] as $s) {
            if (isset($s['field'])) {
                $path = $s['field'] === '__raw_path__' ? 'raw_data.' . $s['rawPath'] : $s['field'];
                $mongoSort[$path] = (isset($s['direction']) && $s['direction'] === 'desc') ? -1 : 1;
            }
        }
    }
    if (empty($mongoSort)) $mongoSort = ['_id' => 1];

    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // Count total documents matching filter
    $countCommand = new MongoDB\Driver\Command([
        'count' => 'cards',
        'query' => $mongoFilter
    ]);
    $countCursor = $m->executeCommand('deckbuilder', $countCommand);
    $totalCount = $countCursor->toArray()[0]->n;

    // Execute paginated query
    $options = [
        'limit' => $limit,
        'skip' => $skip,
        'sort' => $mongoSort
    ];
    
    if (!$includeRaw) {
        $options['projection'] = ['raw_data' => 0];
    }

    $query = new MongoDB\Driver\Query($mongoFilter, $options);
    $cursor = $m->executeQuery('deckbuilder.cards', $query);
    
    $cards = [];
    foreach ($cursor as $document) {
        $doc = (array)$document;
        $doc['id'] = (string)$doc['_id'];
        unset($doc['_id']);
        $cards[] = $doc;
    }
    
    echo json_encode([
        'cards' => $cards,
        'total' => $totalCount,
        'skip' => $skip,
        'limit' => $limit
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
