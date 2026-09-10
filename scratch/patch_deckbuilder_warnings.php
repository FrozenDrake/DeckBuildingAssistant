<?php
$file = 'src/js/pages/DeckBuilder.js';
$content = file_get_contents($file);

// 1. Add template div
$html = <<<HTML
                    <div class="deck-header">
                        <h3>Current Deck ({{ deck.length }} / {{ maxDeckSize }})</h3>
                        <button class="btn btn-sm btn-outline" @click="clearDeck">Clear</button>
                    </div>
                    
                    <div v-if="deckValidationWarnings.length > 0" style="padding: 10px; background: rgba(255, 165, 0, 0.1); border: 1px dashed orange; color: var(--primary-color); border-radius: 4px; margin-bottom: 10px; font-size: 0.85em;">
                        <strong style="display: block; margin-bottom: 5px; color: orange;">Deck Rule Warnings:</strong>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li v-for="warn in deckValidationWarnings" :key="warn" style="margin-bottom: 3px;">{{ warn }}</li>
                        </ul>
                    </div>
HTML;

$content = preg_replace('/                    <div class="deck-header">[\s\S]*?<\/div>/', $html, $content, 1);

// 2. Add computed property
$js = <<<JS
        const isSmallDeck = computed(() => maxDeckSize.value <= 10);

        const deckValidationWarnings = computed(() => {
            const warnings = [];
            const deckRules = currentGame.value.deck_rules || [];
            
            for (const rule of deckRules) {
                if (rule.type === 'aggregate_attribute') {
                    const prop = rule.property;
                    const operator = rule.operator; // 'sum' or 'average'
                    const condition = rule.condition; // '>=', '<=', '==', '>', '<'
                    const value = parseFloat(rule.value);
                    
                    if (!prop || !operator || !condition || isNaN(value)) continue;
                    
                    let validCardsCount = 0;
                    let total = 0;
                    
                    for (const card of deck.value) {
                        let val = card[prop];
                        if (val !== undefined && val !== null && val !== '') {
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed)) {
                                total += parsed;
                                validCardsCount++;
                            }
                        }
                    }
                    
                    let aggregateVal = 0;
                    if (operator === 'sum') {
                        aggregateVal = total;
                    } else if (operator === 'average') {
                        aggregateVal = validCardsCount > 0 ? total / validCardsCount : 0;
                    }
                    
                    let passes = true;
                    if (condition === '>=') passes = aggregateVal >= value;
                    else if (condition === '<=') passes = aggregateVal <= value;
                    else if (condition === '==') passes = aggregateVal === value;
                    else if (condition === '>') passes = aggregateVal > value;
                    else if (condition === '<') passes = aggregateVal < value;
                    
                    if (!passes) {
                        warnings.push(rule.error_message || \`Aggregate rule failed: \${operator} of \${prop} must be \${condition} \${value} (Current: \${aggregateVal.toFixed(1)})\`);
                    }
                }
            }
            return warnings;
        });

        // Server-Side Data State
JS;

$content = str_replace("        const isSmallDeck = computed(() => maxDeckSize.value <= 10);\n\n        // Server-Side Data State", $js, $content);

// 3. Export deckValidationWarnings
$content = str_replace("isSmallDeck,\n            cards", "isSmallDeck,\n            deckValidationWarnings,\n            cards", $content);

file_put_contents($file, $content);
