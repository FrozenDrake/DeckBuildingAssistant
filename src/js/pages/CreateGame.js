import { store } from '../store.js';

const { ref } = Vue;


export default {
    name: 'create-game',
    template: `
        <div class="deck-builder-page" style="align-items: center; justify-content: center; padding-top: 50px;">
            <div style="background: var(--surface-color); padding: 30px; border-radius: 8px; width: 100%; max-width: 500px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h2 style="margin-top: 0;">Create a New Game</h2>
                <p class="help-text" style="margin-bottom: 20px;">
                    Start a new card database. As the creator, you will automatically be granted Admin rights to define the schema, upload data, and moderate art submissions.
                </p>
                
                <form @submit.prevent="createGame">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">Game Name</label>
                        <input type="text" v-model="name" class="filter-input" placeholder="e.g. Magic: The Gathering" required style="width: 100%; box-sizing: border-box;" />
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">Description</label>
                        <textarea v-model="description" class="filter-input" placeholder="Brief description of the game..." style="width: 100%; box-sizing: border-box; height: 100px; resize: vertical;"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width: 100%;" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Creating...' : 'Create Game' }}
                    </button>
                </form>
            </div>
        </div>
    `,
    setup() {
        
        const name = ref('');
        const description = ref('');
        const isSubmitting = ref(false);

        const createGame = async () => {
            if (isSubmitting.value) return;
            isSubmitting.value = true;
            try {
                const res = await fetch('api/create_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.value, description: description.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Game created successfully!", "success");
                
                // Refresh games list in store and user profile
                await store.fetchGames();
                await store.checkAuth();
                
                // Select the new game
                store.selectedGameId = data.game_id;
                
                // Redirect to admin dashboard
                store.currentView = 'admin';
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                isSubmitting.value = false;
            }
        };

        return { store, name, description, isSubmitting, createGame };
    }
}
