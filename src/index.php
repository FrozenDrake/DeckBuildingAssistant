<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deck Building Assistant</title>
    <!-- Vue 3 CDN -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- External CSS -->
    <link rel="stylesheet" href="css/main.css">
</head>
<body>
    <div id="app">
        <!-- Sidebar Component -->
        <sidebar></sidebar>

        <!-- Top Bar with User Auth and Theme Selector Component -->
        <div class="top-bar">
            <user-auth></user-auth>
            <theme-selector></theme-selector>
        </div>

        <!-- Main Workspace -->
        <div class="main-content">
            <template v-if="store.currentView === 'admin'">
                <admin-dashboard></admin-dashboard>
            </template>
            <template v-else-if="store.currentView === 'create-game'">
                <create-game></create-game>
            </template>
            <template v-else-if="!store.selectedGameId">
                <landing-page></landing-page>
            </template>
            <template v-else>
                <game-dashboard v-if="store.currentView === 'dashboard'"></game-dashboard>
                <deck-builder v-if="store.currentView === 'deck-builder'"></deck-builder>
                <browse-decks v-if="store.currentView === 'browse-decks'"></browse-decks>
                <manage-collection v-if="store.currentView === 'manage-collection'"></manage-collection>
            </template>
        </div>

        <toast-notifications></toast-notifications>
    </div>

    <!-- Main JS Application initialized as a module to support imports -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
