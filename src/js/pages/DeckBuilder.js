import { store } from '../store.js';
const { ref, computed, onMounted, onUnmounted, watch } = Vue;

const getValueAtPath = (obj, path) => {
    if (!path || obj === undefined || obj === null) return undefined;
    return path.split('.').reduce((curr, key) => {
        if (curr === undefined || curr === null) return undefined;
        return curr[key];
    }, obj);
};

export default {
    template: `
        <div class="deck-builder-page">
            <!-- Sub Header Level 1: Title + deck actions -->
            <div class="deck-subheader">
                <div class="deck-subheader-top">
                    <h2>{{ currentGame.name }} Deck Builder</h2>
                    <div class="deck-subheader-actions">
                        <span class="deck-count" :class="{ 'deck-count-full': deck.length >= maxDeckSize }">
                            {{ deck.length }} / {{ maxDeckSize }} Cards
                        </span>
                        <button class="btn btn-outline" @click="showGeneratorModal = true">Auto-Generate</button>
                        <button class="btn btn-outline" @click="clearDeck" :disabled="deck.length === 0">Clear</button>
                        <button class="btn btn-outline">Export</button>
                        <button class="btn" @click="showSaveDeckModal = true" :disabled="deck.length === 0">Save Deck</button>
                        <button class="btn btn-outline" @click="store.currentView = 'dashboard'">Exit</button>
                    </div>
                </div>

                <!-- Sub Header Level 2: Search, Sort, and Filter toggle all on one row -->
                <div class="deck-subheader-bottom">
                    <div class="filter-controls">
                        <input type="text" v-model="searchQuery" class="filter-input" placeholder="Search cards..." />

                        <!-- Sort toggle: opens the MultiSort tray below -->
                        <button class="btn btn-outline" :class="{ active: showSortTray }" @click="showSortTray = !showSortTray">
                            Sort{{ activeSortCount > 0 ? ' (' + activeSortCount + ')' : '' }}
                        </button>

                        <!-- Filter toggle: opens the ComplexFilter tray below -->
                        <button class="btn btn-outline" :class="{ active: showFilterTray }" @click="showFilterTray = !showFilterTray">
                            Filters{{ activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '' }}
                        </button>

                        <!-- Collection filter: only show cards the user owns -->
                        <label v-if="store.user" class="toggle-switch" title="Show only cards in your collection">
                            <input type="checkbox" :checked="collectionOnly" @change="toggleCollectionOnly" />
                            <span class="toggle-track">
                                <span class="toggle-thumb"></span>
                            </span>
                            <span class="toggle-label">My Collection</span>
                        </label>
                    </div>
                </div>

                <!-- Sort Tray -->
                <transition name="filter-tray">
                    <div v-if="showSortTray" class="filter-tray">
                        <multi-sort :schema="filterSchema" @sort-updated="onSortUpdated"></multi-sort>
                    </div>
                </transition>

                <!-- Complex Filter Tray -->
                <transition name="filter-tray">
                    <div v-if="showFilterTray" class="filter-tray">
                        <complex-filter :schema="filterSchema" @query-updated="onQueryUpdated"></complex-filter>
                        <div class="filter-tray-footer">
                            <button class="btn btn-sm btn-outline" @click="resetFilter">Clear Filters</button>
                        </div>
                    </div>
                </transition>
            </div>

            <div class="deck-builder-content">
                <!-- Card Collection Panel -->
                <div class="card-collection-panel">

                    <div v-if="isLoading && renderedCards.length === 0" class="loading-state">Loading cards from server...</div>
                    <div v-else-if="renderedCards.length === 0" class="loading-state">No cards match your filters.</div>
                    <div v-else class="card-list" ref="scrollContainer">
                        
                        <div class="db-card" v-for="card in renderedCards" :key="card.id" @click="addToDeck(card)"
                             :title="'Click to add to deck.'"
                             :class="{ 'db-card-in-deck': isInDeck(card) }">
                             
                            <div class="db-card-header">
                                <span class="db-card-rarity" :class="card.rarity">{{ card.rarity }}</span>
                                <span class="db-card-type">{{ card.type }}</span>
                            </div>
                            <div class="db-card-name">{{ card.name }}</div>
                            
                            <div class="db-card-art-container"
                                 @dragover.prevent
                                 @drop.prevent="handleArtDrop($event, card)">
                                <img v-if="card.image_url" :src="card.image_url" class="db-card-art" />
                                <button v-if="!card.image_url && store.user" class="db-card-submit-art" @click.stop="promptSubmitArt(card)">
                                    Submit Art
                                </button>
                            </div>
                            
                            <!-- Render remaining schema fields that have values (skip name, rarity, type, image_url) -->
                            <div class="db-card-props" v-if="currentGame && currentGame.card_schema">
                                <span
                                    v-for="field in currentGame.card_schema.filter(f => !['name','rarity','type','image_url'].includes(f.key) && card[f.key] != null && card[f.key] !== '')"
                                    :key="field.key"
                                    class="db-card-prop"
                                >{{ field.label }}: {{ card[field.key] }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Scroll trigger -->
                    <div ref="scrollTrigger" id="scroll-trigger" style="height: 50px; display: flex; align-items: center; justify-content: center; opacity: 0.5;">
                        <span v-if="isLoading && renderedCards.length > 0">Loading more...</span>
                        <span v-else-if="allLoaded && renderedCards.length > 0">Showing {{ renderedCards.length }} of {{ totalCards }} cards.</span>
                    </div>
                </div>

                <!-- Active Deck Panel -->
                <div class="active-deck-panel">
                    <div class="deck-header">
                        <h3>Current Deck ({{ deck.length }} / {{ maxDeckSize }})</h3>
                        <button class="btn btn-sm btn-outline" @click="clearDeck">Clear</button>
                    </div>
                    
                    <!-- Small deck layout (Slots) -->
                    <div class="deck-slots-layout" v-if="isSmallDeck">
                        <div class="deck-slot" v-for="index in maxDeckSize" :key="index" @click="removeFromDeck(index - 1)"
                             :title="deck[index - 1] ? 'Click to remove: ' + deck[index - 1].name : 'Empty slot'">
                            <div v-if="deck[index - 1]" class="db-card" style="margin: 0; width: 100%; height: 100%;">
                                <div class="db-card-header">
                                    <span class="db-card-rarity" :class="deck[index - 1].rarity">{{ deck[index - 1].rarity }}</span>
                                    <span class="db-card-type">{{ deck[index - 1].type }}</span>
                                </div>
                                <div class="db-card-name">{{ deck[index - 1].name }}</div>
                                
                                <div class="db-card-art-container">
                                    <img v-if="deck[index - 1].image_url" :src="deck[index - 1].image_url" class="db-card-art" />
                                </div>
                            </div>
                            <div v-else class="slot-empty">+</div>
                        </div>
                    </div>

                    <!-- Large deck layout (Grouped List) -->
                    <div class="deck-list-layout" v-else>
                        <div v-if="deck.length === 0" class="slot-empty" style="height: 200px;">
                            Click cards to add them to your deck.
                        </div>
                        <div class="deck-list-item" v-for="(group, type) in groupedDeck" :key="type">
                            <h4>{{ type }} <span class="group-count">({{ group.count }})</span></h4>
                            <div class="deck-list-card" v-for="item in group.cards" :key="item.card.id"
                                 @click="removeOneFromDeck(item.card)" :title="'Click to remove one ' + item.card.name">
                                <img v-if="item.card.image_url" :src="item.card.image_url" class="deck-list-art" />
                                <div v-else class="deck-list-art"></div>
                                <div class="deck-list-info">
                                    <span class="deck-list-name">{{ item.card.name }}</span>
                                    <span class="deck-list-qty">x{{ item.qty }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Auto-Generator Modal -->
            <deck-generator-modal
                :show="showGeneratorModal"
                :game="currentGame"
                :schema="filterSchema"
                @close="showGeneratorModal = false"
                @generated="onDeckGenerated"
            ></deck-generator-modal>

            <!-- Save Deck Modal -->
            <transition name="modal-fade">
                <div v-if="showSaveDeckModal" class="modal-overlay" @click.self="showSaveDeckModal = false">
                    <div class="modal-box" style="max-width: 440px;">
                        <h3 style="margin-top: 0;">Save Deck</h3>
                        <p style="opacity: 0.6; font-size: 0.9em; margin-bottom: 20px;">
                            Give your deck a name. It will be saved to your profile and visible on the Browse Decks page.
                        </p>
                        <div style="margin-bottom: 15px;">
                            <label style="display:block; margin-bottom: 5px; font-weight: bold;">Deck Name <span style="color:red">*</span></label>
                            <input type="text" v-model="saveDeckName" class="filter-input" placeholder="e.g. My Speed Build" maxlength="80" />
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom: 5px; font-weight: bold;">Description <span style="opacity:0.5; font-weight: normal;">(optional)</span></label>
                            <textarea v-model="saveDeckDescription" class="filter-input" placeholder="Describe your strategy..." style="height: 90px; font-family: inherit;"></textarea>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button class="btn btn-outline" @click="showSaveDeckModal = false" :disabled="isSavingDeck">Cancel</button>
                            <button class="btn btn-primary" @click="saveDeck" :disabled="isSavingDeck || !saveDeckName.trim()">
                                {{ isSavingDeck ? 'Saving...' : 'Save Deck' }}
                            </button>
                        </div>
                    </div>
                </div>
            </transition>
        </div>
    `,
    setup() {
        const isLoading = ref(false);
        const searchQuery = ref('');
        const showSortTray = ref(false);
        const showFilterTray = ref(false);

        const activeFilterQuery = ref(null);
        const activeSortRules = ref([]);

        // Default schema items
        const rawPathOptions = ref([]);

        const buildFilterSchema = (game, dynamicPaths) => {
            let fields = [];
            
            if (game && game.card_schema && game.card_schema.length > 0) {
                fields = game.card_schema
                    .filter(field => field.key !== 'image_url')
                    .map(field => {
                        return {
                            key: field.key,
                            label: field.label,
                            // map backend 'string' to frontend 'text'
                            type: field.type === 'string' ? 'text' : field.type, 
                            options: field.options || []
                        };
                    });
            } else {
                // Fallback for games without a schema
                fields = [
                    { label: 'Name', key: 'name', type: 'text' }
                ];
            }
            
            // Append the dynamic raw_data paths extractor
            fields.push({
                label: 'Other Card Info',
                key: '__raw_path__',
                type: 'raw_path',
                options: dynamicPaths
            });
            
            return {
                fields: fields,
                operators: {
                    text:     ['contains', 'does not contain', 'equals'],
                    select:   ['equals', 'does not equal'],
                    number:   ['equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal'],
                    raw_path: ['contains', 'does not contain', 'equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal']
                }
            };
        };

        const filterSchema = computed(() => buildFilterSchema(currentGame.value, rawPathOptions.value));
        const deck = ref([]);

        const currentGame = computed(() => store.games.find(g => g.id === store.selectedGameId) || {});
        const maxDeckSize = computed(() => currentGame.value.max_deck_size || 60);
        const isSmallDeck = computed(() => maxDeckSize.value <= 10);

        // Server-Side Data State
        const cards = ref([]);
        const totalCards = ref(0);
        const skip = ref(0);
        const limit = 50;
        const allLoaded = computed(() => cards.value.length >= totalCards.value && totalCards.value > 0);
        
        // Virtual Scrolling State
        
        const maxCardsToKeep = 150; 
        const renderedCards = computed(() => cards.value); // For now, we'll try just normal append.
        
        // ---- Collection filter toggle ----
        const collectionOnly    = ref(false);
        const collectionCardIds = ref(new Set());

        const fetchCollection = async () => {
            if (!store.user || !currentGame.value) return;
            try {
                const res = await fetch('api/get_collection.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: currentGame.value.id }),
                });
                const data = await res.json();
                if (res.ok) {
                    collectionCardIds.value = new Set((data.entries || []).map(e => e.card_id));
                }
            } catch (_) { /* silently ignore — collection filter just won't work */ }
        };

        const toggleCollectionOnly = () => {
            collectionOnly.value = !collectionOnly.value;
            skip.value = 0;
            cards.value = [];
            performSearch(false);
        };

        let fetchAbortController = null;

        const performSearch = async (isLoadMore = false) => {
            if (!currentGame.value.id) return;
            
            if (!isLoadMore) {
                skip.value = 0;
                cards.value = [];
            }

            if (fetchAbortController) fetchAbortController.abort();
            fetchAbortController = new AbortController();

            isLoading.value = true;
            try {
                const payload = {
                    game_id: currentGame.value.id,
                    skip: skip.value,
                    limit: limit,
                    search: searchQuery.value,
                    filters: activeFilterQuery.value,
                    sorts: activeSortRules.value,
                    include_raw: true,
                    // When the collection filter is on, restrict results to owned card IDs.
                    // An empty set means "no collection" — send null so backend doesn't add an impossible $in filter.
                    ...(collectionOnly.value && collectionCardIds.value.size > 0
                        ? { card_ids: Array.from(collectionCardIds.value) }
                        : {}),
                };

                const response = await fetch('api/search_cards.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: fetchAbortController.signal
                });
                
                const data = await response.json();
                
                if (data.cards) {
                    // Extract schema paths dynamically from the first batch
                    if (!isLoadMore) {
                        // Map of fullPath -> { type: 'string'|'number', values: Set }
                        const pathMap = new Map();
                        const ignoreKeys = ['_id', 'id', 'name', 'type', 'rarity', 'image_url', 'obtained'];
                        const extract = (obj, prefix = '') => {
                            if (!obj || typeof obj !== 'object') return;
                            const isArr = Array.isArray(obj);
                            for (const key in obj) {
                                if (!prefix && ignoreKeys.includes(key)) continue;
                                let fullPath = prefix;
                                if (!isArr) {
                                    fullPath = prefix ? prefix + '.' + key : key;
                                }
                                
                                const val = obj[key];
                                const t = typeof val;
                                if (t === 'number' || t === 'string' || t === 'boolean') {
                                    if (!pathMap.has(fullPath)) {
                                        pathMap.set(fullPath, { type: t, values: new Set() });
                                    }
                                    if (t === 'string') {
                                        pathMap.get(fullPath).values.add(val);
                                    }
                                }
                                extract(val, fullPath);
                            }
                        };
                        data.cards.forEach(card => {
                            extract(card);
                        });
                        
                        rawPathOptions.value = Array.from(pathMap.entries())
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([p, info]) => {
                                return {
                                    label: p,
                                    value: p,
                                    valueType: info.type,
                                    valueOptions: info.type === 'string' ? Array.from(info.values).sort() : []
                                };
                            });
                    }

                    totalCards.value = data.total;
                    
                    if (isLoadMore) {
                        cards.value = [...cards.value, ...data.cards];
                    } else {
                        cards.value = data.cards;
                    }
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error('Failed to search cards:', err);
            } finally {
                isLoading.value = false;
            }
        };

        // Debounce search input
        let searchTimeout;
        watch([searchQuery, activeFilterQuery, activeSortRules], () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch(false);
            }, 300);
        }, { deep: true });

        watch(() => store.selectedGameId, () => { 
            deck.value = []; 
            performSearch(false); 
        });

        // Infinite Scroll Observer
        let observer = null;
        const scrollTrigger = ref(null);
        
        onMounted(() => {
            performSearch(false);
            fetchCollection();
            
            observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading.value && !allLoaded.value) {
                    skip.value += limit;
                    performSearch(true);
                }
            }, { rootMargin: '200px' });
        });
        
        watch(scrollTrigger, (el) => {
            if (el && observer) {
                observer.observe(el);
            }
        });
        
        onUnmounted(() => {
            if (observer) observer.disconnect();
        });

        // Counts how many rule leaves are active in the ComplexFilter tree
        const activeFilterCount = computed(() => {
            if (!activeFilterQuery.value) return 0;
            const countRules = (node) => {
                if (!node) return 0;
                if (node.type === 'rule') return node.field && node.value ? 1 : 0;
                return (node.children || []).reduce((acc, child) => acc + countRules(child), 0);
            };
            return countRules(activeFilterQuery.value);
        });

        const activeSortCount = computed(() => activeSortRules.value.length);
        const showGeneratorModal = ref(false);

        // Save Deck modal state
        const showSaveDeckModal   = ref(false);
        const saveDeckName        = ref('');
        const saveDeckDescription = ref('');
        const isSavingDeck        = ref(false);

        const saveDeck = async () => {
            if (!saveDeckName.value.trim()) return;
            isSavingDeck.value = true;
            try {
                const res = await fetch('api/save_deck.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id:     currentGame.value.id,
                        name:        saveDeckName.value.trim(),
                        description: saveDeckDescription.value.trim(),
                        cards:       deck.value,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast('Deck saved successfully!', 'success');
                showSaveDeckModal.value   = false;
                saveDeckName.value        = '';
                saveDeckDescription.value = '';
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                isSavingDeck.value = false;
            }
        };

        const onDeckGenerated = (generatedDeck) => {
            deck.value = generatedDeck;
        };

        const onQueryUpdated = (query) => { activeFilterQuery.value = query; };
        const resetFilter = () => { activeFilterQuery.value = null; };
        const onSortUpdated = (rules) => { activeSortRules.value = rules; };

        // Deck actions
        const isInDeck = (card) => deck.value.some(c => c.id === card.id);

        const addToDeck = (card) => {
            if (!currentGame.value) return;

            if (deck.value.length >= maxDeckSize.value) {
                store.addToast(`Deck is full (${maxDeckSize.value} cards max).`, 'warning');
                return;
            }

            const currentCount = deck.value.filter(c => c.id === card.id).length;
            const maxCopies = currentGame.value.max_copies_per_card || 4;
            if (currentCount >= maxCopies) {
                store.addToast(`You can only have up to ${maxCopies} copies of this card.`, 'warning');
                return;
            }

            const deckRules = currentGame.value.deck_rules || [];
            for (const rule of deckRules) {
                if (rule.type === 'unique_property') {
                    const prop = rule.property;
                    const isArray = rule.is_array;
                    const newVals = isArray ? (card[prop] || []) : [card[prop]].filter(x => x != null);
                    
                    for (const existingCard of deck.value) {
                        const existingVals = isArray ? (existingCard[prop] || []) : [existingCard[prop]].filter(x => x != null);
                        if (newVals.some(v => existingVals.includes(v))) {
                            store.addToast(rule.error_message || `Cannot add: Violates unique property rule for ${prop}.`, 'error');
                            return;
                        }
                    }
                }
            }

            deck.value.push(card);
        };

        const uploadArt = async (file, card) => {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('card_id', card._id?.$oid || card.id);
            formData.append('game_id', currentGame.value.id);
            
            try {
                const res = await fetch('api/submit_art.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    store.addToast('Art submitted for moderation!', 'success');
                } else {
                    store.addToast(data.error || 'Failed to submit art.', 'error');
                }
            } catch (err) {
                store.addToast('Error submitting art.', 'error');
            }
        };

        const promptSubmitArt = (card) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg, image/png, image/webp';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) uploadArt(file, card);
            };
            input.click();
        };

        const handleArtDrop = (e, card) => {
            const file = e.dataTransfer.files[0];
            if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                uploadArt(file, card);
            } else if (file) {
                store.addToast('Only JPG, PNG, and WebP images are allowed.', 'error');
            }
        };

        const removeFromDeck = (index) => {
            if (deck.value[index]) deck.value.splice(index, 1);
        };

        const removeOneFromDeck = (card) => {
            const index = deck.value.findIndex(c => c.id === card.id);
            if (index !== -1) deck.value.splice(index, 1);
        };

        const clearDeck = () => { deck.value = []; };

        const groupedDeck = computed(() => {
            if (isSmallDeck.value) return {};
            const groups = {};
            deck.value.forEach(card => {
                const t = card.type || 'Other';
                if (!groups[t]) groups[t] = { count: 0, cards: [] };
                groups[t].count++;
                const existing = groups[t].cards.find(c => c.card.id === card.id);
                if (existing) {
                    existing.qty++;
                } else {
                    groups[t].cards.push({ card, qty: 1 });
                }
            });
            return groups;
        });

        return {
            store, currentGame, maxDeckSize, isSmallDeck,
            renderedCards, totalCards, allLoaded, isLoading, searchQuery,
            showSortTray, showFilterTray, filterSchema,
            activeFilterCount, activeSortCount, onQueryUpdated, resetFilter, onSortUpdated,
            collectionOnly, toggleCollectionOnly,
            deck, isInDeck, addToDeck, removeFromDeck, removeOneFromDeck, clearDeck,
            promptSubmitArt, handleArtDrop,
            groupedDeck, scrollTrigger,
            showGeneratorModal,
            onDeckGenerated,
            showSaveDeckModal, saveDeckName, saveDeckDescription, isSavingDeck, saveDeck,
        };
    }
}
