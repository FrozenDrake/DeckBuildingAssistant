const { reactive } = Vue;

export const store = reactive({
    games: [],
    selectedGameId: null,
    currentView: 'dashboard', // dashboard, deck-builder, rules-editor, etc.
    isLoadingGames: false,
    user: null, // Holds the authenticated user data

    async fetchGames() {
        if (this.games.length === 0 && !this.isLoadingGames) {
            this.isLoadingGames = true;
            try {
                const response = await fetch('api/get_games.php');
                const data = await response.json();
                this.games = data;
            } catch (err) {
                console.error("Failed to fetch games:", err);
            } finally {
                this.isLoadingGames = false;
            }
        }
    },

    selectGame(id) {
        this.selectedGameId = this.selectedGameId === id ? null : id;
        this.currentView = 'dashboard';
    },

    toasts: [],
    toastIdCounter: 0,
    
    addToast(message, type = 'info', duration = 4000) {
        const id = this.toastIdCounter++;
        this.toasts.push({ id, message, type });
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(id);
            }, duration);
        }
    },
    
    removeToast(id) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }
});

