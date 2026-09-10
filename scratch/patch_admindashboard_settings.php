<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

// 1. Add html for General Settings
$html = <<<HTML
                    <div v-if="activeTab === 'settings'" style="background: var(--surface-color); padding: 20px; border-radius: 8px; border: 1px solid var(--primary-color);">
                        
                        <h3 style="margin-top: 0;">General Settings</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Game Name</label>
                                <input type="text" v-model="generalSettings.name" class="filter-input" style="width: 100%;" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Cover Color</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="color" v-model="generalSettings.cover_color" style="width: 50px; height: 38px; padding: 0; border: none; cursor: pointer;" />
                                    <input type="text" v-model="generalSettings.cover_color" class="filter-input" style="flex: 1;" placeholder="#HEX" />
                                </div>
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Description</label>
                                <textarea v-model="generalSettings.description" class="filter-input" style="width: 100%; height: 80px;"></textarea>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Deck Size</label>
                                <input type="number" v-model.number="generalSettings.max_deck_size" class="filter-input" style="width: 100%;" />
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Max Copies Per Card</label>
                                <input type="number" v-model.number="generalSettings.max_copies_per_card" class="filter-input" style="width: 100%;" />
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" @click="saveGeneralSettings" :disabled="savingGeneralSettings">Save General Settings</button>
                        
                        <hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 30px 0;" />
                        
                        <h3 style="margin-top: 0;">Visibility</h3>
HTML;

$content = preg_replace('/                    <div v-if="activeTab === \'settings\'"[\s\S]*?<h3 style="margin-top: 0;">Game Visibility & Settings<\/h3>/', $html, $content);


// 2. Add vars in setup
$vars = <<<JS
        const isPublic = ref(false);
        const savingVisibility = ref(false);
        const generalSettings = ref({
            name: '',
            description: '',
            cover_color: '',
            max_deck_size: 60,
            max_copies_per_card: 4
        });
        const savingGeneralSettings = ref(false);
JS;

$content = preg_replace('/        const isPublic = ref\(false\);\s*const savingVisibility = ref\(false\);/', $vars, $content);

// 3. Populate inside watch
$watch = <<<JS
        watch(selectedGame, (game) => {
            if (game) {
                rulesJson.value = JSON.stringify(game.deck_rules || [], null, 2);
                schemaJson.value = JSON.stringify(game.card_schema || {}, null, 2);
                hasSchema.value = !!game.card_schema && Object.keys(game.card_schema).length > 0;
                currentSchema.value = game.card_schema || {};
                isPublic.value = game.is_public || false;
                
                generalSettings.value = {
                    name: game.name || '',
                    description: game.description || '',
                    cover_color: game.cover_color || '',
                    max_deck_size: game.max_deck_size || 60,
                    max_copies_per_card: game.max_copies_per_card || 4
                };
                
                if (game.import_adapter && game.import_adapter.trim() !== '') {
JS;
$content = preg_replace('/        watch\(selectedGame, \(game\) => \{[\s\S]*?if \(game\.import_adapter && game\.import_adapter\.trim\(\) !== \'\'\) \{/', $watch, $content);

// 4. Save function
$save = <<<JS
        const saveGeneralSettings = async () => {
            savingGeneralSettings.value = true;
            try {
                const res = await fetch('api/admin_update_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        game_id: selectedGameId.value,
                        ...generalSettings.value
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast("General settings saved successfully", "success");
                store.fetchGames();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                savingGeneralSettings.value = false;
            }
        };

        const saveVisibility = async () => {
JS;
$content = str_replace('        const saveVisibility = async () => {', $save, $content);

// 5. Export
$content = str_replace(
    'isPublic, savingVisibility, saveVisibility, newAdminUsername,',
    'isPublic, savingVisibility, saveVisibility, generalSettings, savingGeneralSettings, saveGeneralSettings, newAdminUsername,',
    $content
);

file_put_contents($file, $content);
