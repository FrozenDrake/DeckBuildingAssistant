/**
 * BrowseDecks.js
 *
 * Two-panel page for browsing community decks for the currently selected game.
 * Left panel: searchable, paginated list of decks with name, creator, and date.
 * Right panel: full deck detail view for the selected deck, with an Export button
 *              placeholder (functionality to be implemented in a later phase).
 *
 * Uses the ComplexFilter and MultiSort components for advanced deck discovery.
 */
import { store } from '../store.js';

const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;

export default {
    name: 'browse-decks',
    template: `
        <div class="deck-builder-page">

            <!-- Page Header with search and filter controls -->
            <div class="deck-subheader">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="subheader-left">
                        <h2>Browse Decks</h2>
                        <span class="total-count" v-if="totalDecks > 0">{{ totalDecks }} decks found</span>
                    </div>
                    <div class="subheader-controls">
                        <input
                            type="text"
                            v-model="searchQuery"
                            placeholder="Search by deck name..."
                            class="filter-input"
                            style="min-width: 220px;"
                        />
                        <button class="btn btn-outline btn-sm" @click="showFilterTray = !showFilterTray" :class="{ active: showFilterTray }">
                            Filters{{ activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '' }}
                        </button>
                        <button class="btn btn-outline btn-sm" @click="showSortTray = !showSortTray" :class="{ active: showSortTray }">
                            Sort{{ activeSortCount > 0 ? ' (' + activeSortCount + ')' : '' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Filter / Sort Trays -->
            <transition name="filter-tray">
                <div v-if="showSortTray" class="filter-tray">
                    <multi-sort :schema="filterSchema" @sort-updated="onSortUpdated"></multi-sort>
                </div>
            </transition>
            <transition name="filter-tray">
                <div v-if="showFilterTray" class="filter-tray">
                    <complex-filter :schema="filterSchema" @query-updated="onQueryUpdated"></complex-filter>
                    <div class="filter-tray-footer">
                        <button class="btn btn-sm btn-outline" @click="resetFilter">Clear Filters</button>
                    </div>
                </div>
            </transition>

            <!-- Main two-panel layout -->
            <div class="deck-builder-content">

                <!-- Left Panel: Deck List -->
                <div class="card-collection-panel">
                    <div v-if="isLoading && decks.length === 0" class="loading-state">
                        Loading decks...
                    </div>
                    <div v-else-if="decks.length === 0" class="loading-state">
                        No decks found for this game yet.
                    </div>
                    <div v-else class="deck-list-panel">
                        <div
                            v-for="deck in decks"
                            :key="deck.id"
                            class="browse-deck-card"
                            :class="{ 'browse-deck-card--selected': selectedDeck && selectedDeck.id === deck.id }"
                            @click="selectDeck(deck)"
                        >
                            <div class="browse-deck-name">{{ deck.name }}</div>
                            <div class="browse-deck-meta">
                                <span>by {{ deck.created_by_username || 'Unknown' }}</span>
                                <span>{{ formatDate(deck.created_at) }}</span>
                            </div>
                            <div class="browse-deck-count">{{ (deck.cards || []).length }} cards</div>
                        </div>
                    </div>

                    <!-- Scroll trigger for pagination -->
                    <div ref="scrollTrigger" style="height: 40px; display: flex; align-items: center; justify-content: center; opacity: 0.5; font-size: 0.85em;">
                        <span v-if="isLoading && decks.length > 0">Loading more...</span>
                        <span v-else-if="allLoaded && decks.length > 0">Showing {{ decks.length }} of {{ totalDecks }}</span>
                    </div>
                </div>

                <!-- Right Panel: Deck Detail View -->
                <div class="active-deck-panel">
                    <div v-if="!selectedDeck" class="loading-state" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                        <p style="opacity: 0.5;">Select a deck from the list to view its contents.</p>
                    </div>
                    <div v-else style="height: 100%; display: flex; flex-direction: column;">
                        <div class="deck-header">
                            <div>
                                <h3 style="margin: 0 0 4px 0;">{{ selectedDeck.name }}</h3>
                                <p style="margin: 0; font-size: 0.85em; opacity: 0.6;">
                                    by {{ selectedDeck.created_by_username || 'Unknown' }} &mdash; {{ formatDate(selectedDeck.created_at) }}
                                </p>
                                <p v-if="selectedDeck.description" style="margin: 8px 0 0; font-size: 0.9em; font-style: italic; opacity: 0.75;">
                                    {{ selectedDeck.description }}
                                </p>
                            </div>
                            <button class="btn btn-outline btn-sm" @click="exportDeck" title="Export functionality coming in a future update">
                                Export
                            </button>
                        </div>

                        <!-- Grouped card list -->
                        <div style="flex: 1; overflow-y: auto; padding: 10px;">
                            <div v-if="!selectedDeck.cards || selectedDeck.cards.length === 0" style="opacity: 0.5; text-align: center; padding: 40px;">
                                This deck contains no cards.
                            </div>
                            <div v-else>
                                <div class="deck-list-item" v-for="(group, type) in groupedSelectedDeck" :key="type">
                                    <h4>{{ type }} <span class="group-count">({{ group.count }})</span></h4>
                                    <div class="deck-list-card" v-for="item in group.cards" :key="item.card.id || item.card.name">
                                        <span class="deck-list-name">{{ item.card.name }}</span>
                                        <span class="deck-list-qty">x{{ item.qty }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `,
    setup() {
        const currentGame = computed(() => store.games.find(g => g.id === store.selectedGameId) || null);

        // --- Filter / Sort state ---
        const showFilterTray = ref(false);
        const showSortTray   = ref(false);
        const searchQuery    = ref('');
        const activeFilterQuery = ref(null);
        const activeSortRules   = ref([]);

        // Build filter schema combining deck-level and card-level fields.
        // Keys prefixed with 'card.' signal to the backend to use $elemMatch on the cards array.
        const filterSchema = computed(() => {
            const cardFields = (currentGame.value?.card_schema || [])
                .filter(f => f.key !== 'image_url')
                .map(f => ({
                    key:     'card.' + f.key,
                    label:   'Card: ' + f.label,
                    type:    f.type === 'string' ? 'text' : f.type,
                    options: f.options || [],
                }));

            return {
                fields: [
                    { key: 'name',                label: 'Deck Name', type: 'text' },
                    { key: 'created_by_username', label: 'Creator',   type: 'text' },
                    ...cardFields,
                ],
                operators: {
                    text:   ['contains', 'does not contain', 'equals'],
                    select: ['equals', 'does not equal', 'contains', 'does not contain'],
                    number: ['equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal'],
                },
            };
        });

        const activeFilterCount = computed(() => {
            if (!activeFilterQuery.value) return 0;
            const countNodes = (node) => {
                if (!node) return 0;
                if (node.type === 'rule') return 1;
                return (node.children || []).reduce((acc, c) => acc + countNodes(c), 0);
            };
            return countNodes(activeFilterQuery.value);
        });
        const activeSortCount = computed(() => activeSortRules.value.length);

        let filterTimer = null;
        const onQueryUpdated = (q) => {
            activeFilterQuery.value = q;
            clearTimeout(filterTimer);
            filterTimer = setTimeout(() => { resetPagination(); fetchDecks(); }, 400);
        };
        const onSortUpdated = (s) => {
            activeSortRules.value = s;
            clearTimeout(filterTimer);
            filterTimer = setTimeout(() => { resetPagination(); fetchDecks(); }, 400);
        };
        const resetFilter = () => {
            activeFilterQuery.value = null;
            clearTimeout(filterTimer);
            resetPagination();
            fetchDecks();
        };

        // --- Deck list state ---
        const decks       = ref([]);
        const totalDecks  = ref(0);
        const isLoading   = ref(false);
        const allLoaded   = ref(false);
        const skip        = ref(0);
        const limit       = 20;
        const scrollTrigger = ref(null);
        let observer = null;

        const resetPagination = () => {
            skip.value = 0;
            decks.value = [];
            allLoaded.value = false;
        };

        const fetchDecks = async (isLoadMore = false) => {
            if (!currentGame.value) return;
            if (isLoading.value) return;

            isLoading.value = true;
            try {
                const payload = {
                    game_id: currentGame.value.id,
                    skip:    skip.value,
                    limit,
                    search:  searchQuery.value,
                    filters: activeFilterQuery.value,
                    sorts:   activeSortRules.value,
                };

                const res  = await fetch('api/search_decks.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                totalDecks.value = data.total;

                if (isLoadMore) {
                    decks.value.push(...data.decks);
                } else {
                    decks.value = data.decks;
                }

                skip.value += data.decks.length;
                allLoaded.value = decks.value.length >= data.total;
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };

        // Debounce search input
        let searchTimer = null;
        watch(searchQuery, () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                resetPagination();
                fetchDecks();
            }, 300);
        });

        onMounted(() => {
            fetchDecks();

            observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading.value && !allLoaded.value) {
                    fetchDecks(true);
                }
            }, { threshold: 0.1 });

            if (scrollTrigger.value) observer.observe(scrollTrigger.value);
        });

        onBeforeUnmount(() => {
            if (observer) observer.disconnect();
        });

        // --- Selected deck state ---
        const selectedDeck = ref(null);

        const selectDeck = (deck) => {
            selectedDeck.value = deck;
        };

        // Group cards the same way DeckBuilder does: by type, accumulating qty
        const groupedSelectedDeck = computed(() => {
            if (!selectedDeck.value || !selectedDeck.value.cards) return {};
            const groups = {};
            for (const card of selectedDeck.value.cards) {
                const type = card.type || 'Unknown';
                if (!groups[type]) groups[type] = { count: 0, cards: [] };
                const existing = groups[type].cards.find(i => (i.card.id || i.card.name) === (card.id || card.name));
                if (existing) {
                    existing.qty++;
                } else {
                    groups[type].cards.push({ card, qty: 1 });
                }
                groups[type].count++;
            }
            return groups;
        });

        // Placeholder export handler
        const exportDeck = () => {
            store.addToast('Export functionality will be available in a future update.', 'info');
        };

        // Format ISO timestamp or Unix int to a readable date string
        const formatDate = (raw) => {
            if (!raw) return 'Unknown date';
            const d = new Date(typeof raw === 'number' ? raw * 1000 : raw);
            return isNaN(d) ? raw : d.toLocaleDateString();
        };

        return {
            currentGame,
            showFilterTray, showSortTray,
            searchQuery, filterSchema,
            activeFilterCount, activeSortCount,
            onQueryUpdated, onSortUpdated, resetFilter,
            decks, totalDecks, isLoading, allLoaded, scrollTrigger,
            selectedDeck, selectDeck, groupedSelectedDeck,
            exportDeck, formatDate,
        };
    }
}

