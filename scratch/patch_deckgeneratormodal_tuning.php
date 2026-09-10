<?php
$file = 'src/js/components/DeckGeneratorModal.js';
$content = file_get_contents($file);

// 1. Add Tuning Targets section to manual tab
$html = <<<HTML
                    <!-- TUNING TARGETS -->
                    <div class="generator-section">
                        <h3>Tuning Targets</h3>
                        <p class="help-text">Set targets for the sum or average of numeric properties. The algorithm won't strictly enforce these, but they will be tracked in the Deck Builder so you can manually tune them!</p>
                        
                        <div v-for="(target, index) in tuningTargets" :key="'tuning-'+index" class="generator-rule-block" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <select v-model="target.operator" class="filter-input" style="width: auto;">
                                <option value="sum">Sum of</option>
                                <option value="average">Average of</option>
                            </select>
                            
                            <select v-model="target.property" class="filter-input" style="flex: 1;">
                                <option value="" disabled>Select Property</option>
                                <option v-for="prop in numericProperties" :value="prop">{{ prop }}</option>
                            </select>
                            
                            <select v-model="target.condition" class="filter-input" style="width: auto;">
                                <option value=">=">&gt;=</option>
                                <option value="<=">&lt;=</option>
                                <option value="==">==</option>
                            </select>
                            
                            <input type="number" v-model.number="target.value" class="filter-input" style="width: 80px;" placeholder="Value" />
                            
                            <button class="btn btn-sm btn-outline" @click="removeTuningTarget(index)">Remove</button>
                        </div>
                        
                        <button class="btn btn-sm btn-outline" @click="addTuningTarget">+ Add Tuning Target</button>
                    </div>

                    <button class="btn btn-primary" style="width: 100%; margin-top: 20px; padding: 12px; font-size: 1.1em;" 
HTML;
$content = str_replace('                    <button class="btn btn-primary" style="width: 100%; margin-top: 20px; padding: 12px; font-size: 1.1em;"', $html, $content);

// 2. Add vars
$js = <<<JS
        const scoringRules = ref([{ weight: 10, filters: createDefaultFilter() }]);
        const tuningTargets = ref([]);

        const numericProperties = computed(() => {
            const props = [];
            if (!props.schema) return props;
            Object.values(props.schema).forEach(field => {
                if (field.type === 'number') {
                    props.push(field.key);
                }
            });
            return props;
        });

        const addTuningTarget = () => tuningTargets.value.push({ operator: 'average', property: '', condition: '>=', value: 0 });
        const removeTuningTarget = (idx) => tuningTargets.value.splice(idx, 1);
JS;
$content = preg_replace('/        const scoringRules = ref\(\[\{ weight: 10, filters: createDefaultFilter\(\) \}\]\);/', $js, $content);

// 3. Emit from generateDeck
$content = str_replace("emit('generated', data.deck);", "emit('generated', { deck: data.deck, tuningTargets: tuningTargets.value });", $content);

// 4. Emit from generateAIDeck
$emitAI = <<<JS
                if (resData.success && resData.data) {
                    emit('generated', { 
                        deck: resData.data.deck,
                        tuningTargets: resData.data.tuning_targets || []
                    });
                    emit('close');
JS;
$content = preg_replace('/                if \(resData\.success && resData\.data\) \{[\s\S]*?emit\(\'close\'\);/', $emitAI, $content);

// 5. Export
$content = str_replace(
    "removeScoringRule, generateDeck,",
    "removeScoringRule, tuningTargets, numericProperties, addTuningTarget, removeTuningTarget, generateDeck,",
    $content
);

file_put_contents($file, $content);
