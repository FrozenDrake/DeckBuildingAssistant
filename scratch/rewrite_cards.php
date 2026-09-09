<?php
$raw = file_get_contents('public/data/cards.json');
$cards = json_decode($raw, true);

foreach ($cards as &$card) {
    if (isset($card['name']) && preg_match('/\]\s*(.*)$/', $card['name'], $matches)) {
        $charName = trim($matches[1]);
        if ($charName) {
            $card['characters'] = [$charName];
        }
    }

    if (isset($card['skills']) && is_array($card['skills'])) {
        foreach ($card['skills'] as &$skill) {
            if (isset($skill['trigger_conditions']) && is_array($skill['trigger_conditions'])) {
                $newConds = [];
                // Check if it's currently an array of objects
                if (isset($skill['trigger_conditions'][0]) && is_array($skill['trigger_conditions'][0])) {
                    foreach ($skill['trigger_conditions'] as $tc) {
                        if (isset($tc['variable'])) {
                            $var = $tc['variable'];
                            $val = $tc['value'];
                            if (!isset($newConds[$var])) {
                                $newConds[$var] = [];
                            }
                            if (!in_array($val, $newConds[$var])) {
                                $newConds[$var][] = $val;
                            }
                        }
                    }
                    
                    // Simplify single-element arrays to scalar values
                    foreach ($newConds as $k => $v) {
                        if (count($v) === 1) {
                            $newConds[$k] = $v[0];
                        }
                    }
                    
                    $skill['trigger_conditions'] = $newConds;
                }
            }
        }
    }
}

file_put_contents('public/data/cards.json', json_encode($cards, JSON_PRETTY_PRINT));
echo "Rewrote cards.json\n";
