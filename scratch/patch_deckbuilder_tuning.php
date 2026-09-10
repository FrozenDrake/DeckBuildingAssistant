<?php
$file = 'src/js/pages/DeckBuilder.js';
$content = file_get_contents($file);

// 1. Add deckTuningTargets and compute progress
$js = <<<JS
        const deckValidationWarnings = computed(() => {
JS;
$insertJs = <<<JS
        const deckTuningTargets = ref([]);
        const showTuningPopout = ref(true);

        const tuningProgress = computed(() => {
            return deckTuningTargets.value.map(target => {
                let validCardsCount = 0;
                let total = 0;
                for (const card of deck.value) {
                    let val = card[target.property];
                    if (val !== undefined && val !== null && val !== '') {
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) {
                            total += parsed;
                            validCardsCount++;
                        }
                    }
                }
                
                let currentVal = 0;
                if (target.operator === 'sum') currentVal = total;
                else if (target.operator === 'average') currentVal = validCardsCount > 0 ? total / validCardsCount : 0;
                
                let passes = false;
                const value = parseFloat(target.value);
                if (target.condition === '>=') passes = currentVal >= value;
                else if (target.condition === '<=') passes = currentVal <= value;
                else if (target.condition === '==') passes = currentVal === value;
                else if (target.condition === '>') passes = currentVal > value;
                else if (target.condition === '<') passes = currentVal < value;

                return { ...target, currentVal, passes };
            });
        });

        const deckValidationWarnings = computed(() => {
JS;
$content = str_replace($js, $insertJs, $content);

// 2. Add tuning targets popout HTML
$html = <<<HTML
                    <!-- Tuning Targets Popout -->
                    <div v-if="deckTuningTargets.length > 0" class="tuning-popout" :class="{ 'collapsed': !showTuningPopout }" style="position: fixed; bottom: 20px; right: 20px; background: var(--surface-color); border: 2px solid var(--primary-color); border-radius: 8px; width: 300px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 999; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="background: var(--primary-color); color: var(--bg-color); padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: bold;" @click="showTuningPopout = !showTuningPopout">
                            <span>🎯 Tuning Targets</span>
                            <span v-if="showTuningPopout">▼</span>
                            <span v-else>▲</span>
                        </div>
                        <div v-if="showTuningPopout" style="padding: 15px;">
                            <div v-for="(tp, idx) in tuningProgress" :key="idx" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9em;">
                                    <span>{{ tp.operator }} {{ tp.property }} {{ tp.condition }} {{ tp.value }}</span>
                                    <span :style="{ color: tp.passes ? 'lime' : 'orange', fontWeight: 'bold' }">
                                        {{ tp.currentVal.toFixed(1) }}
                                    </span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 5px;">
                                    <span v-if="tp.passes" style="color: lime; font-size: 0.8em;">✓ Met</span>
                                    <span v-else style="color: orange; font-size: 0.8em;">✗ Tuning...</span>
                                </div>
                            </div>
                            <button class="btn btn-sm btn-outline" style="width: 100%; margin-top: 5px;" @click="deckTuningTargets = []">Clear Targets</button>
                        </div>
                    </div>

                <!-- Active Deck Panel -->
HTML;
$content = str_replace("                <!-- Active Deck Panel -->", $html, $content);

// 3. Update onDeckGenerated
$onGen = <<<JS
        const onDeckGenerated = (result) => {
            if (!result) return;
            const cardIds = result.deck || [];
            if (result.tuningTargets) {
                deckTuningTargets.value = result.tuningTargets;
                showTuningPopout.value = true;
            }
            
            deck.value = [];
            for (const cid of cardIds) {
                const found = cards.value.find(c => c.id === cid || (c._id && c._id.\$oid === cid));
                if (found) {
                    deck.value.push(found);
                }
            }
        };
JS;
$content = preg_replace('/        const onDeckGenerated = \(result\) => \{[\s\S]*?        \};/', $onGen, $content);

// 4. Export new refs
$content = str_replace(
    "deckValidationWarnings,",
    "deckValidationWarnings, deckTuningTargets, showTuningPopout, tuningProgress,",
    $content
);

file_put_contents($file, $content);
