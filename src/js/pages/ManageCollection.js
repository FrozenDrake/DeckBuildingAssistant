/**
 * ManageCollection.js
 *
 * Two-panel page for managing a user's card collection for the selected game.
 *
 * Left panel:  Browseable, searchable, paginated list of ALL cards in the game
 *              (reuses search_cards.php with infinite scroll). Clicking a card
 *              adds one copy to the user's collection.
 *
 * Right panel: The user's current collection, grouped by card type, showing
 *              quantity owned. Clicking a card removes one copy.
 *
 * Requires the user to be logged in — shows a prompt if not.
 * Saves immediately on every click via update_collection.php.
 */
import { store } from '../store.js';

const { ref, computed, watch, onMounted, onBeforeUnmount } = Vue;

export default {
    name: 'manage-collection',
    template: `
        <div class="deck-builder-page">

            <!-- Subheader -->
            <div class="deck-subheader">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="subheader-left">
                        <h2>My Collection</h2>
                        <span class="total-count" v-if="store.user">
                            {{ collectionTotalCount }} cards owned
                        </span>
                    </div>
                    <div class="subheader-controls" v-if="store.user">
                        <input type="text" v-model="searchQuery" class="filter-input"
                               placeholder="Search cards..." style="min-width: 200px;" />
                        <button class="btn btn-outline btn-sm"
                                @click="showSortTray = !showSortTray"
                                :class="{ active: showSortTray }">
                            Sort{{ activeSortCount > 0 ? ' (' + activeSortCount + ')' : '' }}
                        </button>
                        <button class="btn btn-outline btn-sm"
                                @click="showFilterTray = !showFilterTray"
                                :class="{ active: showFilterTray }">
                            Filters{{ activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : '' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Not logged in -->
            <div v-if="!store.user" class="loading-state" style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;">
                <p>You must be logged in to manage your collection.</p>
            </div>

            <template v-else>
                <!-- Sort / Filter Trays -->
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

                <!-- Two-panel content -->
                <div class="deck-builder-content">

                    <!-- Left panel: all cards in game -->
                    <div class="card-collection-panel">
                        <div v-if="isLoading && renderedCards.length === 0" class="loading-state">Loading cards...</div>
                        <div v-else-if="renderedCards.length === 0" class="loading-state">No cards match your filters.</div>
                        <div v-else class="card-list">
                            <div class="db-card" v-for="card in renderedCards" :key="card.id"
                                 @click="addToCollection(card)"
                                 :title="'Click to add one copy to your collection.'"
                                 :class="{ 'db-card-in-deck': isInCollection(card) }">
                                <div class="db-card-header">
                                    <span class="db-card-rarity" :class="card.rarity">{{ card.rarity }}</span>
                                    <span class="db-card-type">{{ card.type }}</span>
                                </div>
                                <div class="db-card-name">{{ card.name }}</div>
                                <div class="db-card-chars" v-if="collectionQty(card) > 0" style="opacity: 0.7; font-size: 0.8em;">
                                    Owned: {{ collectionQty(card) }}
                                </div>
                            </div>
                        </div>

                        <!-- Infinite scroll trigger -->
                        <div ref="scrollTrigger" style="height: 40px; display: flex; align-items: center; justify-content: center; opacity: 0.5; font-size: 0.85em;">
                            <span v-if="isLoading && renderedCards.length > 0">Loading more...</span>
                            <span v-else-if="allLoaded && renderedCards.length > 0">{{ renderedCards.length }} of {{ totalCards }} cards</span>
                        </div>
                    </div>

                    <!-- Right panel: user's collection -->
                    <div class="active-deck-panel">
                        <div class="deck-header">
                            <h3 style="margin: 0;">My Collection</h3>
                            <span style="font-size: 0.85em; opacity: 0.6;">Click a card to remove one copy</span>
                        </div>

                        <div style="flex: 1; overflow-y: auto; padding: 10px;">
                            <div v-if="collectionEntries.length === 0" style="text-align: center; padding: 40px; opacity: 0.5;">
                                Your collection is empty. Click cards on the left to add them.
                            </div>
                            <div v-else>
                                <div class="deck-list-item" v-for="(group, type) in groupedCollection" :key="type">
                                    <h4>{{ type }} <span class="group-count">({{ group.count }})</span></h4>
                                    <div class="deck-list-card"
                                         v-for="entry in group.entries" :key="entry.card_id"
                                         @click="removeFromCollection(entry)"
                                         :title="'Click to remove one copy of ' + entry.name">
                                        <span class="deck-list-name">{{ entry.name }}</span>
                                        <span class="deck-list-qty">x{{ entry.qty }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `,
    setup() {
        const currentGame = computed(() => store.games.find(g => g.id === store.selectedGameId) || null);

        // ---- Filter / Sort state ----
        const showSortTray      = ref(false);
        const showFilterTray    = ref(false);
        const searchQuery       = ref('');
        const activeFilterQuery = ref(null);
        const activeSortRules   = ref([]);

        const filterSchema = computed(() => {
            const fields = (currentGame.value?.card_schema || [])
                .filter(f => f.key !== 'image_url')
                .map(f => ({
                    key:     f.key,
                    label:   f.label,
                    type:    f.type === 'string' ? 'text' : f.type,
                    options: f.options || [],
                }));
            return {
                fields,
                operators: {
                    text:   ['contains', 'does not contain', 'equals'],
                    select: ['equals', 'does not equal'],
                    number: ['equals', 'does not equal', 'greater than', 'less than', 'greater than or equal', 'less than or equal'],
                },
            };
        });

        const activeFilterCount = computed(() => {
            const count = (node) => {
                if (!node) return 0;
                if (node.type === 'rule') return 1;
                return (node.children || []).reduce((a, c) => a + count(c), 0);
            };
            return count(activeFilterQuery.value);
        });
        const activeSortCount = computed(() => activeSortRules.value.length);

        let filterTimer = null;
        const onQueryUpdated = (q) => {
            activeFilterQuery.value = q;
            clearTimeout(filterTimer);
            filterTimer = setTimeout(() => { resetCardPagination(); fetchCards(); }, 400);
        };
        const onSortUpdated = (s) => {
            activeSortRules.value = s;
            clearTimeout(filterTimer);
            filterTimer = setTimeout(() => { resetCardPagination(); fetchCards(); }, 400);
        };
        const resetFilter = () => {
            activeFilterQuery.value = null;
            clearTimeout(filterTimer);
            resetCardPagination();
            fetchCards();
        };

        // ---- Left panel: card browser (reuses search_cards.php) ----
        const renderedCards = ref([]);
        const totalCards    = ref(0);
        const isLoading     = ref(false);
        const allLoaded     = ref(false);
        const skip          = ref(0);
        const limit         = 50;
        const scrollTrigger = ref(null);
        let observer = null;

        const resetCardPagination = () => {
            skip.value = 0;
            renderedCards.value = [];
            allLoaded.value = false;
        };

        const fetchCards = async (isLoadMore = false) => {
            if (!currentGame.value || isLoading.value) return;
            isLoading.value = true;
            try {
                const res = await fetch('api/search_cards.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id:  currentGame.value.id,
                        skip:     skip.value,
                        limit,
                        search:   searchQuery.value,
                        filters:  activeFilterQuery.value,
                        sorts:    activeSortRules.value,
                        include_raw: false,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                totalCards.value = data.total;
                if (isLoadMore) {
                    renderedCards.value.push(...data.cards);
                } else {
                    renderedCards.value = data.cards;
                }
                skip.value += data.cards.length;
                allLoaded.value = renderedCards.value.length >= data.total;
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                isLoading.value = false;
            }
        };

        let searchTimer = null;
        watch(searchQuery, () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => { resetCardPagination(); fetchCards(); }, 300);
        });

        onMounted(() => {
            if (store.user) {
                fetchCards();
                fetchCollection();
            }

            observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && !isLoading.value && !allLoaded.value) {
                    fetchCards(true);
                }
            }, { threshold: 0.1 });

            if (scrollTrigger.value) observer.observe(scrollTrigger.value);
        });

        onBeforeUnmount(() => {
            if (observer) observer.disconnect();
        });

        // ---- Right panel: user's collection ----
        const collectionEntries = ref([]);
        const isSaving          = ref(false);

        const fetchCollection = async () => {
            if (!currentGame.value || !store.user) return;
            try {
                const res = await fetch('api/get_collection.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: currentGame.value.id }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                collectionEntries.value = data.entries || [];
            } catch (err) {
                store.addToast(err.message, 'error');
            }
        };

        const updateCollection = async (card, delta) => {
            if (isSaving.value) return;
            isSaving.value = true;
            try {
                const res = await fetch('api/update_collection.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: currentGame.value.id,
                        card,
                        delta,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                // Replace local state with the authoritative server response
                collectionEntries.value = data.entries || [];
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                isSaving.value = false;
            }
        };

        const addToCollection    = (card) => updateCollection(card, 1);
        const removeFromCollection = (entry) => {
            // Build a minimal card object from the collection entry
            updateCollection({ id: entry.card_id, name: entry.name, rarity: entry.rarity, type: entry.type }, -1);
        };

        // Helpers for the left panel to show owned counts
        const isInCollection = (card) => collectionEntries.value.some(e => e.card_id === card.id);
        const collectionQty  = (card) => {
            const entry = collectionEntries.value.find(e => e.card_id === card.id);
            return entry ? entry.qty : 0;
        };

        // Total cards owned (sum of all qtys)
        const collectionTotalCount = computed(() =>
            collectionEntries.value.reduce((sum, e) => sum + (e.qty || 0), 0)
        );

        // Group right-panel collection by card type
        const groupedCollection = computed(() => {
            const groups = {};
            for (const entry of collectionEntries.value) {
                const type = entry.type || 'Unknown';
                if (!groups[type]) groups[type] = { count: 0, entries: [] };
                groups[type].entries.push(entry);
                groups[type].count += entry.qty || 0;
            }
            return groups;
        });

        return {
            store, currentGame,
            showSortTray, showFilterTray,
            searchQuery, filterSchema,
            activeFilterCount, activeSortCount,
            onQueryUpdated, onSortUpdated, resetFilter,
            renderedCards, totalCards, isLoading, allLoaded, scrollTrigger,
            collectionEntries, collectionTotalCount, groupedCollection,
            addToCollection, removeFromCollection,
            isInCollection, collectionQty,
        };
    }
}

