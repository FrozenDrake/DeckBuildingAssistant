import Sidebar from './components/Sidebar.js';
import ThemeSelector from './components/ThemeSelector.js';
import CustomDropdown from './components/CustomDropdown.js';
import ComplexFilterNode from './components/ComplexFilterNode.js';
import ComplexFilter from './components/ComplexFilter.js';
import MultiSort from './components/MultiSort.js';
import DeckGeneratorModal from './components/DeckGeneratorModal.js';
import LandingPage from './pages/LandingPage.js';
import GameDashboard from './pages/GameDashboard.js';
import DeckBuilder from './pages/DeckBuilder.js';
import UserAuth from './components/UserAuth.js';
import ToastNotifications from './components/ToastNotifications.js';
import { store } from './store.js';

const { createApp, ref } = Vue;

const app = createApp({
    setup() {
        return { store }
    }
});

// Register global components
app.component('sidebar', Sidebar);
app.component('theme-selector', ThemeSelector);
app.component('custom-dropdown', CustomDropdown);
app.component('complex-filter-node', ComplexFilterNode); // Required globally for recursion
app.component('complex-filter', ComplexFilter);
app.component('multi-sort', MultiSort);
app.component('deck-generator-modal', DeckGeneratorModal);
app.component('landing-page', LandingPage);
app.component('game-dashboard', GameDashboard);
app.component('deck-builder', DeckBuilder);
app.component('user-auth', UserAuth);
app.component('toast-notifications', ToastNotifications);

app.mount('#app');
