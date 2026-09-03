import { store } from '../store.js';

export default {
    template: `
        <div class="user-auth">
            <button class="btn btn-outline" v-if="!store.user" @click="mockLogin">Sign In</button>
            
            <div v-else class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">{{ store.user.name }}</span>
                <button class="btn btn-sm btn-danger" @click="logout">Sign Out</button>
            </div>
        </div>
    `,
    setup() {
        const mockLogin = () => {
            // This is a temporary mock login until we plug in Google Auth
            store.user = { 
                name: 'Local Dev User', 
                email: 'dev@localhost',
                id: '12345'
            };
        };

        const logout = () => {
            store.user = null;
        };

        return { store, mockLogin, logout }
    }
}

