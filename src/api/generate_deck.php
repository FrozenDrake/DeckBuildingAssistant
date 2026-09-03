<?php
header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Method Not Allowed. Use POST.']));
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

$gameId = $input['game_id'] ?? null;
if (!$gameId) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing game_id']));
}

$slots = $input['slots'] ?? [];
$scoring = $input['scoring'] ?? [];
$globalFilters = $input['global_filters'] ?? null;

// Helper: Dot-notation traverse
function getValueAtPath($obj, $path) {
    if (!$path) return null;
    $keys = explode('.', $path);
    $curr = $obj;
    foreach ($keys as $key) {
        if (is_array($curr) && array_key_exists($key, $curr)) {
            $curr = $curr[$key];
        } else {
            return null;
        }
    }
    return $curr;
}

// Helper: Single Rule Evaluation
function matchesRule($card, $rule) {
    $raw = null;
    if (isset($rule['field']) && $rule['field'] === '__raw_path__') {
        $raw = getValueAtPath($card['raw_data'] ?? [], $rule['rawPath'] ?? '');
    } else {
        $field = $rule['field'] ?? '';
        $raw = $card[$field] ?? null;
    }

    $haystack = '';
    if (is_array($raw)) {
        // Flatten simple arrays to string
        $haystack = strtolower(implode(' ', array_map('strval', $raw)));
    } else {
        $haystack = strtolower(strval($raw ?? ''));
    }
    $needle = strtolower(strval($rule['value'] ?? ''));

    $numHaystack = is_numeric($raw) ? (float)$raw : null;
    $numNeedle = isset($rule['value']) && is_numeric($rule['value']) ? (float)$rule['value'] : null;

    $operator = $rule['operator'] ?? 'contains';
    switch ($operator) {
        case 'contains': return strpos($haystack, $needle) !== false;
        case 'does not contain': return strpos($haystack, $needle) === false;
        case 'equals': return $haystack === $needle;
        case 'does not equal': return $haystack !== $needle;
        case 'greater than': return $numHaystack !== null && $numNeedle !== null && $numHaystack > $numNeedle;
        case 'less than': return $numHaystack !== null && $numNeedle !== null && $numHaystack < $numNeedle;
        case 'greater than or equal': return $numHaystack !== null && $numNeedle !== null && $numHaystack >= $numNeedle;
        case 'less than or equal': return $numHaystack !== null && $numNeedle !== null && $numHaystack <= $numNeedle;
        default: return true;
    }
}

// Helper: Recursive Node Evaluation
function matchesNode($card, $node) {
    if (!isset($node['type'])) return true;
    if ($node['type'] === 'rule') return matchesRule($card, $node);
    if ($node['type'] === 'group') {
        $children = $node['children'] ?? [];
        if (empty($children)) return true; // empty group matches anything

        $isOr = ($node['logic'] ?? 'AND') === 'OR';
        $matched = $isOr ? false : true;

        foreach ($children as $child) {
            $childMatch = matchesNode($card, $child);
            if ($isOr) {
                if ($childMatch) { $matched = true; break; }
            } else {
                if (!$childMatch) { $matched = false; break; }
            }
        }
        
        $negate = $node['negate'] ?? false;
        return $negate ? !$matched : $matched;
    }
    return true;
}

try {
    $m = new MongoDB\Driver\Manager(getenv('MONGO_URI'));
    
    // 1. Get Game Config
    $gameQuery = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($gameId)]);
    $gameCursor = $m->executeQuery('deckbuilder.games', $gameQuery);
    $game = null;
    foreach ($gameCursor as $g) { $game = (array)$g; break; }
    
    if (!$game) {
        http_response_code(404);
        die(json_encode(['error' => 'Game not found']));
    }

    $maxCopiesPerCard = $game['max_copies_per_card'] ?? 4;
    $deckRules = $game['deck_rules'] ?? [];
    
    // 2. Fetch Cards
    $query = new MongoDB\Driver\Query(['game_id' => $gameId]);
    $cursor = $m->executeQuery('deckbuilder.cards', $query);
    
    $cards = [];
    foreach ($cursor as $doc) {
        $card = (array)$doc;
        $card['id'] = (string)$card['_id'];
        unset($card['_id']);
        
        // Convert bson document to associative array for raw_data
        if (isset($card['raw_data'])) {
            $card['raw_data'] = json_decode(json_encode($card['raw_data']), true);
        }
        // Force characters to array if it is an object
        if (isset($card['characters']) && is_object($card['characters'])) {
             $card['characters'] = (array)$card['characters'];
        }
        
        // Initial score
        $card['score'] = 0;
        $cards[] = $card;
    }

    // 3. Score Cards
    foreach ($cards as &$card) {
        foreach ($scoring as $scoreRule) {
            $filters = $scoreRule['filters'] ?? null;
            $weight = (float)($scoreRule['weight'] ?? 0);
            if ($filters && matchesNode($card, $filters)) {
                $card['score'] += $weight;
            }
        }
        
        // Add a tiny fraction based on rarity to tiebreak equal scores
        $rarityOrder = ['SSR' => 3, 'SR' => 2, 'R' => 1];
        $rStr = $card['rarity'] ?? '';
        $card['score'] += (($rarityOrder[$rStr] ?? 0) * 0.001);
    }
    unset($card);

    // 4. Sort Cards by Score (Descending)
    usort($cards, function($a, $b) {
        return $b['score'] <=> $a['score'];
    });

    // 5. Greedy Selection
    $deck = [];
    $cardCounts = [];
    $usedUniqueProperties = [];
    $warnings = [];

    foreach ($slots as $slotIndex => $slot) {
        $needed = (int)($slot['count'] ?? 0);
        $filters = $slot['filters'] ?? null;
        
        while ($needed > 0) {
            $bestCard = null;
            
            foreach ($cards as $card) {
                $cardId = $card['id'];
                $currentCopies = $cardCounts[$cardId] ?? 0;
                
                // Copy limit
                if ($currentCopies >= $maxCopiesPerCard) continue;
                
                // Dynamic Game Rules (`deck_rules`)
                $violatesUnique = false;
                foreach ($deckRules as $rule) {
                    if (($rule['type'] ?? '') === 'unique_property') {
                        $prop = $rule['property'] ?? '';
                        $isArray = $rule['is_array'] ?? false;
                        
                        $cardPropValue = $card[$prop] ?? ($isArray ? [] : null);
                        
                        if ($isArray) {
                            foreach ((array)$cardPropValue as $val) {
                                if (isset($usedUniqueProperties[$prop][$val])) {
                                    $violatesUnique = true;
                                    break 2;
                                }
                            }
                        } else {
                            if ($cardPropValue !== null && isset($usedUniqueProperties[$prop][$cardPropValue])) {
                                $violatesUnique = true;
                                break;
                            }
                        }
                    }
                }
                if ($violatesUnique) continue;
                
                // Global Filters
                if ($globalFilters && !matchesNode($card, $globalFilters)) continue;

                // Slot filter
                if ($filters && !matchesNode($card, $filters)) continue;
                
                // We found the best valid card!
                $bestCard = $card;
                break;
            }
            
            if ($bestCard) {
                $deckCard = $bestCard;
                unset($deckCard['raw_data']); // Do not send raw_data back for deck listing
                
                $deck[] = $deckCard;
                $cardId = $bestCard['id'];
                $cardCounts[$cardId] = ($cardCounts[$cardId] ?? 0) + 1;
                
                // Track properties used by this card for dynamic rule enforcement
                foreach ($deckRules as $rule) {
                    if (($rule['type'] ?? '') === 'unique_property') {
                        $prop = $rule['property'] ?? '';
                        $isArray = $rule['is_array'] ?? false;
                        $cardPropValue = $bestCard[$prop] ?? ($isArray ? [] : null);
                        
                        if (!isset($usedUniqueProperties[$prop])) {
                            $usedUniqueProperties[$prop] = [];
                        }
                        
                        if ($isArray) {
                            foreach ((array)$cardPropValue as $val) {
                                $usedUniqueProperties[$prop][$val] = true;
                            }
                        } else if ($cardPropValue !== null) {
                            $usedUniqueProperties[$prop][$cardPropValue] = true;
                        }
                    }
                }
                
                $needed--;
            } else {
                $warnings[] = "Slot " . ($slotIndex + 1) . " was short by $needed card(s). No valid cards matched the filters and constraints.";
                break; // Break the while loop, move to next slot
            }
        }
    }

    echo json_encode([
        'deck' => $deck,
        'warnings' => $warnings,
        'metrics' => [
            'total_cards_scored' => count($cards),
            'deck_size' => count($deck)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
