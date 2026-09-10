<?php
$file = 'src/js/pages/DeckBuilder.js';
$content = file_get_contents($file);

$js = <<<JS
        const tuningProgress = computed(() => {
            const getNestedValue = (obj, path) => {
                if (!path) return undefined;
                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
            };

            const resolveSchemaValue = (card, propKey) => {
                const schema = currentGame.value.card_schema || [];
                const fieldDef = schema.find(f => f.key === propKey);
                if (fieldDef && fieldDef.field === '__raw_path__' && fieldDef.rawPath) {
                    // GameTora specific hack: if rawPath has a '-1' array index, we need to handle it.
                    // e.g. "levels.-1.effects.Race Bonus"
                    if (fieldDef.rawPath.includes('.-1.') && card.raw_data) {
                        const parts = fieldDef.rawPath.split('.-1.');
                        const arrayObj = getNestedValue(card.raw_data, parts[0]);
                        if (Array.isArray(arrayObj) && arrayObj.length > 0) {
                            return getNestedValue(arrayObj[arrayObj.length - 1], parts[1]);
                        }
                    }
                    return getNestedValue(card.raw_data, fieldDef.rawPath);
                }
                // default to just the property key or field path
                const path = fieldDef ? (fieldDef.field || propKey) : propKey;
                return getNestedValue(card, path);
            };

            return deckTuningTargets.value.map(target => {
                let validCardsCount = 0;
                let total = 0;
                for (const card of deck.value) {
                    let val = resolveSchemaValue(card, target.property);
JS;

$content = preg_replace('/        const tuningProgress = computed\(\(\) => \{[\s\S]*?for \(const card of deck\.value\) \{[\s\S]*?let val = getNestedValue\(card, target\.property\);/', $js, $content);

$jsWarnings = <<<JS
        const deckValidationWarnings = computed(() => {
            const getNestedValue = (obj, path) => {
                if (!path) return undefined;
                return path.split('.').reduce((acc, part) => acc && acc[part], obj);
            };

            const resolveSchemaValue = (card, propKey) => {
                const schema = currentGame.value.card_schema || [];
                const fieldDef = schema.find(f => f.key === propKey);
                if (fieldDef && fieldDef.field === '__raw_path__' && fieldDef.rawPath) {
                    if (fieldDef.rawPath.includes('.-1.') && card.raw_data) {
                        const parts = fieldDef.rawPath.split('.-1.');
                        const arrayObj = getNestedValue(card.raw_data, parts[0]);
                        if (Array.isArray(arrayObj) && arrayObj.length > 0) {
                            return getNestedValue(arrayObj[arrayObj.length - 1], parts[1]);
                        }
                    }
                    return getNestedValue(card.raw_data, fieldDef.rawPath);
                }
                const path = fieldDef ? (fieldDef.field || propKey) : propKey;
                return getNestedValue(card, path);
            };

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
                        let val = resolveSchemaValue(card, prop);
JS;

$content = preg_replace('/        const deckValidationWarnings = computed\(\(\) => \{[\s\S]*?for \(const card of deck\.value\) \{[\s\S]*?let val = getNestedValue\(card, prop\);/', $jsWarnings, $content);

file_put_contents($file, $content);
