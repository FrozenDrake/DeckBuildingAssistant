import { store } from '../store.js';

export default {
    template: `
        <div class="game-dashboard">
            <div class="dashboard-header" :style="{ borderBottomColor: currentGame.cover_color || 'var(--primary-color)' }">
                <button class="btn btn-outline back-btn" @click="store.selectGame(null)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    Back to Games
                </button>
                <div>
                    <h1>{{ currentGame.name }}</h1>
                    <p>{{ currentGame.description }}</p>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Deck Builder -->
                <div class="dashboard-card card" @click="navigate('deck-builder')">
                    <div class="card-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                    </div>
                    <h3>Deck Builder</h3>
                    <p>Create, edit, and analyze your decks.</p>
                </div>

                <!-- Rules Editor -->
                <div class="dashboard-card card" @click="navigate('rules-editor')">
                    <div class="card-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                    </div>
                    <h3>Game Rules Editor</h3>
                    <p>Modify and define the deck building restrictions.</p>
                </div>

                <!-- Browse Decks -->
                <div class="dashboard-card card" @click="navigate('browse-decks')">
                    <div class="card-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        </svg>
                    </div>
                    <h3>Browse Decks</h3>
                    <p>View public decks and community creations.</p>
                </div>

                <!-- Manage Collection -->
                <div class="dashboard-card card" @click="navigate('manage-collection')">
                    <div class="card-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3>Manage Collection</h3>
                    <p>Track which cards you own and import collections.</p>
                </div>
            </div>
        </div>
    `,
    setup() {
        const { computed } = Vue;

        const currentGame = computed(() => {
            return store.games.find(g => g.id === store.selectedGameId) || {};
        });

        const navigate = (tool) => {
            store.currentView = tool;
        };

        return { store, currentGame, navigate }
    }
}

