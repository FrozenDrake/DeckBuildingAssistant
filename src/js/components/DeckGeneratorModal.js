import { store } from '../store.js';

export default {
    name: 'deck-generator-modal',
    props: {
        show: Boolean,
        game: Object,
        schema: Object
    },
    emits: ['close', 'generated'],
    template: `
        <div class="modal-backdrop" v-if="show" @click.self="$emit('close')">
            <div class="modal-content generator-modal">
                <h2>Deck Generator</h2>
                <div class="generator-scroll">
                    <!-- GLOBAL CONSTRAINTS -->
                    <div class="generator-section">
                        <h3>Global Card Constraints</h3>
                        <p class="help-text">Rules applied to EVERY card considered for the deck (e.g. Exclude specific characters, restrict colors).</p>
                        <div class="generator-rule-block">
                            <complex-filter-node :node="globalFilters" :schema="schema"></complex-filter-node>
                        </div>
                    </div>

                    <!-- SCORING PRIORITIES -->
                    <div class="generator-section">
                        <h3>Scoring Priorities</h3>
                        <p class="help-text">Define what makes a card "good" for this deck. Cards get points for each rule they match.</p>
                        
                        <div v-for="(rule, index) in scoringRules" :key="'score-'+index" class="generator-rule-block">
                            <div class="rule-block-header">
                                <span>Priority {{ index + 1 }}</span>
                                <button class="btn btn-sm btn-outline" @click="removeScoringRule(index)">Remove</button>
                            </div>
                            <div class="rule-weight">
                                <label>Points to award if matched:</label>
                                <input type="number" v-model.number="rule.weight" class="filter-input" style="width: 80px;" />
                            </div>
                            <!-- Re-use the ComplexFilterNode component for nested bindings -->
                            <complex-filter-node :node="rule.filters" :schema="schema"></complex-filter-node>
                        </div>
                        <button class="btn btn-outline" @click="addScoringRule">+ Add Scoring Priority</button>
                    </div>

                    <!-- SLOTS -->
                    <div class="generator-section">
                        <h3>Deck Slots (Total: {{ totalSlotCards }} / {{ maxDeckSize }})</h3>
                        <p class="help-text">Define the required composition of the deck.</p>

                        <div v-for="(slot, index) in slots" :key="'slot-'+index" class="generator-rule-block">
                            <div class="rule-block-header">
                                <span>Slot {{ index + 1 }}</span>
                                <button class="btn btn-sm btn-outline" @click="removeSlot(index)">Remove</button>
                            </div>
                            <div class="rule-weight">
                                <label>Number of Cards:</label>
                                <input type="number" v-model.number="slot.count" class="filter-input" style="width: 80px;" />
                            </div>
                            <complex-filter-node :node="slot.filters" :schema="schema"></complex-filter-node>
                        </div>
                        <button class="btn btn-outline" @click="addSlot">+ Add Slot Requirement</button>
                    </div>
                </div>

                <!-- API Errors / Warnings -->
                <div v-if="apiError" class="api-error">{{ apiError }}</div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
                    <button class="btn btn-primary" :disabled="isGenerating || totalSlotCards > maxDeckSize" @click="generateDeck">
                        {{ isGenerating ? 'Generating...' : 'Generate Deck' }}
                    </button>
                </div>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const { ref, computed } = Vue;

        const maxDeckSize = computed(() => props.game?.max_deck_size || 60);

        const createDefaultFilter = () => ({ type: 'group', logic: 'AND', children: [] });

        const globalFilters = ref(createDefaultFilter());
        const slots = ref([]);
        const scoringRules = ref([]);
        
        const isGenerating = ref(false);
        const apiError = ref('');

        const totalSlotCards = computed(() => slots.value.reduce((sum, slot) => sum + (slot.count || 0), 0));

        const addSlot = () => slots.value.push({ count: 1, filters: createDefaultFilter() });
        const removeSlot = (idx) => slots.value.splice(idx, 1);

        const addScoringRule = () => scoringRules.value.push({ weight: 10, filters: createDefaultFilter() });
        const removeScoringRule = (idx) => scoringRules.value.splice(idx, 1);

        const generateDeck = async () => {
            if (totalSlotCards.value > maxDeckSize.value) {
                apiError.value = "You requested more cards than the deck size allows.";
                return;
            }

            isGenerating.value = true;
            apiError.value = '';

            const payload = {
                game_id: props.game.id,
                slots: slots.value,
                scoring: scoringRules.value,
                global_filters: globalFilters.value
            };

            try {
                const response = await fetch('api/generate_deck.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Unknown server error');
                }

                if (data.warnings && data.warnings.length > 0) {
                    store.addToast("Generation Warnings:\n- " + data.warnings.join("\n- "), 'warning');
                }

                emit('generated', data.deck);
                emit('close');
            } catch (err) {
                console.error(err);
                apiError.value = err.message;
            } finally {
                isGenerating.value = false;
            }
        };

        return {
            maxDeckSize,
            globalFilters, slots, scoringRules,
            totalSlotCards, isGenerating, apiError,
            addSlot, removeSlot, addScoringRule, removeScoringRule,
            generateDeck
        };
    }
}

