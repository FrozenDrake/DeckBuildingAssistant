import { store } from '../store.js';

export default {
    name: 'toast-notifications',
    template: `
        <div class="toast-container">
            <transition-group name="toast-anim">
                <div v-for="toast in store.toasts" :key="toast.id" class="toast" :class="'toast-' + toast.type">
                    <span class="toast-message">{{ toast.message }}</span>
                    <button class="toast-close" @click="store.removeToast(toast.id)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </transition-group>
        </div>
    `,
    setup() {
        return { store };
    }
}
