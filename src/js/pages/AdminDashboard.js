import { store } from '../store.js';
const { ref, computed, watch, onMounted } = Vue;

export default {
    name: 'admin-dashboard',
    template: `
        <div class="deck-builder-page" style="height: 100%; display: flex; flex-direction: column;">
            <div class="deck-subheader" style="padding: 20px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.1));">
                <div style="display: flex; justify-content: space-between; align-items: center; max-width: 800px; margin: 0 auto; width: 100%;">
                    <h2>Admin Dashboard: {{ selectedGame?.name || 'Unknown' }}</h2>
                </div>
            </div>

            <div style="flex: 1; overflow-y: auto; padding: 20px;" v-if="selectedGameId">
                <div style="max-width: 800px; margin: 0 auto; width: 100%;">
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button class="btn" :class="activeTab === 'rules' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'rules'">Edit Game Rules</button>
                        <button class="btn" :class="activeTab === 'schema' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'schema'">Edit Card Schema</button>
                        <button class="btn" :class="activeTab === 'cards' ? 'btn-primary' : 'btn-outline'" @click="activeTab = 'cards'">Manage Cards</button>
                    </div>

                    <!-- RULES EDITOR -->
                    <div v-if="activeTab === 'rules'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Deck Rules Configuration</h3>
                        
                        <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; border: 1px dashed var(--primary-color);">
                            <strong>Available Rule Types:</strong>
                            <ul style="margin-left: 20px; margin-top: 10px;">
                                <li><code>unique_property</code>: Prevents a deck from containing multiple cards with the same value in a specific field.
                                    <br/><em>Example:</em> <code>{ "type": "unique_property", "property": "characters", "is_array": true, "error_message": "..." }</code>
                                </li>
                            </ul>
                        </div>

                        <textarea 
                            v-model="rulesJson" 
                            class="filter-input" 
                            style="width: 100%; height: 350px; font-family: monospace; padding: 10px;"
                        ></textarea>
                        
                        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" :disabled="saving" @click="saveRules">
                                {{ saving ? 'Saving...' : 'Save Rules' }}
                            </button>
                        </div>
                    </div>
                    
                    <!-- SCHEMA EDITOR -->
                    <div v-if="activeTab === 'schema'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0;">Card Schema Configuration</h3>
                        
                        <div style="background: rgba(0,0,0,0.02); padding: 15px; border-radius: 4px; margin-bottom: 15px; font-size: 0.9em; border: 1px dashed var(--primary-color);">
                            <strong>Schema Field Definition:</strong>
                            <p>Defines how the "Insert New Card" form renders fields. Available types: <code>string</code>, <code>number</code>, <code>select</code>.</p>
                            <pre style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); overflow-x: auto;">[
  { "key": "rarity", "label": "Rarity", "type": "select", "options": ["SSR", "SR"] },
  { "key": "name", "label": "Card Name", "type": "string", "required": true }
]</pre>
                        </div>

                        <textarea 
                            v-model="schemaJson" 
                            class="filter-input" 
                            style="width: 100%; height: 350px; font-family: monospace; padding: 10px;"
                        ></textarea>
                        
                        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-primary" :disabled="saving" @click="saveSchema">
                                {{ saving ? 'Saving...' : 'Save Schema' }}
                            </button>
                        </div>
                    </div>

                    <!-- CARD INGESTER / MANAGER -->
                    <div v-if="activeTab === 'cards'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        <h3 style="margin-top: 0; margin-bottom: 15px;">Manage Cards</h3>

                        <!-- Sub-tabs for Card Mode -->
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 15px;">
                            <button class="btn btn-sm" :class="cardMode === 'create' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('create')">Create New Card</button>
                            <button class="btn btn-sm" :class="cardMode === 'update' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('update')">Update Existing</button>
                            <button class="btn btn-sm" :class="cardMode === 'delete' ? 'btn-primary' : 'btn-outline'" @click="setCardMode('delete')">Delete Card</button>
                        </div>

                        <div v-if="cardMode !== 'create'" style="margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.1); border-radius: 4px;">
                            <label style="display:block; margin-bottom: 5px; font-weight: bold;">Find Existing Card to {{ cardMode === 'update' ? 'Edit' : 'Delete' }}</label>
                            <input type="text" v-model="cardSearchQuery" placeholder="Search by name to narrow dropdown..." class="filter-input" style="margin-bottom: 10px;" />
                            <custom-dropdown 
                                v-model="selectedCardId" 
                                :options="cardOptions"
                                placeholder="-- Select Card --"
                            ></custom-dropdown>
                            <p class="help-text" style="margin-top: 5px; font-size: 0.8em; opacity: 0.7;">Showing top 50 matches from the database.</p>
                        </div>
                        
                        <!-- Delete Mode UI -->
                        <div v-if="cardMode === 'delete'">
                            <div v-if="selectedCardId" style="text-align: center; padding: 30px; border: 1px solid rgba(255,0,0,0.2); border-radius: 8px; background: rgba(255,0,0,0.05);">
                                <h3 style="color: #ef4444; margin-top: 0;">Confirm Deletion</h3>
                                <p>Are you sure you want to permanently delete this card from the database?</p>
                                <button type="button" class="btn btn-danger" :disabled="saving" @click="deleteCard" style="margin-top: 15px;">
                                    {{ saving ? 'Working...' : 'Permanently Delete Card' }}
                                </button>
                            </div>
                            <div v-else style="text-align: center; padding: 20px; opacity: 0.5;">
                                Please select a card above to delete.
                            </div>
                        </div>

                        <!-- Create/Update Mode Form -->
                        <div v-if="cardMode === 'create' || (cardMode === 'update' && selectedCardId)">
                            <form @submit.prevent="saveCard" v-if="hasSchema">
                                <div v-for="field in currentSchema.filter(f => f.key !== 'image_url')" :key="field.key" style="margin-bottom: 15px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">
                                        {{ field.label }} <span v-if="field.required" style="color: red;">*</span>
                                    </label>
                                    
                                    <!-- Select Input -->
                                    <template v-if="field.type === 'select'">
                                        <custom-dropdown 
                                            v-model="cardForm[field.key]" 
                                            :options="field.options.map(o => ({ value: o, label: o }))"
                                            :placeholder="'Select ' + field.label"
                                        ></custom-dropdown>
                                    </template>
                                    
                                    <!-- Text/Number Input -->
                                    <template v-else>
                                        <input 
                                            :type="field.type === 'number' ? 'number' : 'text'" 
                                            v-model="cardForm[field.key]" 
                                            class="filter-input" 
                                            :required="field.required"
                                        />
                                    </template>
                                </div>
                                
                                <div style="margin-bottom: 15px; padding: 15px; background: rgba(0,0,0,0.02); border: 1px dashed var(--primary-color); border-radius: 4px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">Upload Card Image</label>
                                    <input type="file" accept="image/*" class="filter-input" disabled title="Image upload will be available in Phase 4" />
                                    <p class="help-text" style="margin-top: 5px; margin-bottom: 0;">* Image moderation and upload pipeline is slated for Phase 4. Field disabled temporarily.</p>
                                </div>
                                
                                <hr style="margin: 20px 0; border: 1px solid rgba(0,0,0,0.1);" />
                                
                                <div style="margin-bottom: 15px;">
                                    <label style="display:block; margin-bottom: 5px; font-weight: bold;">Additional Raw Data (JSON)</label>
                                    <p class="help-text" style="margin-bottom: 5px;">Arbitrary nested properties used for complex filtering (e.g. skills, stats).</p>
                                    <textarea 
                                        v-model="cardFormRawJson" 
                                        class="filter-input" 
                                        style="width: 100%; height: 150px; font-family: monospace; padding: 10px;"
                                    ></textarea>
                                </div>

                                <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                                    <button type="submit" class="btn btn-primary" :disabled="saving">
                                        {{ saving ? 'Working...' : (cardMode === 'update' ? 'Update Card' : 'Insert Card') }}
                                    </button>
                                </div>
                            </form>

                            <!-- Fallback if no schema -->
                        <div v-else>
                            <p class="help-text">Provide the full raw JSON payload for the card (No schema defined for this game).</p>
                            <textarea 
                                v-model="cardJsonFallback" 
                                class="filter-input" 
                                style="width: 100%; height: 300px; font-family: monospace; padding: 10px;"
                            ></textarea>
                            
                            <div style="margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px;">
                                <button type="button" class="btn btn-danger" v-if="selectedCardId" :disabled="saving" @click="deleteCardFallback">
                                    {{ saving ? 'Working...' : 'Delete Card' }}
                                </button>
                                <button class="btn btn-primary" :disabled="saving" @click="saveCardFallback">
                                    {{ saving ? 'Working...' : (selectedCardId ? 'Update Card' : 'Insert Card') }}
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>


                </div>
            </div>
            <div v-else style="text-align: center; margin-top: 50px;">
                <h3>Please open a game you administer from the sidebar to view the Admin Dashboard.</h3>
            </div>
        </div>
    `,
    setup() {
        const selectedGameId = computed(() => store.selectedGameId);
        const activeTab = ref('rules');
        const cardMode = ref('create');

        const rulesJson = ref('[]');
        const schemaJson = ref('[]');
        const cardJsonFallback = ref('{}');
        
        // Dynamic Form state
        const cards = ref([]);
        const cardSearchQuery = ref('');
        const selectedCardId = ref(null);
        const cardForm = ref({});
        const cardFormRawJson = ref('{}');
        
        const saving = ref(false);

        const selectedGame = computed(() => {
            if (!selectedGameId.value) return null;
            return store.games.find(g => g.id === selectedGameId.value) || null;
        });

        const currentSchema = computed(() => selectedGame.value?.card_schema || []);
        const hasSchema = computed(() => currentSchema.value.length > 0);

        const cardOptions = computed(() => {
            return [{ value: null, label: '-- Select Card --' }].concat(
                cards.value.map(c => ({ value: c.id, label: c.name || c.id }))
            );
        });

        const fetchCards = async () => {
            if (!selectedGameId.value) return;
            try {
                const res = await fetch('api/search_cards.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        search: cardSearchQuery.value,
                        limit: 50,
                        include_raw: true
                    })
                });
                const data = await res.json();
                cards.value = data.cards || [];
            } catch (err) {
                console.error(err);
            }
        };

        watch(cardSearchQuery, () => {
            fetchCards();
        });

        const setCardMode = (mode) => {
            cardMode.value = mode;
            resetCardForm();
        };

        const resetCardForm = () => {
            selectedCardId.value = null;
            cardForm.value = {};
            cardFormRawJson.value = '{}';
            cardJsonFallback.value = '{}';
        };

        watch(selectedGameId, (newId) => {
            if (newId) {
                const game = selectedGame.value;
                if (game) {
                    rulesJson.value = JSON.stringify(game.deck_rules || [], null, 2);
                    schemaJson.value = JSON.stringify(game.card_schema || [], null, 2);
                    cardSearchQuery.value = '';
                    fetchCards();
                    resetCardForm();
                }
            }
        }, { immediate: true });

        watch(selectedCardId, (newId) => {
            if (!newId) {
                resetCardForm();
                return;
            }
            const card = cards.value.find(c => c.id === newId);
            if (card) {
                const formCopy = { ...card };
                delete formCopy.id;
                delete formCopy.game_id;
                delete formCopy.raw_data;
                
                // Unmap arrays to comma-separated strings for schema form
                currentSchema.value.forEach(field => {
                    if (field.key === 'characters' && Array.isArray(formCopy[field.key])) {
                        formCopy[field.key] = formCopy[field.key].join(', ');
                    }
                });

                cardForm.value = formCopy;
                cardFormRawJson.value = JSON.stringify(card.raw_data || {}, null, 2);
                cardJsonFallback.value = JSON.stringify(card, null, 2);
            }
        });

        const saveRules = async () => {
            let parsedRules;
            try {
                parsedRules = JSON.parse(rulesJson.value);
            } catch (e) {
                store.addToast("Invalid JSON in rules editor", "error");
                return;
            }

            saving.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        deck_rules: parsedRules
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                if (selectedGame.value) selectedGame.value.deck_rules = parsedRules;
                
                store.addToast("Game rules updated successfully", "success");
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };
        
        const saveSchema = async () => {
            let parsedSchema;
            try {
                parsedSchema = JSON.parse(schemaJson.value);
            } catch (e) {
                store.addToast("Invalid JSON in schema editor", "error");
                return;
            }

            saving.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        card_schema: parsedSchema
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                if (selectedGame.value) selectedGame.value.card_schema = parsedSchema;
                
                store.addToast("Card schema updated successfully", "success");
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };

        const executeSave = async (parsedCard) => {
            saving.value = true;
            const endpoint = selectedCardId.value ? 'api/admin_update_card.php' : 'api/admin_insert_card.php';
            const payload = {
                game_id: selectedGameId.value,
                card_data: parsedCard
            };
            if (selectedCardId.value) payload.card_id = selectedCardId.value;

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast(selectedCardId.value ? "Card updated successfully" : "Card inserted successfully", "success");
                await fetchCards();
                if (!selectedCardId.value) resetCardForm();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };

        const executeDelete = async () => {
            if (!selectedCardId.value) return;
            if (!confirm('Are you sure you want to delete this card?')) return;
            
            saving.value = true;
            try {
                const res = await fetch('api/admin_delete_card.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        card_id: selectedCardId.value
                    })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Card deleted successfully", "success");
                await fetchCards();
                resetCardForm();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };

        const saveCard = () => {
            let parsedRaw = {};
            if (cardFormRawJson.value.trim() !== '') {
                try {
                    parsedRaw = JSON.parse(cardFormRawJson.value);
                } catch (e) {
                    store.addToast("Invalid JSON in Additional Raw Data", "error");
                    return;
                }
            }
            
            const payload = { ...cardForm.value };
            currentSchema.value.forEach(field => {
                if (field.key === 'characters' && typeof payload[field.key] === 'string') {
                    payload[field.key] = payload[field.key].split(',').map(s => s.trim()).filter(s => s.length > 0);
                }
            });
            
            payload.raw_data = parsedRaw;
            executeSave(payload);
        };

        const saveCardFallback = () => {
            let parsedCard;
            try {
                parsedCard = JSON.parse(cardJsonFallback.value);
            } catch (e) {
                store.addToast("Invalid JSON in card editor", "error");
                return;
            }
            executeSave(parsedCard);
        };

        return {
            store, selectedGameId, selectedGame,
            activeTab, cardMode, rulesJson, schemaJson, saving,
            hasSchema, currentSchema, cards, cardSearchQuery, selectedCardId, cardOptions, cardForm, cardFormRawJson, cardJsonFallback,
            saveRules, saveSchema, saveCard, saveCardFallback, deleteCard: executeDelete, deleteCardFallback: executeDelete, resetCardForm, setCardMode
        }
    }
}
