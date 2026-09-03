import { store } from '../store.js';
const { ref, computed, onMounted } = Vue;

export default {
    template: `
        <div class="sidebar" @mouseenter="isSidebarOpen = true" @mouseleave="isSidebarOpen = false" :class="{ expanded: isSidebarOpen }">
            <div class="hamburger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </div>
            <div class="nav-content">
                <div class="sidebar-search" v-if="isSidebarOpen">
                    <input type="text" v-model="gameSearch" placeholder="Search games..." />
                </div>
                <div v-for="game in filteredGames" :key="game.id">
                    <div class="game-item" @click="store.selectGame(game.id)">
                        <span>{{ game.name }}</span>
                        <span v-if="store.selectedGameId === game.id">v</span>
                        <span v-else>></span>
                    </div>
                    <div class="game-options" v-if="store.selectedGameId === game.id">
                        <div>Deck Builder</div>
                        <div>Game Rules Editor</div>
                        <div>Browse User Decks</div>
                        <div>Manage Collection</div>
                    </div>
                </div>
                <div class="game-item" v-if="filteredGames.length === 0 && isSidebarOpen" style="justify-content: center; opacity: 0.7; cursor: default;">
                    No games found.
                </div>
            </div>
        </div>
    `,
    setup() {
        const isSidebarOpen = ref(false);
        const gameSearch = ref('');
        
        onMounted(() => {
            store.fetchGames();
        });

        const filteredGames = computed(() => {
            if (!gameSearch.value) return store.games;
            const query = gameSearch.value.toLowerCase();
            return store.games.filter(g => g.name.toLowerCase().includes(query));
        });

        return {
            isSidebarOpen,
            gameSearch,
            filteredGames,
            store
        }
    }
}

