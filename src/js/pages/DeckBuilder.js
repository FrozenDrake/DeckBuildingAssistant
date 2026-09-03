import { store } from '../store.js';
const { ref, computed, onMounted, watch } = Vue;

// Traverse a dot-notation path into an object, safely returning undefined if any step is missing.
// Example: getValueAtPath(card.raw_data, 'hints.hint_skills') -> [200162, 200232, ...]
const getValueAtPath = (obj, path) => {
    if (!path || obj === undefined || obj === null) return undefined;
    return path.split('.').reduce((curr, key) => {
        if (curr === undefined || curr === null) return undefined;
        return curr[key];
    }, obj);
};

// The card schema drives the ComplexFilter and MultiSort field/operator options.
// Fields map to card properties; operators define supported comparisons.
// The special `raw_path` type allows dot-notation traversal into the raw_data blob.
const buildFilterSchema = (rawPathOptions = []) => ({
    fields: [
        { label: 'Name',           key: 'name',        type: 'text' },
        { label: 'Type',           key: 'type',        type: 'select', options: ['Speed', 'Stamina', 'Power', 'Guts', 'Wisdom', 'Friend', 'Group'] },
        { label: 'Rarity',         key: 'rarity',      type: 'select', options: ['R', 'SR', 'SSR'] },
        { label: 'Character',      key: 'characters',  type: 'text' },
        // raw_path: dynamic paths extracted from raw_data
        { label: 'Other Card Info',key: '__raw_path__', type: 'raw_path', options: rawPathOptions },
    ],
    operators: {
        text:     ['contains', 'does not contain', 'equals'],
        select:   ['equals', 'does not equal'],
        number:   ['equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal'],
        raw_path: ['contains', 'does not contain', 'equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal'],
    }
});

// Evaluate a single filter rule against a card object.
// Handles normal top-level fields AND raw_path lookups into raw_data.
const matchesRule = (card, rule) => {
    let raw;

    if (rule.field === '__raw_path__') {
        // Traverse into raw_data using the dot-path stored in rule.rawPath
        raw = getValueAtPath(card.raw_data, rule.rawPath);
    } else {
        raw = card[rule.field];
    }

    // Normalise to a searchable string — arrays are joined so "contains" works across items
    const haystack = Array.isArray(raw)
        ? raw.map(v => String(v).toLowerCase()).join(' ')
        : String(raw ?? '').toLowerCase();
    const needle = String(rule.value ?? '').toLowerCase();

    // Parse numbers for numeric operators
    const numHaystack = Number(raw);
    const numNeedle = Number(rule.value);

    switch (rule.operator) {
        case 'contains':               return haystack.includes(needle);
        case 'does not contain':       return !haystack.includes(needle);
        case 'equals':                 return haystack === needle;
        case 'does not equal':         return haystack !== needle;
        case 'greater than':           return !isNaN(numHaystack) && !isNaN(numNeedle) && numHaystack > numNeedle;
        case 'less than':              return !isNaN(numHaystack) && !isNaN(numNeedle) && numHaystack < numNeedle;
        case 'greater than or equal':  return !isNaN(numHaystack) && !isNaN(numNeedle) && numHaystack >= numNeedle;
        case 'less than or equal':     return !isNaN(numHaystack) && !isNaN(numNeedle) && numHaystack <= numNeedle;
        default:                       return true;
    }
};

// Recursively evaluate a filter group node against a card.
const matchesNode = (card, node) => {
    if (node.type === 'rule') return matchesRule(card, node);
    if (node.type === 'group') {
        const results = (node.children || []).map(child => matchesNode(card, child));
        const combined = node.logic === 'OR'
            ? results.some(Boolean)
            : results.every(Boolean);
        return node.negate ? !combined : combined;
    }
    return true;
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
                        <button class="btn">Save Deck</button>
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

                        <label class="toggle-label">
                            <input type="checkbox" v-model="showOwnedOnly" />
                            Owned Only
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
                        <complex-filter :schema="filterSchema" @update:query="onQueryUpdated"></complex-filter>
                        <div class="filter-tray-footer">
                            <span class="filter-result-count">{{ filteredCards.length }} cards match</span>
                            <button class="btn btn-sm btn-outline" @click="resetFilter">Clear Filters</button>
                        </div>
                    </div>
                </transition>
            </div>

            <div class="deck-builder-content">
                <!-- Card Collection Panel -->
                <div class="card-collection-panel">

                    <div v-if="isLoading" class="loading-state">Loading cards...</div>
                    <div v-else-if="filteredCards.length === 0" class="loading-state">No cards match your filters.</div>
                    <div v-else class="card-list">
                        <div class="db-card" v-for="card in filteredCards" :key="card.id" @click="addToDeck(card)"
                             :title="'Click to add to deck.\\n\\n' + card.description"
                             :class="{ 'db-card-in-deck': isInDeck(card) }">
                            <div class="db-card-header">
                                <span class="db-card-rarity" :class="card.rarity">{{ card.rarity }}</span>
                                <span class="db-card-type">{{ card.type }}</span>
                            </div>
                            <div class="db-card-name">{{ card.name }}</div>
                            <div class="db-card-chars" v-if="card.characters && card.characters.length">
                                {{ card.characters.join(', ') }}
                            </div>
                        </div>
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
                            <div v-if="deck[index - 1]" class="slot-filled">
                                <div class="slot-rarity" :class="deck[index - 1].rarity">{{ deck[index - 1].rarity }}</div>
                                <div class="slot-type">{{ deck[index - 1].type }}</div>
                                <div class="slot-name">{{ deck[index - 1].name }}</div>
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
                                <span class="deck-list-name">{{ item.card.name }}</span>
                                <span class="deck-list-qty">x{{ item.qty }}</span>
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
        </div>
    `,
    setup() {
        const cards = ref([]);
        const isLoading = ref(false);
        const searchQuery = ref('');
        const showSortTray = ref(false);
        const showFilterTray = ref(false);
        const showOwnedOnly = ref(false);
        const activeFilterQuery = ref(null);
        const activeSortRules = ref([]); // Ordered array of { field, direction } from MultiSort
        // Dynamically compute all possible dot-notation paths from the raw JSON
        const rawPathOptions = computed(() => {
            if (!cards.value || cards.value.length === 0) return [];
            const paths = new Set();
            
            const extract = (obj, prefix = '') => {
                if (!obj || typeof obj !== 'object') return;
                if (Array.isArray(obj)) return; // Stop at arrays (e.g. event_skills) rather than continuing to index 0, 1...
                for (const key in obj) {
                    const fullPath = prefix ? `${prefix}.${key}` : key;
                    paths.add(fullPath);
                    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                        extract(obj[key], fullPath);
                    }
                }
            };

            cards.value.forEach(card => {
                if (card.raw_data) extract(card.raw_data);
            });

            return Array.from(paths).sort().map(p => ({ label: p, value: p }));
        });

        const filterSchema = computed(() => buildFilterSchema(rawPathOptions.value));
        const deck = ref([]);

        const currentGame = computed(() => store.games.find(g => g.id === store.selectedGameId) || {});
        const maxDeckSize = computed(() => currentGame.value.max_deck_size || 60);
        const isSmallDeck = computed(() => maxDeckSize.value <= 10);

        // Numeric weight for rarity used when a sort rule targets the rarity field
        const rarityOrder = { 'SSR': 3, 'SR': 2, 'R': 1 };

        const fetchCards = async () => {
            if (!currentGame.value.id) return;
            isLoading.value = true;
            try {
                // include_raw=1 fetches the full raw_data blob so filters/sorts can traverse it
                const response = await fetch('api/get_cards.php?game_id=' + currentGame.value.id + '&include_raw=1');
                cards.value = await response.json();
            } catch (err) {
                console.error('Failed to fetch cards:', err);
            } finally {
                isLoading.value = false;
            }
        };

        onMounted(fetchCards);
        watch(() => store.selectedGameId, () => { deck.value = []; fetchCards(); });

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

        const onDeckGenerated = (generatedDeck) => {
            deck.value = generatedDeck;
        };

        // Compare two card values for a single sort rule, including raw_data dot-path traversal
        const compareByRule = (a, b, rule) => {
            const dir = rule.direction === 'desc' ? -1 : 1;

            let va, vb;
            if (rule.field === '__raw_path__') {
                // Traverse raw_data using the dot-path stored on the sort rule
                va = getValueAtPath(a.raw_data, rule.rawPath);
                vb = getValueAtPath(b.raw_data, rule.rawPath);
            } else {
                va = a[rule.field];
                vb = b[rule.field];
            }

            // Special handling: rarity sorts by numeric weight, not alphabetically
            if (rule.field === 'rarity') {
                return dir * ((rarityOrder[va] || 0) - (rarityOrder[vb] || 0));
            }
            // Numeric values sort numerically
            if (typeof va === 'number' && typeof vb === 'number') {
                return dir * (va - vb);
            }
            // Array fields: join to a string for comparison
            const sa = Array.isArray(va) ? va.join(',') : String(va ?? '');
            const sb = Array.isArray(vb) ? vb.join(',') : String(vb ?? '');
            return dir * sa.localeCompare(sb);
        };

        // Master computed: text search → ComplexFilter → cascading multi-sort
        const filteredCards = computed(() => {
            let list = cards.value;

            // 1. Text search
            if (searchQuery.value) {
                const q = searchQuery.value.toLowerCase();
                list = list.filter(c => c.name.toLowerCase().includes(q));
            }

            // 2. ComplexFilter tree evaluation
            if (activeFilterQuery.value && activeFilterCount.value > 0) {
                list = list.filter(c => matchesNode(c, activeFilterQuery.value));
            }

            // 3. Multi-level cascading sort — chain all rules as tiebreakers
            if (activeSortRules.value.length > 0) {
                list = [...list].sort((a, b) => {
                    for (const rule of activeSortRules.value) {
                        const result = compareByRule(a, b, rule);
                        if (result !== 0) return result; // Only move to next tiebreaker if tied
                    }
                    return 0;
                });
            }

            return list;
        });

        const onQueryUpdated = (query) => { activeFilterQuery.value = query; };
        const resetFilter = () => { activeFilterQuery.value = null; };
        const onSortUpdated = (rules) => { activeSortRules.value = rules; };

        // Deck actions
        const isInDeck = (card) => deck.value.some(c => c.id === card.id);

        const addToDeck = (card) => {
            if (!currentGame.value) return;

            // 1. Basic Deck Limit checks
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

            // 2. Dynamic Rules check (from game schema)
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
            cards, isLoading, searchQuery, filteredCards,
            showSortTray, showFilterTray, showOwnedOnly, filterSchema,
            activeFilterCount, activeSortCount, onQueryUpdated, resetFilter, onSortUpdated,
            deck, isInDeck, addToDeck, removeFromDeck, removeOneFromDeck, clearDeck,
            groupedDeck,
            showGeneratorModal,
            onDeckGenerated
        };
    }
}
