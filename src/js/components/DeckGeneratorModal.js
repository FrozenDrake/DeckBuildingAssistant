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
                
                <div class="generator-tabs" style="display: flex; gap: 10px; padding: 0 20px; margin-bottom: 15px; border-bottom: 1px solid var(--primary-color);">
                    <button class="btn" :class="activeTab === 'manual' ? 'btn-primary' : 'btn-outline'" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-bottom: -1px;" @click="activeTab = 'manual'">Algorithmic (Fast)</button>
                    <button class="btn" :class="activeTab === 'ai' ? 'btn-primary' : 'btn-outline'" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-bottom: -1px;" @click="activeTab = 'ai'">AI Agent (Smart)</button>
                </div>

                <div class="generator-scroll" v-if="activeTab === 'manual'">
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

                <div class="generator-scroll" v-if="activeTab === 'ai'" style="display: flex; flex-direction: column;">
                    <div class="generator-section" style="flex: 1; display: flex; flex-direction: column;">
                        <h3>Describe your desired deck</h3>
                        <p class="help-text">The AI agent will intelligently query the database and strategically pick a fully synergistic deck for you.</p>
                        <textarea v-model="aiPrompt" class="filter-input" style="flex: 1; min-height: 200px; padding: 15px; resize: none; margin-bottom: 15px;" placeholder="e.g. Build an aggro deck focused on low cost and speed..."></textarea>
                        
                        <div v-if="isGeneratingAI" class="ai-status-box" style="background: rgba(0,0,0,0.1); padding: 15px; border-radius: 8px;">
                            <h4 style="margin-top: 0;">Agent Status</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; opacity: 0.8;">
                                <li v-for="log in aiLogs">{{ log }}</li>
                                <li><em>Thinking... (Evaluating synergies)</em></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- API Errors / Warnings -->
                <div v-if="apiError" class="api-error" style="padding: 0 20px; color: #ff4444; font-weight: bold;">{{ apiError }}</div>
                
                <div class="modal-footer" v-if="activeTab === 'manual'">
                    <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
                    <button class="btn btn-primary" :disabled="isGenerating || totalSlotCards > maxDeckSize" @click="generateDeck">
                        {{ isGenerating ? 'Generating...' : 'Generate Deck' }}
                    </button>
                </div>
                <div class="modal-footer" v-if="activeTab === 'ai'">
                    <button class="btn btn-outline" @click="$emit('close')" :disabled="isGeneratingAI">Cancel</button>
                    <button class="btn btn-primary" :disabled="isGeneratingAI || !aiPrompt.trim()" @click="generateAIDeck">
                        {{ isGeneratingAI ? 'Running Agent...' : 'Generate AI Deck' }}
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

        const activeTab = ref('ai');
        const aiPrompt = ref('');
        const aiLogs = ref([]);
        const isGeneratingAI = ref(false);

        const generateAIDeck = async () => {
            if (!aiPrompt.value.trim()) return;
            
            isGeneratingAI.value = true;
            apiError.value = '';
            aiLogs.value = [];

            try {
                const response = await fetch('api/llm_agent.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: props.game.id,
                        prompt: aiPrompt.value.trim()
                    })
                });
                
                const resData = await response.json();
                
                if (!response.ok || !resData.success) {
                    throw new Error(resData.error || 'Unknown AI error');
                }

                if (resData.logs) {
                    aiLogs.value = resData.logs;
                }
                
                if (resData.data && resData.data.deck) {
                    store.addToast("AI Explanation:\n" + resData.data.explanation, 'info', 0);
                    emit('generated', resData.data.deck);
                    emit('close');
                } else {
                    throw new Error('AI failed to return a valid deck.');
                }
            } catch (err) {
                console.error(err);
                apiError.value = err.message;
            } finally {
                isGeneratingAI.value = false;
            }
        };

        return {
            maxDeckSize,
            globalFilters, slots, scoringRules,
            totalSlotCards, isGenerating, apiError,
            addSlot, removeSlot, addScoringRule, removeScoringRule,
            generateDeck,
            activeTab, aiPrompt, aiLogs, isGeneratingAI, generateAIDeck
        };
    }
}

