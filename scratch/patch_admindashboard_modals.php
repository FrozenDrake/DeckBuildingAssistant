<?php
$file = 'src/js/pages/AdminDashboard.js';
$content = file_get_contents($file);

// 1. Add Modals to the end of the template (before the last closing div)
$modals = <<<HTML
            <!-- Custom Modals -->
            <!-- Delete Card Modal -->
            <div v-if="cardToDelete" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); width: 400px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Confirm Deletion</h3>
                    <p>Are you sure you want to delete this card?</p>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="cardToDelete = null">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeDeleteConfirmed">Delete</button>
                    </div>
                </div>
            </div>

            <!-- Revoke Admin Modal -->
            <div v-if="adminToRevoke" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); width: 400px; max-width: 90vw;">
                    <h3 style="margin-top: 0;">Revoke Admin Rights</h3>
                    <p>Are you sure you want to revoke admin rights for <strong>{{ adminToRevoke }}</strong>?</p>
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="adminToRevoke = null">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeRevokeConfirmed">Revoke</button>
                    </div>
                </div>
            </div>

            <!-- Delete Game Modal -->
            <div v-if="showDeleteGameModal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: var(--bg-color); padding: 25px; border-radius: 8px; border: 1px solid red; width: 450px; max-width: 90vw; box-shadow: 0 10px 30px rgba(255,0,0,0.2);">
                    <h3 style="margin-top: 0; color: red;">Delete Game</h3>
                    <p><strong>WARNING:</strong> This will permanently delete the entire game, including ALL cards, user decks, and collections for this game. This action cannot be undone.</p>
                    <p style="margin-bottom: 5px;">To confirm deletion, type the name of the game exactly:<br><strong>"{{ selectedGame.name }}"</strong></p>
                    <input type="text" v-model="deleteGameConfirmText" class="filter-input" style="width: 100%; box-sizing: border-box; margin-bottom: 20px;" placeholder="Type game name here..." />
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" style="flex: 1;" @click="showDeleteGameModal = false; deleteGameConfirmText = ''">Cancel</button>
                        <button class="btn btn-primary" style="flex: 1; background: red; border-color: red;" @click="executeDeleteGameConfirmed" :disabled="deleteGameConfirmText !== selectedGame.name">Delete Game</button>
                    </div>
                </div>
            </div>
        </div>
    `,
HTML;

$content = preg_replace('/        <\/div>\n    `,\n    setup\(\) \{/', $modals . "\n    setup() {", $content);

// 2. Add ref variables in setup
$refsCode = <<<JS
        const cardToDelete = ref(null);
        const adminToRevoke = ref(null);
        const showDeleteGameModal = ref(false);
        const deleteGameConfirmText = ref('');
JS;
$content = str_replace("const loadingAdmins = ref(false);", "const loadingAdmins = ref(false);\n" . $refsCode, $content);

// 3. Replace executeDelete
$deleteCardCode = <<<JS
        const executeDelete = async () => {
            if (!selectedCardId.value) return;
            cardToDelete.value = selectedCardId.value;
        };

        const executeDeleteConfirmed = async () => {
            if (!cardToDelete.value) return;
            saving.value = true;
            try {
                const res = await fetch('api/admin_delete_card.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, card_id: cardToDelete.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Card deleted.", "success");
                cardToDelete.value = null;
                resetCardForm();
                await fetchCards();
            } catch (err) {
                store.addToast(err.message, "error");
            } finally {
                saving.value = false;
            }
        };
JS;
// We need to carefully replace executeDelete
$content = preg_replace('/        const executeDelete = async \(\) => \{[\s\S]*?saving\.value = false;\s*\}\s*\};\s*/', $deleteCardCode . "\n\n", $content);

// 4. Replace revokeAdmin
$revokeAdminCode = <<<JS
        const revokeAdmin = (username) => {
            adminToRevoke.value = username;
        };

        const executeRevokeConfirmed = async () => {
            if (!adminToRevoke.value) return;
            try {
                const res = await fetch('api/admin_manage_roles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value, username: adminToRevoke.value, action: 'revoke' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                store.addToast(\`Revoked admin from \${adminToRevoke.value}\`, "success");
                adminToRevoke.value = null;
                fetchAdmins();
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
JS;
$content = preg_replace('/        const revokeAdmin = async \(username\) => \{[\s\S]*?store\.addToast\(err\.message, "error"\);\s*\}\s*\};\s*/', $revokeAdminCode . "\n\n", $content);

// 5. Replace deleteGame
$deleteGameCode = <<<JS
        const deleteGame = () => {
            deleteGameConfirmText.value = '';
            showDeleteGameModal.value = true;
        };

        const executeDeleteGameConfirmed = async () => {
            if (deleteGameConfirmText.value !== selectedGame.value.name) return;
            try {
                const res = await fetch('api/admin_delete_game.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ game_id: selectedGameId.value })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                
                store.addToast("Game permanently deleted.", "success");
                showDeleteGameModal.value = false;
                store.selectedGameId = null;
                store.currentView = null; // Clear view so it drops to landing page
                await store.fetchGames(); // refresh sidebar list
            } catch (err) {
                store.addToast(err.message, "error");
            }
        };
JS;
$content = preg_replace('/        const deleteGame = async \(\) => \{[\s\S]*?store\.addToast\(err\.message, "error"\);\s*\}\s*\};\s*/', $deleteGameCode . "\n\n", $content);

// 6. Export new functions
$content = str_replace(
    "deleteCardFallback: executeDelete",
    "deleteCardFallback: executeDelete, cardToDelete, executeDeleteConfirmed",
    $content
);
$content = str_replace(
    "revokeAdmin, isCreator, deleteGame",
    "revokeAdmin, isCreator, deleteGame, adminToRevoke, executeRevokeConfirmed, showDeleteGameModal, deleteGameConfirmText, executeDeleteGameConfirmed",
    $content
);

file_put_contents($file, $content);
