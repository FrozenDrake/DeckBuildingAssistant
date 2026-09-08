import { store } from '../store.js';
const { ref } = Vue;

export default {
    template: `
        <div class="user-auth">
            <button class="btn btn-outline" v-if="!store.user" @click="showModal = true">Sign In</button>
            
            <div v-else class="user-profile" style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: bold;">{{ store.user.name }}</span>
                <button class="btn btn-sm btn-danger" @click="logout">Sign Out</button>
            </div>

            <!-- Login / Register Modal -->
            <div class="modal-backdrop" v-if="showModal" @click.self="showModal = false">
                <div class="modal-content user-auth-modal" style="max-width: 400px;">
                    <h2>{{ isRegistering ? 'Create Account' : 'Sign In' }}</h2>
                    <form @submit.prevent="submitForm">
                        <div v-if="isRegistering" style="margin-bottom: 15px;">
                            <label style="display:block; margin-bottom: 5px;">Display Name</label>
                            <input type="text" v-model="form.name" class="filter-input" required />
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display:block; margin-bottom: 5px;">Email</label>
                            <input type="email" v-model="form.email" class="filter-input" required />
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display:block; margin-bottom: 5px;">Password</label>
                            <input type="password" v-model="form.password" class="filter-input" required />
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <a href="#" @click.prevent="isRegistering = !isRegistering" style="color: var(--primary-color); font-size: 0.9em;">
                                {{ isRegistering ? 'Already have an account?' : 'Need an account?' }}
                            </a>
                            <button type="submit" class="btn btn-primary" :disabled="loading">
                                {{ loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Sign In') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    setup() {
        const showModal = ref(false);
        const isRegistering = ref(false);
        const loading = ref(false);
        
        const form = ref({
            name: '',
            email: '',
            password: ''
        });

        const submitForm = async () => {
            loading.value = true;
            const endpoint = isRegistering.value ? 'api/register.php' : 'api/login.php';
            
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form.value)
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Authentication failed');
                
                store.user = data.user;
                store.addToast(`Welcome, ${data.user.name}!`, 'success');
                showModal.value = false;
                
                // Clear form
                form.value = { name: '', email: '', password: '' };
            } catch (err) {
                store.addToast(err.message, 'error');
            } finally {
                loading.value = false;
            }
        };

        const logout = async () => {
            try {
                await fetch('api/logout.php', { method: 'POST' });
                store.user = null;
                store.currentView = 'dashboard';
                store.addToast('You have been signed out.', 'info');
            } catch (err) {
                console.error(err);
            }
        };

        return { store, showModal, isRegistering, loading, form, submitForm, logout }
    }
}
