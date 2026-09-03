import { store } from '../store.js';
const { onMounted } = Vue;

export default {
    template: `
        <div class="landing-page">
            <div class="hero-section">
                <h1>Deck Building Assistant</h1>
                <p>Welcome! Select a game below to access its specific tools, such as the Deck Builder, Rule Editor, and Collection Manager.</p>
            </div>
            
            <div class="game-grid">
                <div class="game-card" v-for="game in store.games" :key="game.id" @click="store.selectGame(game.id)">
                    <div class="game-cover" :style="{ backgroundColor: game.cover_color || 'var(--primary-color)' }"></div>
                    <div class="game-card-content">
                        <h3>{{ game.name }}</h3>
                        <p>{{ game.description }}</p>
                    </div>
                </div>
                
                <div class="game-card add-game" v-if="!store.isLoadingGames">
                    <div class="game-cover" style="background: transparent; border-bottom: 0; display: flex; align-items: center; justify-content: center; color: var(--primary-color); font-size: 3em;">
                        +
                    </div>
                    <div class="game-card-content" style="text-align: center; border-top: 1px dashed var(--primary-color);">
                        <h3>Add New Game</h3>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        onMounted(() => {
            store.fetchGames();
        });

        return { store }
    }
}

